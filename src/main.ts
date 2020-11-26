

const fs = require("fs");
const path = require("path");
const WintracFile = require("./dist/WintracFile");
const { take, takeRight, groupBy, mapValues } = require("lodash");


async function testWTF(wtfFilePath, csvPath) {
    let buf = fs.readFileSync(wtfFilePath)
    console.time("parse-wtf");
    let wtf = new WintracFile(Array.from(buf), wtfFilePath);
    
    let records = wtf.getRecords();
    console.timeEnd("parse-wtf");

    console.log("Record count:", records.length);

    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("testWTF: Records:", take(records.filter(r => r.Time >= new Date('2019-06-27T14:46:00Z')), 20));//9/6/2016 12:41
    fs.writeFileSync(csvPath, wtf.toCsv())
}


testWTF("../sample_files/23848--1.wtf", "../output_files/23848.csv");

module.exports = {}