const axios = require("axios");
const jsdom = require("jsdom");
const Snpedia = class {
    constructor() {
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
        });
        this.relatedSNPS = {};
    }

    async continueQuery(params, extractor) {
        let data = [];
        let finishedQuery = false;
        let request = {
            params: params
        };

        while(!finishedQuery) {
            let response = await this.axios.get("", request);
            let responseData = response.data;
            data = data.concat(extractor(responseData));
            finishedQuery = !Object.hasOwn(responseData, "continue");
            if(!finishedQuery) {
                Object.keys(responseData.continue)
                    .filter((key) => key != "Continue")
                    .forEach((key) => request.params[key] = responseData.continue[key]);
            }
        }
        return data;
    }

    async medicalConditions() {
        return this.continueQuery({
            "action": "query",
            "list": "categorymembers",
            "cmtitle": "Category:Is_a_medical_condition",
            "cmlimit": 500,
            "format": "json",
        }, (data) => data.query.categorymembers);
    }

    async relatedSNPs(medicalCondition) {
        return continueQuery({
            "action": "parse",
            "page": medicalCondition,
            "prop": "links",
            "format": "json",
        }, (data) => {
            return data.parse.links
                .map((link) => link["*"].toLowerCase())
                .filter((link) => link.startsWith("rs"));
        });
    }
}
module.exports = Snpedia;
