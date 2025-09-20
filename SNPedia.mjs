import axios from "axios";

export class SNPedia {
    constructor() {
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
        });
        this.relatedSNPS = {};
        this.medicalConditions = null;
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
            let medicalConditions = data.query.categorymembers;
            this.medicalConditions = this.medicalConditions.concat(medicalConditions);
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
            let relatedSNPs = data.parse.links
                .map((link) => link["*"].toLowerCase())
                .filter((link) => link.startsWith("rs"));
            this.relatedSNPs[medicalCondition] = this.relatedSNPs.concat(relatedSNPs);
        });
    }

    async relatedSNPs(medicalCondition) {
        if(!Object.hasOWn(this.relatedSNPs, medicalCondition)) {
            await this.loadRelatedSNPs(medicalCondition);
        }
        return this.relatedSNPs[medicalCondition];
    }
}
