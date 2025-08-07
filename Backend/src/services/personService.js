const axios = require('axios');
const { getValitiveToken } = require('./valitiveAuthService');
const { getPersonFromCache, savePersonToCache } = require('./cachingService');

// Get person data from API (with cache)
const getPersonFromAPI = async (personalId) => {
    try {
        // Try cache first
        let cached = await getPersonFromCache(personalId);
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
                    "_type": "SIMPLE",
                    "partyType": "PERSON",
                    "country": "SE",
                    "what": personalId
                },
                "dataClasses": [
                    "P1_0_BASIC",
                    "P1_1_GENERAL",
                    "P1_2_EXTENDED",
                    "P1_3_SE_REG",
                    "P3_0_PHONE_BASIC"
                ],
                "clientTag": "myClient",
                "frame": {
                    "startIndex": 0,
                    "count": 1
                }
            }
        });

        const personData = response.data.results[0] || null;

        if (personData) {
            await savePersonToCache(personalId, { results: [personData], startIndex: 0, endIndex: 1, total: 1 });
        }
        return personData;
    } catch (error) {
        console.error('Error fetching person data:', error.message);
        throw error;
    }
};

module.exports = {
    getPersonFromAPI
}; 