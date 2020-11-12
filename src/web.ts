import { LoDashStatic } from "lodash";

// We must use CommonJs module types here...
const _ = <LoDashStatic>require("lodash");
const WintracFile = require("./WintracFile");

function readFileData(file) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function processFile(e) {
    console.log("processFile:", e);
    var file = e.files[0]
    let fileData = await readFileData(file);
    console.log ({ fileData });
    console.time("wintrac-parse");
    const typedArray = new Uint8Array(fileData as ArrayBuffer);
    let wtf = new WintracFile([...typedArray], "");
    let records = await wtf.getRecords();
    console.timeEnd("wintrac-parse");
    console.log("testWTF: DeviceId:", "0x" + wtf.getDeviceTypeID().toString(16));
    console.log("Decoded records:")
    console.table(_.take(records, 100));
    console.log("CSV:", await wtf.toCsv());
};


/* Browserify will not expose functions in the global scope by default so we use this workaround. */
_.set(window, "processFile", processFile);