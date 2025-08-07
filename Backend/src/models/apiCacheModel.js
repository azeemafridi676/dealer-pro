const mongoose = require('mongoose');
const { Schema } = mongoose;

const ApiCacheSchema = new Schema({
  org: { type: Schema.Types.Mixed },
  vehicle: { type: Schema.Types.Mixed },
  person: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'api_cache'
});

const ApiCache = mongoose.model('ApiCache', ApiCacheSchema);

module.exports = {
  ApiCache
};