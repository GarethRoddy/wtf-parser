
// Don't use in bifrost...
const { arrayToHex } = require("./utils")
import * as Papa from 'papaparse';
import *  as  _ from 'lodash'; 

const sensorMap = require("./wintrac-sensormap.json");

enum EventTypes {
    SensorChange = 0x45,
    SensorManifest = 0x73
}
export class WintracFile 
{
    constructor(private fileBuffer: number[], private fileName) {}

    getDeviceTypeID() {
        return this.fileBuffer[723];
    }

    arraySegmentEquals(arr, offset, bytes) {
        for(let i = 0; i < bytes.length; i++) {
            if (arr[i + offset] !== bytes[i]) return false;
        }
        return true;
    }

    decodeEventRecord(buf, offset) {
        const eventType = buf[offset + 7];
        const record = { Time: this.decodeTimestamp(buf, offset + 3), /*Location: offset, Raw: arrayToHex(buf, offset, 48),*/ Type: eventType, Sensors: [], SensorChanges: null };
        if (eventType === EventTypes.SensorManifest) {
            const sensorCount = this.readUIntLE(buf, offset + 10, 2)
            record.Sensors = _.range(sensorCount).reduce((acc, sensor, index) => { 
                const mappedSensor = this.findSensor(buf, offset + 16 + index*4)
                if (mappedSensor) acc.push({ ...mappedSensor, Offset: index * 2 })
                return acc;
            }, [])
        } else if (eventType === EventTypes.SensorChange) {
            const mappedSensor = this.findSensor(buf, offset + 10);
            if (mappedSensor) {
                record.SensorChanges = { [mappedSensor.Name] : this.decodeSensor(buf, offset + 12, mappedSensor)};
            }
        }
        return record;
    }

    findFirstOffset(buf, ...bytes) {
        for(let i = 0; i < buf.length; i++) {
            if (this.arraySegmentEquals(buf, i, bytes)) return i;
        }
        return null;
    }

    getFileSensorManifestOffset(buf) {
        return this.findFirstOffset(buf, 0xFF, 0x4B, 0x04, 0x02, 0x0B) + 5;
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
        const sensors = sensorMap[typeKey] || [];
        return sensors.find(s => s.BlockID === buffer[sensorOffset] && s.DataID === buffer[sensorOffset + 1]);    
    }

    decodeRecord(buf, offset, sensors, length, sensorTemplate = {}) {
        const record = sensors.reduce((map, sensor) => {
            map[sensor.Name] = this.decodeSensor(buf, 9 + offset + sensor.Offset, sensor);
            return map;
        }, { Time: this.decodeTimestamp(buf, offset + 3), ...sensorTemplate });
        if (_.isFinite(record["Control Configuration"])) {
            record["Unit Operating Mode"] = this.decodeCCFG(record["Control Configuration"]);
        }
        return record;
    }

    decodeTimestamp(buf, offset) {
        return new Date(this.readUIntLE(buf, offset, 4) * 60 * 1000);  // Timestamps are stored as the number of minutes since the unix epoch (1970-1-1) as a 32-bit unsigned value.
    }

    decodeOpmode(record, offset) {
        const rawValue = this.readIntLE(record, offset, 2);
        switch (rawValue) {
            case 0x0001:
            case 0x0003:
            case 0x00010:
                return "Cool";

            case 0x0002: 
                return "High Mod Cool";

            case 0x0006: 
                return "Mod Cool";

            case 0x000c:
            case 0x001a:
            case 0x002a:
                return "Defrost";

            case 0x000e:
            case 0x001f:
            case 0x0024:
                return "Heat";

            case 0x00013:
                return "Mod Heat";
            case 0x00018:
            case 0x0021:
                return "Null";

            case 0x0022:
                return "Shutdown";

            case 0x001b:
                return "Mod cool";

            case 0x001d:
                return "Off";

            case 0x001e:
                return "----";

            case 0x0020:
                return "Null, Fans on";

            default:
                return "Unknown - 0x" + rawValue.toString(16);
        }
    }

    decodeCCFG(ccfg) {
        switch (ccfg) { 
            case 0:
            case 1:
                return "Diesel, Cycle-Sentry";

            case 2:
            case 3:
            case 24:
                return "Diesel, Continuous";

            case 4:
                return "Electric, Cycle-Sentry";

            case 6:
            case 7:
                return "Electric, Continuous";

            default:
                return "Unknown Unit mode - 0x" + ccfg.toString("16");
        }
    }

    decodeSensor(record, offset, sensor) {
        if (sensor.DataID === 46) { // Control Configuration
            return this.readIntLE(record, offset, 2);
        } else if (sensor.DataID === 97) { // Zone Opmode
            return this.decodeOpmode(record, offset);
        } else {
            const rawValue = this.readIntLE(record, offset, 2); // Most sensors are 16-bit signed integers
            return (_.isFinite(rawValue) && rawValue !== 0x7FFF && rawValue !== 0x13FF) ? _.round(rawValue / 32.0, 1): null;
        }
    }

    get recordPrefixes() {
        return { event: [0x00, 0xff, 0x54], temperature: [0xff, 0x46, 0x61] };
    }

    getRecords() {
        const res = { events: [], temperatures: [], sensors: [], sensorTemplate: {} };
        for(let ptr = 0; ptr < this.fileBuffer.length; ptr ++) {
            if (this.arraySegmentEquals(this.fileBuffer, ptr, this.recordPrefixes.event)) {
                let ev = this.decodeEventRecord(this.fileBuffer, ptr);
                if (ev.Type === EventTypes.SensorManifest) res.sensors = ev.Sensors; // Could just if (ev.sensors.length)
                if (ev.Type === EventTypes.SensorChange && (ev.SensorChanges) ) res.sensorTemplate = { ...res.sensorTemplate, ...ev.SensorChanges }
                res.events.push(ev);
            } else if (this.arraySegmentEquals(this.fileBuffer, ptr, this.recordPrefixes.temperature)) { 
                res.temperatures.push(this.decodeRecord(this.fileBuffer, ptr, res.sensors, 100, res.sensorTemplate));
            }
        }
        return _.orderBy(res.temperatures.filter(record => this.defaultRecordFilter(record)), t => t.Time.getTime());
    }

    toCsv(latestDataToKeepSeconds = null) {
        /* We must explicitly set fields, since Papa Parse will drop headers othwerwise */
        let data = this.getRecords();
        if (latestDataToKeepSeconds) {
            const thresholdUnixTime = _.last(data).Time.getTime() - latestDataToKeepSeconds*1000;
            data = data.filter(t => t.Time.getTime() >= thresholdUnixTime);
        }
        const fields = Array.from(data.reduce((acc, r) => (Object.keys(r).reduce((acc, key) => acc.add(key), acc)), new Set()));
        return Papa.unparse({ data, fields });
    }

    defaultRecordFilter(record) {
        return (record.Time && record.Time.getTime() >= 978307200000 /* 2000-01-01 */ && Object.values(record).filter(r => r).length > 2);
    }
}

// Do we need this?
module.exports = WintracFile;