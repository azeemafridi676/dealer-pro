const { ApiCache } = require('../models/apiCacheModel');

const getOrgFromCache = async (legalId) => {
    try {
        if (!legalId) return null;
        const orgCache = await ApiCache.findOne({ [`org.legalId`]: legalId.toUpperCase() });
        return orgCache && orgCache.org ? orgCache.org : null;
    } catch (error) {
        console.error('Error fetching org from cache:', error.message);
        throw error;
    }
};

const saveOrgToCache = async (legalId, orgData) => {
    try {
        if (!legalId || !orgData) return null;
        // Upsert by org.legalId
        const updated = await ApiCache.findOneAndUpdate(
            { [`org.legalId`]: legalId.toUpperCase() },
            { org: { ...orgData, legalId: legalId.toUpperCase() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return updated;
    } catch (error) {
        console.error('Error saving org to cache:', error.message);
        throw error;
    }
};

const getVehicleFromCache = async (vehicleId) => {
    try {
        if (!vehicleId) return null;
        const vehicleCache = await ApiCache.findOne({ [`vehicle.vehicleId`]: vehicleId.toUpperCase() });
        return vehicleCache && vehicleCache.vehicle ? vehicleCache.vehicle : null;
    } catch (error) {
        console.error('Error fetching vehicle from cache:', error.message);
        throw error;
    }
};

const saveVehicleToCache = async (vehicleId, vehicleData) => {
    try {
        if (!vehicleId || !vehicleData) return null;
        // Upsert by vehicle.vehicleId
        const updated = await ApiCache.findOneAndUpdate(
            { [`vehicle.vehicleId`]: vehicleId.toUpperCase() },
            { vehicle: { ...vehicleData, vehicleId: vehicleId.toUpperCase() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return updated;
    } catch (error) {
        console.error('Error saving vehicle to cache:', error.message);
        throw error;
    }
};

const getPersonFromCache = async (personalId) => {
    try {
        if (!personalId) return null;
        const personCache = await ApiCache.findOne({ [`person.personalId`]: personalId });
        return personCache && personCache.person ? personCache.person : null;
    } catch (error) {
        console.error('Error fetching person from cache:', error.message);
        throw error;
    }
};

const savePersonToCache = async (personalId, personData) => {
    try {
        if (!personalId || !personData) return null;
        // Upsert by person.personalId
        const updated = await ApiCache.findOneAndUpdate(
            { [`person.personalId`]: personalId },
            { person: { ...personData, personalId } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return updated;
    } catch (error) {
        console.error('Error saving person to cache:', error.message);
        throw error;
    }
};

module.exports = {
    getOrgFromCache,
    saveOrgToCache,
    getVehicleFromCache,
    saveVehicleToCache,
    getPersonFromCache,
    savePersonToCache
};
