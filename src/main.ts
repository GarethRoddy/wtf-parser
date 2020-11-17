

const fs = require("fs");
const path = require("path");
const WintracFile = require("./dist/WintracFile");
const { take } = require("lodash");

async function testWTF(wtfFilePath, csvPath) {
    let buf = fs.readFileSync(wtfFilePath)
    console.time("parse-wtf");
    let wtf = new WintracFile(Array.from(buf), wtfFilePath);
    
    let eventRecords = wtf.getEventRecords();
    console.log("Event record count:", eventRecords.length);
    console.log("Event 1:", take(eventRecords.filter(r => r.Time.toISOString() >= '2001-06-15T15:29:00'), 10));
    let records = wtf.getRecords();
    console.timeEnd("parse-wtf");
    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("testWTF: Sensors:", wtf.getSensorList());
    console.log("testWTF: Records:", take(records.filter(r => r.Time.toISOString() >= '2019-05-17T04:36:00'), 3));//9/6/2016 12:41
    console.log("testWTF: CSV:", wtf.toCsv());
}

//testWTF("../sample_files/00187--1.wtf", "../output_files/00187.csv");
//testWTF(__dirname + "/../sample_files/MT577--1.wtf", __dirname + "/../output_files/MT577.csv");
//testWTF("../sample_files/CU1171--1.wtf", "CU1171.csv");
//testWTF("../sample_files/R4038--1.wtf", "R4038.csv");
testWTF(path.join(__dirname, "../sample_files/MT577--1.wtf"), path.join(__dirname, "../output_files/MT577.csv"));
