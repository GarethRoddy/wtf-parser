const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const sensorRegeX = /setpoint|return(?! display)|coil|discharge(?! display| pressure)|ambient|logger|System Operating Mode|op\s?mode|Control Configuration/i
async function getDataMapFromXml(xmlFile) {
    const parseString = require('xml2js').parseStringPromise;
    try { 
        const xml = fs.readFileSync(xmlFile, "utf-8");
        const result = await parseString(xml, { mergeAttrs: true , explicitArray: false})
        let sensorTables  = result.TimedColumnList.typeID;
        let sensors = sensorTables.reduce((map, row) => { 
            map[row.ID] = row.column.filter(col => sensorRegeX.test(col.Name)).map(col => _.pick(col, "Name", "BlockID", "DataID", "DisplayOrder")).map(col => { 
                return { Name: col.Name, BlockID: parseInt(col.BlockID, 16), DataID: parseInt(col.DataID, 16), DisplayOrder: parseInt(col.DisplayOrder) }
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
    sensors['0x2F'].push( { Name: "ETV Position", BlockID: 0x16, DataID: 0x11 })
    fs.writeFileSync(path.join(__dirname, "./dist/wintrac-sensormap.json"), JSON.stringify(sensors, null, 4));
}

exportDataMap(path.join(__dirname, "/data/TimedColumnList.xml"))