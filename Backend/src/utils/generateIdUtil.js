const mongoose = require('mongoose');

const generateId = () => {
    // Generate a new MongoDB ObjectId
    const objectId = new mongoose.Types.ObjectId();
    return objectId;
};

module.exports = {
    generateId
}; 