import fs from "node:fs";
import axios from "axios";
import * as cheerio from "cheerio";

class SNPedia {
    constructor() {
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
        });
        this.snpediaURL = "https://www.snpedia.com/index.php/";
        this.medicalConditions = {
            loadedMedicalConditions: false,
        };
        this.information = {};
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
        if(this.medicalConditions.loadedMedicalConditions) {
            return true;
        }
        console.log("Loading medical conditions");
        return this.continueQuery({
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Is_a_medical_condition",
            "cmlimit": 500,
            "format": "json",
        }, (data) => {
            data.query.categorymembers.forEach((link) => {
                let medicalCondition = link.title;
                this.medicalConditions[medicalCondition] = {
                    name: medicalCondition,
                    link: this.snpediaURL + medicalCondition,
                    relatedSNPs: {},
                    loadedRelatedSNPs: false,
                }
            });
            this.medicalConditions.loadedMedicalConditions = true;
            fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
        })
    }

    /**
     *  Gets and stores all SNPs related to medicalCondition from snpedia.
     */
    async loadRelatedSNPs(medicalCondition) {
        if(this.medicalConditions[medicalCondition].loadedRelatedSNPs) {
            return true;
        }
        console.log(`\tLoading related snps for ${medicalCondition}`);
        return this.continueQuery({
            "action": "parse",
            "page": medicalCondition,
            "prop": "links",
            "format": "json",
        }, (data) => {
            data.parse.links
                .filter((link) => link["*"].startsWith("Rs"))
                .forEach((link) => {
                    let rsid = link["*"].toLowerCase();
                    this.medicalConditions[medicalCondition].relatedSNPs[rsid] = {
                        rsid: rsid,
                        link: this.snpediaURL + rsid,
                        info: {},
                        loadedInfo: false,
                    };
                });
            this.medicalConditions[medicalCondition].loadedRelatedSNPs = true;
            fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
        });
    }

    /**
     *  Gets and stores all information about snps from snpedia.
     */
    async loadInfo(medicalCondition, rsid) {
        if(this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo) {
            return true;
        }
        console.log(`\t\tLoading info for ${rsid}`);
        if(this.information[rsid]) {
            console.log("\t\t\tFound locally");
            this.medicalConditions[medicalCondition].relatedSNPs[rsid].info = this.information[rsid];
            this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo = true;
            fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
            fs.writeFileSync("SNPediaInfo.json", JSON.stringify(this.information));
            return true;
        }
        if(rsid.includes("(")) {
            console.log("\t\t\tInvalid rsid");
            this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo = true;
            fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
            fs.writeFileSync("SNPediaInfo.json", JSON.stringify(this.information));
            return true;
        }
        return this.continueQuery({
            "action": "parse",
            "page": rsid,
            "prop": "text",
            "format": "json",
        }, (data) => {
            if(!data.parse || !data.parse.text || !data.parse.text["*"]) {
                console.log(`\t\tNo info for ${rsid}`);
                this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo = true;
                fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
                fs.writeFileSync("SNPediaInfo.json", JSON.stringify(this.information));
                return;
            }
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
            })
            if(!extracted.smwtable || !extracted.smwtable.rows) {
                this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo = true;
                return;
            }
            extracted.smwtable.rows.forEach((row) => {
                let cols = row.cols
                if(cols.length === 3) {
                    let genotype = cols[0].trim();
                    let magnitude = cols[1].trim();
                    let summary = cols[2].trim();
                    let info = {
                        genotype: genotype,
                        magnitude: magnitude,
                        summary: summary
                    };
                    this.medicalConditions[medicalCondition].relatedSNPs[rsid].info[genotype] = info;
                    if(!this.information[rsid]) {
                        this.information[rsid] = {};
                    }
                    this.information[rsid][genotype] = info;
                }
            });
            this.medicalConditions[medicalCondition].relatedSNPs[rsid].loadedInfo = true;
            fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
            fs.writeFileSync("SNPediaInfo.json", JSON.stringify(this.information));
        });
    }
    
    /**
     *  Load all SNpedia information in the correct order.
     *  SNPediaData.json is of the form:
     *  {
     *      <medicalCondition>: {
     *          name: <medicalCondition>,
     *          link: <link to snpedia>,
     *          relatedSNPs: {
     *              <rsid>: {
     *                  rsid: <rsid>,
     *                  link: <link to snpedia>,
     *                  info: {
     *                      <genotype>: {
     *                          genotype: <genotype>,
     *                          magnitude: magnitude,
     *                          summary: summary
     *                      }
     *                  }
     *              }
     *          }
     *      }
     *  }
     */
    async syncSNPedia() {
        this.loadSNPediaData();
        await this.loadMedicalConditions();
        for(let medicalCondition of Object.keys(this.medicalConditions)) {
            if(medicalCondition === "loadedMedicalConditions") {
                continue;
            }
            await this.loadRelatedSNPs(medicalCondition);
            for(let rsid of Object.keys(this.medicalConditions[medicalCondition].relatedSNPs)) {
                await this.loadInfo(medicalCondition, rsid);
            }
        }
        fs.writeFileSync("SNPediaData.json", JSON.stringify(this.medicalConditions));
        return true;
    }

    loadSNPediaData() {
        this.information = JSON.parse(fs.readFileSync("SNPediaInfo.json", "utf-8"));
        this.medicalConditions = JSON.parse(fs.readFileSync("SNPediaData.json", "utf-8"));
    }
}

const snpedia = new SNPedia();
snpedia.syncSNPedia();
