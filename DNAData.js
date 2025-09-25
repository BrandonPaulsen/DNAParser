import fs from "node:fs";
import path from "path";

class DNAData {
    constructor(dnaFile = false) {
        this.dnaData = null;
        this.loadDNAData(dnaFile);
        this.analyzeDNAData();
    }

    loadDNAData(dnaFile) {
        let dnaData = fs
            .readFileSync(dnaFile, "utf-8") .split(/[\r]?\n/)
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
        this.loadSNPediaData();
        let lines = [];
        let invalidSummaries = [
            "",
            "common in clinvar",
            "average",
            "common in complete genomics",
            "normal",
            "common/normal",
            "None",
            "common",
            "common genotype",
            "normal risk",
        ];
        Object.keys(this.medicalConditions)
            .forEach((medicalCondition) => {
                if(medicalCondition === "loadedMedicalConditions") {
                    return;
                }
                lines.push(`${medicalCondition}:`);
                let hasSNPs = false;
                let relatedSNPs = this.medicalConditions[medicalCondition].relatedSNPs;
                Object.keys(relatedSNPs)
                    .forEach((rsid) => {
                        let snp = this.dnaData[rsid];
                        if(snp) {
                            let genotype = `(${snp.allele1};${snp.allele2})`;
                            let info = relatedSNPs[rsid].info[genotype];
                            if(info && !invalidSummaries.includes(info.summary)) {
                                hasSNPs = true;
                                lines.push(`\t${rsid}:`);
                                lines.push(`\t\t${genotype}`);
                                lines.push(`\t\t${info.magnitude} magnitude`);
                                lines.push(`\t\t${info.summary}`);
                            }
                        }
                    });
                if(!hasSNPs) {
                    lines.push("\tNo related data found");
                }
            });
        fs.writeFileSync("DNASummary.txt", lines.join("\n"));
    }
}


// Make sure there is a file argument
if(process.argv.length < 3) {
    console.log(`USAGE: node ${file} <DNA FILE>`);
    process.exit(2);
}

// Get name of file (executable after pkg)
let file = process.argv[2];
file = file.split(path.sep);
file = file[file.length - 1];

const dnaData = new DNAData(file);
