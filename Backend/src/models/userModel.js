const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Corp'
  },
  corp_name: {
    type: String
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Role'
  },
  first: {
    type: String
  },
  last: {
    type: String
  },
  email: {
    type: String
  },
  phone: {
    type: String
  },
  profileImage: {
    type: String,
    default: null
  },
  password: {
    type: String
  },
  type: {
    type: String
  },
  active: {
    type: Boolean,
    default: true
  },
  two_factor_enabled: {
    type: Boolean,
    default: true
  },
  reset_token: {
    type: String
  },
  reset_token_expires: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Create indexes
userSchema.index({ id: 1 }, { unique: true });
userSchema.index({ corp_id: 1 });
userSchema.index({ role_id: 1 });
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User; 