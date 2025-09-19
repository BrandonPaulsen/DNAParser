const path = require("path");
const fs = require("node:fs");
const axios = require("axios");

// Get name of file (executable after pkg)
let file = process.argv[1];
file = file.split(path.sep);
file = file[file.length - 1];

// Usage message
let usage = `USAGE: node ${file} <DNA FILE>`;

// Make sure there is a file argument
if(process.argv.length < 3) {
    console.log(usage);
}

// Get DNA file from arg
let dnaFile = process.argv[2];

// Load DNA data
let dnaContent = fs.readFileSync(dnaFile, "utf-8");

// Parse data
let dnaData = dnaContent.split(/[\r]?\n/).reduce((dnaData, line) => {
    // Ignore comments
    if(line.startsWith("#")) {
        return dnaData;
    }

    // Split line into values
    let values = line.split(/\s+/);
    
    // First non-comment line is keys
    if(!Object.hasOwn(dnaData, "keys")) {
        dnaData.primaryKey = values[0];
        dnaData.keys = values;
        return dnaData;
    }

    // Parse words into object
    let snp = values.reduce((snp, value, index) => {
        snp[dnaData.keys[index]] = value;
        return snp;
    }, {});

    // Add data
    dnaData.snps[snp[dnaData.primaryKey]] = snp;
    return dnaData;
}, {snps: {}});


