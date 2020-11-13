
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
            { file: "../sample_files/CU1171--1.wtf", recordCount: 17106, firstTimestamp: '2020-07-21 12:25', lastTimestamp: '2020-08-11 12:36' },
            { file: "../sample_files/MT577--1.wtf", recordCount: 6119, firstTimestamp: '2008-03-04 18:36', lastTimestamp: '2008-10-13 20:10' }
        ]
        for(let input of inputs) {
            it(`Should parse file ${input.file} and return records`, function() {
                let data = fs.readFileSync(input.file)
                let wtf = new WintracFile([...data]);
                let records = wtf.getRecords();
                assert.strictEqual(records.length, input.recordCount, "Expect record counts to match");
                assert.strictEqual(records[0].Time, input.firstTimestamp, "Expect first timestamps to match");
                assert.strictEqual(records[records.length-1].Time, input.lastTimestamp, "Expect last timestamps to match");
            });
        }
    });
})