const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerSchema = new Schema({
  customer_id: {
    type: String
  },
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Corp'
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  name: {
    type: String,
    required: true
  },
  telephone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  agreementType: {
    type: String,
    default: "N/A"
  },
  customerType: {
    type: String,
    enum: ['Private Individual', 'Company'],
    required: true
  },
  person_details: {
    type: Object,
  },
  company_details: {
    type: Object,
  },
  
}, {
  timestamps: true,
  collection: 'customers'
});

// Remove previous indexes and add more flexible indexing
CustomerSchema.index({ customer_id: 1 }, { unique: true, sparse: true });
CustomerSchema.index({ corp_id: 1 });
CustomerSchema.index({ user_id: 1 });
CustomerSchema.index({ email: 1 }, { unique: true, sparse: true });

const Customer = mongoose.model('Customer', CustomerSchema);

module.exports = Customer;
