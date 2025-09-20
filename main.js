import { SNPedia } from "./SNPedia.mjs";
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

const snpedia = new SNPedia(process.argv[2]);
//snpedia.getMedicalConditions().then((medicalConditions) => {
    //let medicalCondition = medicalConditions[28].title;
    //console.log(medicalCondition);
    //snpedia.getRelatedSNPs(medicalCondition).then((relatedSNPs) => console.log(relatedSNPs));
//});
snpedia.getRelatedSNPs("Baldness").then((relatedSNPs) => console.log(relatedSNPs));
