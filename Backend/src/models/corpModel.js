const mongoose = require('mongoose');
const { Schema } = mongoose;

const corpSchema = new Schema({
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  corp_name: {
    type: String,
    required: true
  },
  corp_active: {
    type: Boolean,
    default: true
  },
  logo: {
    type: String,  // Store the logo URL/path
    default: null
  },
  allowed_resources: {
    type: [String],
    default: []
  }
}, {
  timestamps: true,
  collection: 'corp'
});

// Create indexes
corpSchema.index({ corp_id: 1 }, { unique: true });

const Corp = mongoose.model('Corp', corpSchema);

module.exports = Corp; 