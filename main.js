import { SNPedia } from "./SNPedia.mjs";
import { DNAData } from "./DNAData.mjs";
const path = import("path");

// Get name of file (executable after pkg)
let file = process.argv[2];
file = file.split(path.sep);
file = file[file.length - 1];

// Make sure there is a file argument
if(process.argv.length < 3) {
    console.log(`USAGE: node ${file} <DNA FILE>`);
    process.exit(2);
}

const snpedia = new SNPedia();
const dnaData = new DNAData(process.argv[2]);
snpedia.getMedicalConditions().then((medicalConditions) => {
    console.log(medicalConditions[medicalConditions.length - 1]);
});
//snpedia.medicalConditions().then((medicalConditions) => fs.writeFile("medicalConditions.json", JSON.stringify(medicalConditions), "utf8", (error) => console.log(error)));
//snpedia.medicalConditions().then((medicalConditions) => {
    //let index = 0;
    //snpedia.relatedSNPs(medicalConditions
//});
