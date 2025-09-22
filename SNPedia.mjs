import fs from "node:fs";
import axios from "axios";
import * as cheerio from "cheerio";
import { DNAData } from "./DNAData.mjs";

export class SNPedia {
    constructor() {
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
        });
        this.snpediaURL = "https://www.snpedia.com/index.php/";
    }

    async query(params, extractor) {
        let response = await this.axios.get("", {params});
        let responseData = response.data;
        extractor(responseData);
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
        return true;
    }

    /**
     *  Gets and stores all medicalConditions from snpedia.
     */
    async loadMedicalConditions() {
        return this.continueQuery({
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Is_a_medical_condition",
            "cmlimit": 500,
            "format": "json",
        }, (data) => {
            if(!this.medicalConditions) {
                this.medicalConditions = {};
            }
            data.query.categorymembers.forEach((link) => {
                let medicalCondition = link.title;
                this.medicalConditions[medicalCondition] = {
                    name: medicalCondition,
                    link: this.snpediaURL + medicalCondition
                }
            });
        })
    }

    /**
     *  Gets and stores all SNPs related to medicalCondition from snpedia.
     */
    async loadRelatedSNPs(medicalCondition) {
        return this.continueQuery({
            "action": "parse",
            "page": medicalCondition,
            "prop": "links",
            "format": "json",
        }, (data) => {
            if(!this.medicalConditions[medicalCondition].relatedSNPs) {
                this.medicalConditions[medicalCondition].relatedSNPs = {};
            }
            data.parse.links
                .filter((link) => link["*"].startsWith("Rs"))
                .forEach((link) => {
                    let rsid = link["*"].toLowerCase();
                    this.medicalConditions[medicalCondition].relatedSNPs[rsid] = {
                        rsid: rsid,
                        link: this.snpediaURL + rsid
                    };
                });
        });
    }

    /**
     *  Gets and stores all information about snps from snpedia.
     */
    async loadInfo(medicalCondition, rsid) {
        return this.continueQuery({
            "action": "parse",
            "page": rsid,
            "prop": "text",
            "format": "json",
        }, (data) => {
            const $ = cheerio.load(data.parse.text["*"]);
            const extracted = $.extract({
                smwtable: {
                    selector: ".smwtable",
                    value: {
                        rows: [
                            {
                                selector: "tr",
                                value: {
                                    cols: [
                                        {
                                            selector: "td",
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }).smwtable.rows.forEach((row) => {
                if(!this.medicalConditions[medicalCondition].relatedSNPs[rsid].info) {
                    this.medicalConditions[medicalCondition].relatedSNPs[rsid].info = {};
                }
                let cols = row.cols
                if(cols.length === 3) {
                    let genotype = cols[0].trim();
                    let magnitude = cols[1].trim();
                    let summary = cols[2].trim();
                    this.medicalConditions[medicalCondition].relatedSNPs[rsid].info[genotype] = {
                        genotype: genotype,
                        magnitude: magnitude,
                        summary: summary
                    };
                }
            });
        });
    }
    
    /**
     * Load all SNpedia information in the correct order.
     */
    async syncSNPedia() {
        console.log("Loading medical conditions");
        await this.loadMedicalConditions();
        for(let medicalCondition of Object.keys(this.medicalConditions)) {
            console.log(`\tLoading related snps for ${medicalCondition}`);
            await this.loadRelatedSNPs(medicalCondition);
            for(let rsid of Object.keys(this.medicalConditions[medicalCondition].relatedSNPs)) {
                console.log(`\t\tLoading info for ${rsid}`);
                await this.loadInfo(medicalCondition, rsid);
            }
        }
        return true;
    }
}
