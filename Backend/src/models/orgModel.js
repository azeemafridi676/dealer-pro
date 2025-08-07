const mongoose = require('mongoose');
const { Schema } = mongoose;

const addressSchema = new Schema({
  _type: String,
  kind: String,
  country: String,
  street: String,
  number: String,
  numberSuffix: String,
  zip: String,
  city: String,
  county: String,
  municipality: String
});

const boardMemberSchema = new Schema({
  name: String,
  legalId: String,
  roles: [String],
  partyId: String
});

const financialStatementSchema = new Schema({
  period: String,
  durationMonths: Number,
  equityRatio: String,
  liquidityRatio: String,
  returnOnEquity: String,
  returnOnAssets: String,
  debtRatio: String,
  profitMargin: String,
  totalTurnover: String,
  yearResult: String
});

const orgSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Corp'
  },
  _type: {
    type: String,
    default: 'SE_ORG'
  },
  country: {
    type: String,
    required: true
  },
  legalId: {
    type: String,
    required: true
  },
  addresses: [addressSchema],
  urls: [String],
  emails: [String],
  phones: [String],
  orgName: {
    name: String,
    rawName: String
  },
  lifecycle: {
    status: {
      value: String,
      validFrom: Date
    },
    establishedInYear: Number,
    establishedOn: Date
  },
  businessActivity: String,
  primaryBusinessCategory: {
    code: String,
    description: String
  },
  otherBusinessCategories: [{
    code: String,
    description: String
  }],
  legalForm: {
    code: String,
    name: String
  },
  boardMembers: [boardMemberSchema],
  headquarter: {
    cfar: String,
    partyId: String
  },
  taxInfo: {
    vatNumber: String,
    fskattPayer: Boolean,
    vatPayer: Boolean,
    employer: Boolean
  },
  legalInfo: {
    companySignatory: Boolean,
    signatureText: String
  },
  company_email: {
    type: String,
    required: true
  },
  company_phone: {
    type: String,
    required: true
  },
  contactInfo: {
    name: String,
    legalId: String,
    partyId: String
  },
  financials: {
    stockExchangeListed: Boolean,
    shareCapital: String,
    financialStatements: [financialStatementSchema],
    turnoverGroup: String
  },
  manpower: {
    minNrOfEmployeesHQ: Number,
    maxNrOfEmployeesHQ: Number,
    minNrOfEmployeesOrg: Number,
    maxNrOfEmployeesOrg: Number,
    nrOfEmployeesOrg: Number
  }
}, {
  timestamps: true,
  collection: 'organizations'
});

// Create indexes
orgSchema.index({ user_id: 1 });
orgSchema.index({ corp_id: 1 });
orgSchema.index({ legalId: 1 }, { unique: true });
orgSchema.index({ 'orgName.name': 1 });

const Org = mongoose.model('Org', orgSchema);

module.exports = Org;
