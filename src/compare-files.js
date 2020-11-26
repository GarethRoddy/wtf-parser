const Papa = require('papaparse');
const fs = require("fs");
const moment = require("moment");
const WintracFile = require("./dist/WintracFile");
const _ = require("lodash");

function compareFiles(map, file1, file2) {
    let csv = fs.readFileSync(file1, "utf-8");
    let result = Papa.parse(csv, { header: true });
    //console.log(result.data.filter(r => (r["Unit Operating Mode"] + "").includes('Electric')).length);
    let rows = result.data.map(mapRow);
    let groups = _.mapValues(_.groupBy(rows, r => r.OpMode, a => a.length));
  //  console.log(groups);

    let wtf = new WintracFile(Array.from(fs.readFileSync(file2)), file2);
    let records = wtf.getRecords().map(r => ({ ...r, Time: (r.Time.toISOString() + "").replace(".000", "")}));
    
    let opRegEx = /start|diesel|electric|continuous|cycle-sentry/i;// //diesel|electric/continuous|cycle-sentry/i // /diesel|electric/i;//
    rows.forEach(r => { 
        map[r.Time] = { OpMode: (r.OpMode || "").split(",").filter(o => opRegEx.test(o)).join("").trim()};
    });
    records.forEach(r => { 
        map[r.Time] = { ...map[r.Time], CCFG: r['Control Configuration'], 'Unit Operating Mode': r['Unit Operating Mode'], SYSMODE: r['System Operating Mode'], Count: (map[r.Time] || {}).Count || 0 };
        map[r.Time].Count++;
    })
    console.log("File:", file1);
    console.log("CSV length:", result.data.length);
    console.log("WTF length:", records.length);
    console.log("Map length:", Object.values(map).length);
    //console.log("Map:", map)
    return map;
}

function compareMultipleFiles() {
    let files =["23848--1" , "23853--1" , "CU1171--1" , "CODD1--1" , "43751--1", "40892--1", "MT577--1", "110SP--1" ];

    let map = {};
    for(let file of files) {
        map = compareFiles(map, `../wintrac_csv/${file}.csv`, `../sample_files/${file}.wtf`);
    }
    const field = "CCFG";
    let mode = Object.entries(map).reduce((acc, [k,v]) => {
        if (v.OpMode) {
            if (!acc[v.OpMode]) acc[v.OpMode] = [];
            if (!_.isNil(v[field])) acc[v.OpMode].push(v[field]);
        }
        return acc;
    }, {});
    mode = _.mapValues(mode, a => _.mapValues(_.groupBy(a, c => c), a => a.length));
    console.log("Mode:", mode);

}

function parseDate(date) {
    if (!date) return date;
    let m = moment.utc(date.replace(".", "/"), "MM/DD/YYYY HH:mm").format();
    return m;
}

function mapRow(row) {
    return { Time: parseDate(row.Time), OpMode: row["Unit Operating Mode"] ? (row["Unit Operating Mode"] + "").trim(): null };
}


compareMultipleFiles();