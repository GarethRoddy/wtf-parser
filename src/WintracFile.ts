
import *  as moment from 'moment';
import * as Papa from 'papaparse';
import *  as  _ from 'lodash'; 

const sensorMap = require("./sensormap.json");

export class WintracFile 
{
    constructor(private fileBuffer: Uint8Array, private fileName) {
        console.log("Filebuffer length:", this.fileBuffer.length);
    }

    getDeviceTypeID() {
        return this.fileBuffer[723];
    }

    findOffsets(buf, ...bytes) {
        let ptrs = [];
        for(let i = 0; i < buf.length; i++) {
            if (_.isEqual(Array.from(buf.slice(i, i + bytes.length)), bytes)) {
                ptrs.push(i);
            }
        }
        return ptrs;
    }

    getFileSensorManifestOffset(buf) {
        return _.first(this.findOffsets(buf, 0xFF, 0x4B, 0x04, 0x02, 0x0B)) + 5;
    }

    readUIntLE(array: Uint8Array, offset: number, count: number) {
        return _.range(count).reduce((acc, n) => acc + (array[offset + n] << (8*n)), 0);
    }

    readIntLE(array: Uint8Array, offset: number, count: number) {
        const val = _.range(count).reduce((acc, n) => acc + ((array[offset + n] & ((n === (count -1)) ? 0x7F: 0xFF)) << (8*n)), 0);
	    return (array[offset + count - 1] & 0x80) ? val - (Math.pow(256, count))/2 : val;
    }

    findSensor(buffer, sensorOffset) {
        const typeKey = '0x' + this.getDeviceTypeID().toString(16).toUpperCase();
        const sensors = sensorMap[typeKey];
        if (!sensors) {
            return null;
        }
        const [ blockID, dataID ] = [ buffer[sensorOffset], buffer[sensorOffset + 1]];
        return sensors.find(s => (parseInt(s.BlockID, 16) === blockID) && (parseInt(s.DataID, 16) === dataID));
    }

    async getSensorList() {
        let fileSensorOffset = this.getFileSensorManifestOffset(this.fileBuffer);
        const sensorCount = this.readUIntLE(this.fileBuffer, fileSensorOffset, 2);
        fileSensorOffset += 2;
        // FIXME: This is a hack, we get this in some files, but not others.
        if (!this.findSensor(this.fileBuffer, fileSensorOffset)) {
            fileSensorOffset += 2;
        }
        return _.range(sensorCount).reduce((acc, n) => {
            const sensor = this.findSensor(this.fileBuffer, fileSensorOffset + 2*n);
            if (sensor) {
                acc.push({ ...sensor, Offset: 2*n });
            }
            return acc;
        }, []);
    }

    // Records begin with [0xFF, 0x46, 0x61] 
    getTemperatureRecords(buf, sensors) {
        const records = this.findOffsets(buf, 0xFF, 0x46, 0x61).map((ptr, i, array) => { 
            return (i < array.length) ? this.decodeRecord(buf.slice(ptr, array[i+1]), sensors): null;
        }).filter(_.isObject)
        console.log("getTemperatureRecords: Record count:", records.length);
        return records;
    }

    decodeRecord(buf, sensors) {
        let record = { Time: this.decodeTimestamp(buf, 3).format("YYYY-MM-DD HH:mm") };
        record = sensors.reduce((map, sensor, index) => { 
            map[sensor.Name] = _.round(this.decodeSensor(buf, 9 + sensor.Offset), 1);
            return map;
        }, record);
        return record;
    }

    // Timestamps are stored as the number of minutes since the unix epoch (1970-1-1) as a 32-bit unsigned value.
    decodeTimestamp(buf, offset) {
        const minutesSinceEpoch = this.readUIntLE(buf, offset, 4);
        return moment.utc(0).add(minutesSinceEpoch, 'minute');
    }

    // Most sensors are 16-bit signed integers
    decodeSensor(record, offset) {
        const rawValue = (offset > 0 && offset < record.length - 2) ? this.readIntLE(record, offset, 2): null;
        return (rawValue && rawValue !== 0x7FFF) ? rawValue / 32.0: null;
    }

    async getRecords() {
        const sensors = await this.getSensorList();
        return this.getTemperatureRecords(this.fileBuffer, sensors).filter(row => row.Time >= '2001-01-01');    
    }

    async toCsv() {
        const records = await this.getRecords();
        return Papa.unparse(records);
    }
}


module.exports = WintracFile;