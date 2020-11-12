const fs = require("fs");
const path = require("path");
const WintracFile = require("./dist/WintracFile");

async function testWTF(wtfFilePath, csvPath) {
    let buf = fs.readFileSync(wtfFilePath)
    let wtf = new WintracFile(buf, wtfFilePath);
    let records = await wtf.getRecords();
    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("testWTF: records:", (records.find(r => r.Time > '2008-07-15 21:55')));

}

testWTF("../sample_files/00187--1.wtf", "../output_files/00187.csv");
//testWTF(__dirname + "/../sample_files/MT577--1.wtf", __dirname + "/../output_files/MT577.csv");
//testWTF("../sample_files/CU1171--1.wtf", "CU1171.csv");
//testWTF("../sample_files/R4038--1.wtf", "R4038.csv");
//testWTF(path.join(__dirname, "../sample_files/MT577--1.wtf"), path.join(__dirname, "../output_files/MT577.csv"));
//testWTF(path.join(__dirname, "../sample_files/CU1171--1.wtf"), path.join(__dirname, "../output_files/CU1171.csv"));
let b = Buffer.from([0,0,0,0]);
b.writeInt32LE(-5000,0);
console.log([...b].map(n => n.toString(16)))
