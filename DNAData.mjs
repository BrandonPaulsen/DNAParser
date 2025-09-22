import fs from "node:fs";

export class DNAData {
    constructor(dnaFile = false) {
        if(dnaFile) {
            this.dnaData = null;
            this.loadDNAFile(dnaFile);
        } else {
            this.deserialize();
        }
    }

    loadDNAData(dnaFile) {
        let dnaData = fs
            .readFileSync(dnaFile, "utf-8")
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
                }, {});

                dnaData[snp[dnaData.primaryKey]] = snp;
                return dnaData;
            }, {});
        this.dnaData = dnaData;
    }

    loadSNPediaData() {
        this.medicalConditions = JSON.parse(fs.readFileSync("SNPediaData.json", "utf-8"));
    }

    analyzeDNAData(dnaFile) {
        this.loadDNAData(dnaFile);
        this.loadSNPediaData();
        let lines = [];
        Objet.keys(this.medicalConditions)
            .forEach((medicalCondition) => {
                lines.push(`${medicalCondition}:`);
                let relatedSNPs = this.medicalConditions[medicalCondition].relatedSNPs;
                Object.keys(relatedSNPs)
                    .forEach((rsid) => {
                        let snp = this.dnaData[rsid];
                        if(snp) {
                            let genotype = `(${snp.allele1};${snp.allele2})`;
                            let info = relatedSNPs[rsid].info[genotype];
                            if(info) {
                                lines.push(`\t${rsid}:`);
                                lines.push(`\t\t${genotype}`);
                                lines.push(`\t\t${info.summary}`);
                            }
                        }
                    });
            });
        fs.writeFileSync("DNASummary.txt", lines.join("\n"));
    }
}
