

const fs = require("fs");
const path = require("path");
const WintracFile = require("./dist/WintracFile");


async function testWTF(wtfFilePath, csvPath) {
    let buf = fs.readFileSync(wtfFilePath)
    console.time("parse-wtf");
    let wtf = new WintracFile(Array.from(buf), wtfFilePath);
    
    let records = wtf.getRecords();
    console.timeEnd("parse-wtf");
    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("testWTF: Sensors:", wtf.getSensorList());
    console.log("testWTF: Records:", records[0]);
}

//testWTF("../sample_files/00187--1.wtf", "../output_files/00187.csv");
//testWTF(__dirname + "/../sample_files/MT577--1.wtf", __dirname + "/../output_files/MT577.csv");
//testWTF("../sample_files/CU1171--1.wtf", "CU1171.csv");
//testWTF("../sample_files/R4038--1.wtf", "R4038.csv");
//testWTF(path.join(__dirname, "../sample_files/MT577--1.wtf"), path.join(__dirname, "../output_files/MT577.csv"));
testWTF(path.join(__dirname, "../sample_files/CU1171--1.wtf"), path.join(__dirname, "../output_files/CU1171.csv"));

