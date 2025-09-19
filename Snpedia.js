const axios = require("axios");
const Snpedia = class {
    constructor() {
        this.axios = axios.create({
            baseURL: "https://bots.snpedia.com/api.php",
            params: {
                "action": "query",
                "format": "json",
            }
        });
    }

    async medicalConditions() {
        let response = await this.axios.get("", {
            params: {
                "list": "categorymembers",
                "cmtitle": "Category:Is_a_medical_condition",
                "cmlimit": 500,
            }
        });
        return response.data.query.categorymembers;
    }

    async relatedSNPs(medicalCondition) {
        let response = await this.axios.get("", {
            params: {
                "titles": medicalCondition,
                "prop": "linkshere"
            }
        });
        return Object.values(response.data.query.pages).reduce((snps, page) => {
            return snps.concat(page.linkshere);
        }, []);
    }
}
module.exports = Snpedia;
