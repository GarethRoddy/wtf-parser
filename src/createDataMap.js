const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const sensorRegeX = /setpoint|return(?! display)|coil|discharge(?! display| pressure)|ambient|spare|logger/i
async function getDataMapFromXml(xmlFile) {
    const parseString = require('xml2js').parseStringPromise;
    try { 
        const xml = fs.readFileSync(xmlFile, "utf-8");
        const result = await parseString(xml, { mergeAttrs: true , explicitArray: false})
        let sensorTables  = result.TimedColumnList.typeID;
        let sensors = sensorTables.reduce((map, row) => { 
            map[row.ID] = row.column.filter(col => sensorRegeX.test(col.Name)).map(col => _.pick(col, "Name", "BlockID", "DataID")).map(col => { 
                return { Name: col.Name, BlockID: parseInt(col.BlockID, 16), DataID: parseInt(col.DataID, 16) }
            });
            return map;   
        }, {});
        return sensors;
    } catch (error) {
        console.error("createDataMapFromXml: An error occurred: ", error);
    }
    
}

async function exportDataMap(xmlFile) {
    let sensors = await getDataMapFromXml(xmlFile);
    fs.writeFileSync(path.join(__dirname, "./dist/wintrac-sensormap.json"), JSON.stringify(sensors, null, 4));
}

exportDataMap(path.join(__dirname, "/data/TimedColumnList.xml"))