const mongoose = require('mongoose');
const { Schema } = mongoose;

const DocumentSchema = new Schema({
  type: { type: String, default: 'N/A' },
  name: { type: String, default: 'N/A' },
  uploadedAt: { type: Date },
  url: { type: String, default: 'N/A' }
}, { _id: false });

const AgreementSchema = new Schema({
 
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Corp'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  vehicle_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Customer'
  },
  secondary_customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  agreementType: {
    type: String,
    enum: ['Sales', 'Purchase', 'Agency', 'Receipt'],
    required: true
  },
  contractNumber: { type: String, default: "N/A" },

  registrationNumber: { type: String, required: true },
  customerType: {
    type: String,
    enum: ['Company', 'Private Individual'],
    required: true
  },

  organizationNumber: { type: String, default: '' },
  socialSecurityNumber: { type: String, default: '' },

  emailAddress: { type: String, required: true },
  telephoneNumber: { type: String, required: true },

  sales_details: { type: Schema.Types.Mixed, default: null },
  agency_details: { type: Schema.Types.Mixed, default: null },
  purchase_details: { type: Schema.Types.Mixed, default: null },
  receipt_details: { type: Schema.Types.Mixed, default: null },

  documents: [DocumentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Agreement', AgreementSchema);
