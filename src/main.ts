

const fs = require("fs");
const path = require("path");
const WintracFile = require("./dist/WintracFile");
const { take } = require("lodash");


async function testWTF(wtfFilePath, csvPath) {
    let buf = fs.readFileSync(wtfFilePath)
    console.time("parse-wtf");
    let wtf = new WintracFile(Array.from(buf), wtfFilePath);
    
    let eventRecords = wtf.getEventRecords();
    let eventTypes = new Set(eventRecords.map(({Type}) =>  Type));
    console.log({ eventTypes } );
    console.log("Event record count:", eventRecords.length, eventRecords[21]);
  //  console.log("Event 1:", take(eventRecords.filter(r => r.Time.8toISOString() >= '2001-06-15T15:29:00'), 10));
    let records = wtf.getRecords();
    console.log("Event Records (sensor manifest):", take(eventRecords.filter(r => r.Time >= new Date('2016-06-14T10:25:00Z')).filter(r => r.Type === 0x45),20) );
    console.timeEnd("parse-wtf");
    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("testWTF: Sensors:", wtf.getSensorList());
    console.log("testWTF: Records:", take(records.filter(r => r.Time >= new Date('2016-06-14T17:44:00Z')), 5));//9/6/2016 12:41
    //console.log("testWTF: CSV:", wtf.toCsv());
    fs.writeFileSync(csvPath, wtf.toCsv())
}

//testWTF("../sample_files/00187--1.wtf", "../output_files/00187.csv");
testWTF(__dirname + "/../sample_files/23853--1.wtf", __dirname + "/../output_files/23853.csv");
//testWTF("../sample_files/CU1171--1.wtf", "../output_files/CU1171.csv");
//testWTF("../sample_files/R4038--1.wtf", __dirname + "/../output_files/R4038.csv");
//testWTF(path.join(__dirname, "../sample_files/110SP--2.wtf"), path.join(__dirname, "../output_files/110SP--2.csv"));

let b = Buffer.from([0,0]);
b.writeInt16LE(9.5*32);
console.log(b.toString("hex"));
b.writeInt16LE(6.3*32);
console.log(b.toString("hex"));
b = Buffer.from([0x4b, 0x01]);
console.log(b.readInt16LE()/32.0);
b = Buffer.from([0x8b, 0x0a, 0x73, 0x01]);
console.log(new Date(b.readInt32LE()* 60000));

module.exports = {}