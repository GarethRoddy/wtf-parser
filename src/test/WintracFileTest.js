
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
            { file: "../sample_files/CU1171--1.wtf", recordCount: 17106, firstTimestamp: '2020-07-21T12:25:00.000Z', lastTimestamp: '2020-08-11T12:36:00.000Z', parseTimeMs: 400 },
            { file: "../sample_files/MT577--1.wtf", recordCount: 6028, firstTimestamp: '2008-03-04T18:36:00.000Z', lastTimestamp: '2008-10-13T20:10:00.000Z', parseTimeMs: 100 },
            { file: "../sample_files/00187--1.wtf", recordCount: 2057, firstTimestamp: '2013-04-18T15:02:00.000Z', lastTimestamp: '2013-05-06T23:15:00.000Z', parseTimeMs: 100 },
        ]
        for(let input of inputs) {
            it(`Should parse file ${input.file} and return records`, function() {
                let data = fs.readFileSync(input.file)
                let start = Date.now();
                let wtf = new WintracFile([...data]);
                let records = wtf.getRecords();
                let parseTimeMs = Date.now() - start;
                assert.strictEqual(records.length, input.recordCount, "Expect record counts to match");
                assert.strictEqual(records[0].Time.toISOString(), input.firstTimestamp, "Expect first timestamps to match");
                assert.strictEqual(records[records.length-1].Time.toISOString(), input.lastTimestamp, "Expect last timestamps to match");
                assert.isBelow(parseTimeMs, input.parseTimeMs, "Should parse in this time or less");
                console.log(`Parse time (${input.file}: ${parseTimeMs}ms)`)
            });
        }
    });
})