const axios = require('axios');
const { getValitiveToken } = require('./valitiveAuthService');
const { getVehicleFromCache, saveVehicleToCache } = require('./cachingService');

const getVehicleFromAPI = async (vehicleId) => {
    try {
        vehicleId = vehicleId?.toUpperCase();
        // const dataPath = path.join(__dirname, '../dummyData/vehicleData.json');
        // const rawData = await fs.readFile(dataPath, 'utf8');
        // const data = JSON.parse(rawData);
        // console.log('>>>>data', data.results.map(v => v.detail.vehicleBrandRaw));
        // // Find vehicle by legalId (simulating API search)
        // const vehicle = data.results.find(v => v.legalId === vehicleId);
        // console.log('>>>>vehicle', vehicle.detail.vehicleBrandRaw);
        // return vehicle || null;

        // Try cache first
        const cached = await getVehicleFromCache(vehicleId);
        if (cached && cached.results && cached.results.length > 0) {
            return cached.results[0];
        }
        // Real API implementation
        const token = await getValitiveToken();
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
                    "partyType": "VEHICLE",
                    "country": "SE",
                    "legalIds": [vehicleId]
                },
                "dataClasses": [
                    "V1_0_BASIC",
                    "V1_1_GENERAL",
                    "V2_0_OWNER_BASIC",
                    "V2_1_OWNER_GENERAL",
                    "V3_0_STATUS",
                    "V4_0_ORIGIN",
                    "V5_0_TECH_SPEC_BASIC",
                    "V6_0_ENVIRONMENTAL"
                ],
                "frame": {
                    "startIndex": 0,
                    "count": 1
                }
            }
        });
        const vehicleData = response.data.results[0] || null;

        if (vehicleData) {
            await saveVehicleToCache(vehicleId, { results: [vehicleData], startIndex: 0, endIndex: 1, total: 1 });
        }
        return vehicleData;
    } catch (error) {
        console.error('Error fetching vehicle data:', error.message);
        throw error;
    }
};

module.exports = {
    getVehicleFromAPI
};
