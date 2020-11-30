
const assert = require("chai").assert;
const expect = require("chai").expect;

const fs = require("fs");
const WintracFile = require("../dist/WintracFile");

describe('WintracFile tests', function() {

    describe('Basic tests', function() {
        it(`Should create without throwing`, function() {
            let wtf = new WintracFile([]);
            expect(wtf, "Should be an instance of WintracFile").to.be.an.instanceof(WintracFile)
        });
    });

    describe('Sample file parsing', function() {
        let inputs = [
            {
                file: "../sample_files/00187--1.wtf",
                recordCount: 2075,
                first: { Time: '2013-04-18T15:02:00.000Z', Setpoint: -23.3, "Return Control": -13.2, Ambient: 6.3 },
                last: { Time: '2013-05-06T23:15:00.000Z' , Setpoint:  17.8, "Return Control": 17.8, Ambient: 20.6 },
                parseTimeMs: 250
            },
            {
                file: "../sample_files/CU1171--1.wtf",
                recordCount: 17106,
                first: { Time: '2020-07-21T12:25:00.000Z', "Setpoint Zone-1": -23.0, "Return Zone-1": -23.3 },
                last: { Time: '2020-08-11T12:36:00.000Z', "Setpoint Zone-1": -22.0, "Return Zone-1": 4.7 },
                parseTimeMs: 500 
            },
            {
                file: "../sample_files/MT577--1.wtf",
                recordCount: 6119,
                first: { Time: '2008-03-04T18:36:00.000Z', Setpoint: 0, "Return Control": 30.4 },
                last: { Time: '2008-10-13T20:10:00.000Z', Setpoint: 1.7, "Return Control": 19.5 },
                parseTimeMs: 250
            },
            {
                file: "../sample_files/CODD1--1.wtf",
                recordCount: 14100,
                first: { Time: '2020-07-28T00:00:00.000Z', "Setpoint Zone-1": -21.0, "Return Zone-1": -19.8 },
                last: { Time: '2020-08-18T08:26:00.000Z', "Setpoint Zone-1": -21.0, "Return Zone-1": -18.3 },
                parseTimeMs: 1000
            },
            {
                file: "../sample_files/R4038--1.wtf",
                recordCount: 23304, 
                first: { Time: '2014-05-18T13:00:00.000Z' }, 
                last: { Time: '2016-09-12T15:18:00.000Z' , "Logger Sensor 1": 19.3 },
                parseTimeMs: 550 
            },
            {
                file: "../sample_files/4262---2.wtf",
                recordCount: 103977,
                first: { Time: '2014-06-21T21:38:00.000Z', "Setpoint Temperature": 0, "Logger Sensor 1": 18.6 },
                last: { Time: '2016-08-16T10:52:00.000Z' , "Setpoint Temperature": -22, "Logger Sensor 1": -2.4 },
                parseTimeMs: 2000
            },
        ]
        for(let input of inputs) {
            it(`Should parse file ${input.file} and return records`, function() {
                let data = fs.readFileSync(input.file)
                let start = Date.now();
                let wtf = new WintracFile([...data]);
                let records = wtf.getRecords();
                // Map our records to be more testable
                records = records.map(r => ({ ...r, Time: r.Time.toISOString()}))
                let parseTimeMs = Date.now() - start;
                assert.strictEqual(records.length, input.recordCount, "Expect record counts to match");
                expect(records[0]).to.include(input.first);
                expect(records[records.length - 1]).to.include(input.last);
                assert.isBelow(parseTimeMs, input.parseTimeMs, "Should parse in this time or less");
                console.log(`Parse time (${input.file}: ${parseTimeMs}ms)`)
            });
        }
    });

    describe('CSV Conversion', function() {
        this.timeout(10000);
        let inputs = [
            {
                file: "../sample_files/4262---2.wtf",
                lineCount: 103978,
                conversionTimeMs: 5000
            },
        ]
        for(let input of inputs) {
            it(`Should parse file ${input.file} and return records`, function() {
                let data = fs.readFileSync(input.file)
                let start = Date.now();
                let wtf = new WintracFile([...data]);
                let csv = wtf.toCsv();
                let csvLines = csv.split("\n");
                let conversionTimeMs = Date.now() - start;
                assert.strictEqual(csvLines.length, input.lineCount, "Expect line counts to match");
                console.log(`Conversion time (${input.file}: ${conversionTimeMs}ms)`)
            });
        }
    });
})