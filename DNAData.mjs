import fs from "node:fs";

export class DNAData {
    constructor(dnaFile) {
        this.dnaFile = dnaFile;
        this.dnaData = null;
    }

    loadDNAFile() {
        let dnaData = fs
            .readFileSync(this.dnaFile, "utf-8")
            .split(/[\r]?\n/)
            .reduce((dnaData, line) => {
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
                });

                dnaData.snps[snp[dnaData.primaryKey]] = snp;
                return dnaData;
            }, {snps: {}});
        this.dnaData = dnaData;
    }

    getDNAData() {
        if(!this.dnaData) {
            loadDNAData();
        }
        return this.dnaData;
    }
}
