
import * as Papa from 'papaparse';
import *  as  _ from 'lodash'; 

// Don't use in bifrost...
const { arrayToHex } = require("./utils")

const sensorMap = require("./wintrac-sensormap.json");

enum EventTypes {
    SensorChange = 0x45,
    SensorManifest = 0x73
}
export class WintracFile 
{
    constructor(private fileBuffer: number[], private fileName) {
    }

    getDeviceTypeID() {
        return this.fileBuffer[723];
    }

    arraySegmentEquals(arr, offset, bytes) {
        for(let i = 0; i < bytes.length; i++) {
            if (arr[i+offset] !== bytes[i]) {
                return false;
            }
        }
        return true;
    }

    // Records begin with [0x00, 0xff, 0x54]  or just 0xFF, 0x54?
    getEventRecords() {
        let records = this.findOffsets(this.fileBuffer, 0x00, 0xff, 0x54);
        return records.map((ptr, i, array) => { 
            return (i < array.length) ? this.decodeEventRecord(this.fileBuffer, ptr): null;
        }).filter(_.isObject);
    }

    decodeEventRecord(buf, offset) {
        const eventType = buf[offset + 7];
        const record = { Time: this.decodeTimestamp(buf, offset + 3), Location: offset, Raw: arrayToHex(buf, offset, 48), Type: eventType, Sensors: [], SensorChanges: null };
        if (eventType === EventTypes.SensorManifest) {
            let sensorCount = this.readUIntLE(buf, offset + 10, 2)
            record.Sensors = _.range(sensorCount).reduce((acc, sensor, index) => { 
                const mappedSensor = this.findSensor(buf, offset + 16 + index*4)
                if (mappedSensor) {
                    acc.push({ ...mappedSensor, Offset: index * 2 })
                }
                return acc;
            }, [])
        } else if (eventType === EventTypes.SensorChange) {
            const mappedSensor = this.findSensor(buf, offset + 10);// sensorLookup.find(s => (s.BlockID === buf[offset + 10]) && (s.DataID === buf[offset + 11]));
            if (mappedSensor) {
                record.SensorChanges = { [mappedSensor.Name] : this.decodeSensor(buf, offset + 12)};
            }
        }
        return record;
    }

    findOffsets(buf, ...bytes) {
        let ptrs = [];
        for(let i = 0; i < buf.length; i++) {
            if (this.arraySegmentEquals(buf, i, bytes)) {
                ptrs.push(i);
            }
        }
        return ptrs;
    }

    findFirstOffset(buf, ...bytes) {
        for(let i = 0; i < buf.length; i++) {
            if (this.arraySegmentEquals(buf, i, bytes)) {
                return i;
            }
        }
        return null;
    }

    getFileSensorManifestOffset(buf) {
        let offset = this.findFirstOffset(buf, 0xFF, 0x4B, 0x04, 0x02, 0x0B);
        if (offset) {
            offset += 5;
        }
        return offset;
    }

    readUIntLE(array: number[], offset: number, count: number) {
        return _.range(count).reduce((acc, n) => acc + (array[offset + n] << (8*n)), 0);
    }

    readIntLE(array: number[], offset: number, count: number) {
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
        return sensors.find(s => s.BlockID === blockID && s.DataID === dataID);    
    }

    /* This function has probably become redundant. */
    getSensorList() {
        let fileSensorOffset = this.getFileSensorManifestOffset(this.fileBuffer);
        
        const sensorCount = this.readUIntLE(this.fileBuffer, fileSensorOffset, 2);
        fileSensorOffset += 2;
        console.log("getSensorList: Raw sensors:", arrayToHex(this.fileBuffer, fileSensorOffset, sensorCount*2));
        // FIXME: This is a hack, we get this in some files, but not others.
        if (!this.findSensor(this.fileBuffer, fileSensorOffset)) {
            fileSensorOffset += 2;
        }
        return _.range(sensorCount).reduce((acc, n) => {
            const sensor = this.findSensor(this.fileBuffer, fileSensorOffset + 2*n);
            if (sensor && sensor.Name.includes("Logger")) {
                acc.push({ ...sensor, Offset: 2*n });
            }
            return acc;
        }, []);   
    }

    // Records begin with [0xFF, 0x46, 0x61] 
    getTemperatureRecords(buf, sensors) {
        let records = this.findOffsets(buf, 0xFF, 0x46, 0x61);
        return records.map((ptr, i, array) => { 
            return (i < array.length) ? this.decodeRecord(buf, ptr, sensors, array[i+1] - ptr): null;
        }).filter(_.isObject);
    }

    decodeRecord(buf, offset, sensors, length, sensorTemplate = {}) {
        let record = { Time: this.decodeTimestamp(buf, offset + 3), /*location: offset, raw: arrayToHex(buf, offset, 40),*/...sensorTemplate };
        return sensors.reduce((map, sensor) => { 
            map[sensor.Name] = this.decodeSensor(buf, 9 + offset + sensor.Offset);
            return map;
        }, record);
    }

    // Timestamps are stored as the number of minutes since the unix epoch (1970-1-1) as a 32-bit unsigned value.
    decodeTimestamp(buf, offset) {
        const minutesSinceEpoch = this.readUIntLE(buf, offset, 4);
        return new Date(minutesSinceEpoch * 60 * 1000);
    }

    // Most sensors are 16-bit signed integers
    decodeSensor(record, offset) {
        const rawValue = this.readIntLE(record, offset, 2);
        return (_.isFinite(rawValue) && rawValue !== 0x7FFF && rawValue !== 0x13FF) ? _.round(rawValue / 32.0, 1): null;
    }
    /**
     * @deprecated
    */ 
    getRecordsDeprecated() {
        const sensors = this.getSensorList();
        const records = this.getTemperatureRecords(this.fileBuffer, sensors).filter(record => this.defaultRecordFilter(record));
        return records;
    }

    get recordPrefixes() {
        return { 
            event: [0x00, 0xff, 0x54],
            temperature: [0xff, 0x46, 0x61],
        };
    }

    getRecords() {
        let events = [];
        let temperatures = [];
        let sensors = [];
        let sensorTemplate = {};
        for(let ptr = 0; ptr < this.fileBuffer.length; ptr ++) {
            if (this.arraySegmentEquals(this.fileBuffer, ptr, this.recordPrefixes.event)) {
                let ev = this.decodeEventRecord(this.fileBuffer, ptr);
                if (ev.Type === EventTypes.SensorManifest) sensors = ev.Sensors; // Could just if (ev.sensors.length)
                if (ev.Type === EventTypes.SensorChange && (ev.SensorChanges) )  {
                    sensorTemplate = { ...sensorTemplate, ...ev.SensorChanges };
                }
                events.push(ev);
            } else if (this.arraySegmentEquals(this.fileBuffer, ptr, this.recordPrefixes.temperature)) { 
                temperatures.push(this.decodeRecord(this.fileBuffer, ptr, sensors, 100, sensorTemplate));
            }
        }
        return _.orderBy(temperatures.filter(record => this.defaultRecordFilter(record)), t => t.Time.getTime());
    }

    toCsv() {
        const records = this.getRecords();
        return Papa.unparse(records);
    }

    defaultRecordFilter(record) {
        if (!record.Time || record.Time.getTime() < 978307200000 /* 2000-01-01 */) { 
            return false;
        }
        // We see some records like: 2008-10-10T00:45:00.000Z,1.7,0,0,0,0,0. These are not valid.
        const values = Object.values(record);
        if (values.filter(r => r).length <= 2) { 
            return false;
        }
        return true;
    }
}

// Do we need this?
module.exports = WintracFile;