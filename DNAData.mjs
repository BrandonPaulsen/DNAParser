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
        this.SNPediaData = JSON.parse(fs.readFileSync("SNPediaData.json", "utf-8"));
    }

    analyzeDNAData(dnaFile) {
        this.loadDNAData(dnaFile);
        this.loadSNPediaData();
        this.SNPediaData.medicalConditions
            .reduce((medicalConditionLines, medicalCondition) => {
                medicalConditionLines.push(`\t${medicalCondition.title} SNPs:`);
                lines.concat(this.SNPediaData.relatedSNPs[medicalCondition.title].reduce((snpLines, snp) => {
                    let snpData = this.dnaData[snp.rsid];
                    if(snpData) {
                        snpLines.concat([
                            `\t\t${snp.rsid}:`,
                            `\t\t\t${snp.link}`,
                            `\t\t\t${snpData.allele1}, ${snpData.allele2}`,
                            `\t\t\t${}`,
1                       ]);
                    }
                }, []));
            }, []);
    }

    getDNAData() {
        return this.dnaData;
    }

    getSNP(rsid) {
        return this.dnaData[rsid];
    }

    hasSNP(rsid) {
        return getSNP(rsid) != null;
    }

    serialize() {
        fs.writeFileSync("DNAData.json", JSON.stringify(this.dnaData));
    }
    
    deserialize() {
        this.dnaData = JSON.parse(fs.readFileSync("DNAData.json", "utf-8"));
    }
}
