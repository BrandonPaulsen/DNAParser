import axios from "axios";
import { DNAData } from "./DNAData.mjs";

export class SNPedia {
    constructor(dnaFile) {
        this.dnaData = new DNAData(dnaFile);
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
        });
        this.relatedSNPs = {};
        this.medicalConditions = null;
        this.snpediaURL = "https://www.snpedia.com/index.php/";
    }

    async query(params, extract) {
        let response = await this.axios.get("", {params});
        let responseData = response.data;
        extract(responseData);
        if(Object.hasOwn(responseData, "continue")) {
            Object.keys(responseData.continue)
                .filter((key) => key != "continue")
                .forEach((key) => params[key] = responseData.continue[key]);
            return true;
        }
        return false;
    }

    async continueQuery(params, extractor) {
        while(await this.query(params, extractor)) {}
    }

    async loadMedicalConditions() {
        return this.continueQuery({
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Is_a_medical_condition",
            "cmlimit": 500,
            "format": "json",
        }, (data) => {
            if(!this.medicalConditions) {
                this.medicalConditions = [];
            }
            data.query.categorymembers.forEach((medicalCondition) => {
                medicalCondition.link =  this.snpediaURL + medicalCondition.title;
                this.medicalConditions.push(medicalCondition);
            });
        });
    }

    async getMedicalConditions() {
        if(!this.medicalConditions) {
            await this.loadMedicalConditions();
        }
        return this.medicalConditions;
    }

    async loadRelatedSNPs(medicalCondition) {
        return this.continueQuery({
            "action": "parse",
            "page": medicalCondition,
            "prop": "links",
            "format": "json",
        }, (data) => {
            if(!Object.hasOwn(this.relatedSNPs, medicalCondition)) {
                this.relatedSNPs[medicalCondition] = [];
            }
            data.parse.links
                .filter((link) => link["*"].startsWith("Rs"))
                .forEach((link) => {
                    let rsid = link["*"].toLowerCase();
                    let relatedSNP = {
                        rsid: rsid,
                        link: this.snpediaURL + rsid,
                    }
                    let dnaSNP = this.dnaData.getSNP(rsid);
                    if(dnaSNP) {
                        relatedSNP.allele1 = dnaSNP.allele1;
                        relatedSNP.allele2 = dnaSNP.allele2;
                    }
                    this.relatedSNPs[medicalCondition].push(relatedSNP);
                });
        });
    }

    async getRelatedSNPs(medicalCondition) {
        if(!Object.hasOwn(this.relatedSNPs, medicalCondition)) {
            await this.loadRelatedSNPs(medicalCondition);
        }
        return this.relatedSNPs[medicalCondition];
    }
}
