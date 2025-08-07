const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getValitiveToken } = require('./valitiveAuthService');
const { getOrgFromCache, saveOrgToCache } = require('./cachingService');

// Get organization data from API (with cache)
const getOrgFromAPI = async (legalId) => {
    try {
        // Try cache first
        let cached = await getOrgFromCache(legalId);
        if (cached && cached.results && cached.results.length > 0) {
            return cached.results[0];
        }
        // Get the latest token
        const token = await getValitiveToken();

        // Make API request with dynamically fetched token
        const response = await axios({
            method: 'put',
            url: `${process.env.VALITIVE_API_BASE_URL}/search/request`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                "filter": {
                    "_type": "SPLIT",
                    "partyType": "ORG",
                    "country": "SE",
                    "legalId": legalId
                },
                "dataClasses": [
                    "O1_0_BASIC",
                    "O1_1_GENERAL",
                    "O2_0_STATUS",
                    "O2_1_BOARD",
                    "O2_2_CONTACT",
                    "O3_0_PHONE",
                    "O4_0_LEGAL",
                    "O5_0_FINANCE_BASIC",
                    "O5_1_FINANCE_GENERAL"
                ],
                "frame": {
                    "startIndex": 0,
                    "count": 1
                }
            }
        });

        const orgData = response.data.results[0] || null;

        if (orgData) {
            await saveOrgToCache(legalId, { results: [orgData], startIndex: 0, endIndex: 1, total: 1 });
        }
        return orgData;
    } catch (error) {
        console.error('Error fetching organization data:', error.message);
        throw error;
    }
};

module.exports = {
    getOrgFromAPI
};
