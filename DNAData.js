import fs from "node:fs";
import path from "path";

class DNAData {
    constructor(dnaFile = false) {
        this.dnaData = {};
        this.loadAncestryData(dnaFile);
        this.loadSNPediaData();
        this.analyzeDNAData();
    }

    loadAncestryData(ancestryFile) {
        // Extract, format, and store data
        let lines = fs
            .readFileSync(ancestryFile, "utf-8")
            .split(/[\r]?\n/)
            .filter((line) => !line.startsWith("#"))
            .slice(1)
            .map((line) => line.split(/\s+/))
            .map((line) => {
                return {
                    rsid: line[0],
                    chromosome: line[1],
                    position: line[2],
                    genotype: `(${line[3]};${line[4]})`,
                }
            })
            .forEach((snp) => this.dnaData[snp.rsid] = snp);
    }

    loadSNPediaData() {
        this.medicalConditions = JSON.parse(fs.readFileSync("SNPediaData.json", "utf-8"));
    }

    analyzeDNAData() {
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
        let dnaSummary = Object
            .keys(this.medicalConditions)
            .filter((medicalCondition) => medicalCondition != "loadedMedicalConditions")
            .map((medicalCondition) => this.medicalConditions[medicalCondition])
            .map((medicalConditionInformation) => {
                let relatedSNPInformation = Object
                    .values(medicalConditionInformation.relatedSNPs)
                    .filter((snp) => Object.hasOwn(this.dnaData, snp.rsid))
                    .filter((snp) => Object.hasOwn(snp.info, this.dnaData[snp.rsid].genotype))
                    .filter((snp) => !invalidSummaries.includes(snp.info.summary))
                    .map((snp) => {
                        let info = snp.info[this.dnaData[snp.rsid].genotype];
                        return [
                            `\tRSID: ${snp.rsid}`,
                            `\t\tGenotype: ${info.genotype}`,
                            `\t\tMagnitude: ${info.magnitude}`,
                            `\t\tSummary: ${info.summary}`,,
                        ]
                        .join("\n");
                    }).join("\n");
                return {
                    medicalCondition: medicalConditionInformation.name,
                    relatedSNPInformation: relatedSNPInformation,
                }
            })
            .filter((medicalConditionInformation) => medicalConditionInformation.relatedSNPInformation != "")
            .map((medicalConditionInformation) => `${medicalConditionInformation.medicalCondition}\n${medicalConditionInformation.relatedSNPInformation}`)
            .join("\n");
        fs.writeFileSync("DNASummary.txt", dnaSummary);
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
