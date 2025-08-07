const mongoose = require('mongoose');
const { Schema } = mongoose;

// Vehicle Status Enum
const VehicleStatus = {
  STOCK: 'STOCK',
  SOLD: 'SOLD',
  CONSIGNMENT: 'CONSIGNMENT'
};

// Vehicle Status Display Names
const VehicleStatusDisplay = {
  [VehicleStatus.STOCK]: 'Stock',
  [VehicleStatus.SOLD]: 'Sold',
  [VehicleStatus.CONSIGNMENT]: 'Consignment'
};

const OutlaySchema = new Schema({
  name: { type: String },
  sellerName: { type: String },
  organizationNumber: { type: String },
  address: { type: String },
  location: { type: String },
  postNumber: { type: String },
  telephoneNumber: { type: String },
  registrationNumber: { type: String },
  amount: { type: Number },
  date: { type: Date },
  description: { type: String },
  price: { type: Number },
  vat: { type: Number }
}, { _id: false });

const MediaSchema = new Schema({
  name: { type: String },
  url: { type: String },
  type: { type: String },
  size: { type: Number },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date },
  datetime: { type: String },
  created_by: { type: String },
  referance_resource: { type: String }
}, { _id: false });

const NotesSchema = new Schema({
  content: { type: String },
  title: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date },
  lastModified: { type: Date },
  isPrivate: { type: Boolean },
  referance_resource: { type: String }
}, { _id: true });

const VehicleSchema = new Schema({
  vehicleId: { type: String },
  corp_id: { type: Schema.Types.ObjectId, ref: 'Corp', required: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  _type: { type: String },
  id: { type: String },
  country: { type: String },
  legalId: { type: String },
  registrationData: {
    registrationNumber: { type: String },
    registeredOn: { type: Date }
  },
  detail: {
    vehicleType: { type: String },
    vehicleCategory: { type: String },
    vehicleBrand: { type: String },
    vehicleModel: { type: String },
    color: { type: String },
    chassisNumber: { type: String },
    registrationDate: { type: Date },
    registrationNumberReused: { type: Boolean },
    vehicleImpactClass: { type: String },
    vehicleBrandRaw: { type: String },
    vehicleModelRaw: { type: String },
    vehicleYear: { type: String }
  },
  ownerInfo: {
    identityNumber: { type: String },
    acquisitionDate: { type: Date },
    organization: { type: Boolean },
    numberOfUsers: { type: Number },
    previousUserIdentityNumber: { type: String },
    previousUserAcquisitionDate: { type: Date },
    beforePreviousUserIdentityNumber: { type: String },
    beforePreviousUserAcquisitionDate: { type: Date },
    owner: { type: String },
    ownerAcquisitionDate: { type: Date },
    userReference: {
      _type: { type: String },
      id: { type: String },
      country: { type: String },
      addresses: { type: [Object], default: [] }
    },
    ownerReference: {
      _type: { type: String },
      id: { type: String },
      country: { type: String },
      addresses: { type: [Object], default: [] }
    }
  },
  status: {
    registrationType: { type: String },
    date: { type: Date },
    leased: { type: Boolean },
    methodsOfUse: { type: [String], default: [] },
    creditPurchase: { type: Boolean },
    code: { type: String },
    insuranceType: { type: String }
  },
  origin: {
    importerId: { type: String },
    preRegistrationDate: { type: Date },
    directImport: { type: Boolean }
  },
  technicalData: {
    variant: { type: String },
    version: { type: String },
    type: { type: String },
    bodyCode1: { type: String },
    nrOfPassengers: { type: Number },
    eeg: { type: String },
    cylinderVolume: { type: Number },
    gearbox: { type: String },
    couplingDevices: { type: [String], default: [] },
    serviceWeight: { type: Number },
    vehicleTypeWeight: { type: Number },
    totalWeight: { type: Number },
    allWheelDrive: { type: Boolean },
    maxSpeed: { type: String },
    fuelCodes: { type: [String], default: [] }
  },
  equipment: { type: [Object], default: [] },
  environmental: {
    environmentalClassEuro: { type: String },
    emissionClass: { type: String },
    superGreenCar: { type: Boolean }
  },
  inspection: {
    inspectionDate: { type: Date },
    inspectionDateUpToAndIncluding: { type: Date },
    mileage: { type: Number },
    inspectionStation: { type: String }
  },
  media: [MediaSchema],
  notes: [NotesSchema],
  outlay: [OutlaySchema],
  // Agreement history: array of agreement info objects (purchase, sales, etc)
  agreementHistory: [{
    agreement_id: { type: String },
    agreementType: { type: String },
    buyerName: { type: String },
    basePrice: { type: Number },
    purchasePrice: { type: Number },
    vatStatus: { type: String },
    creditLeasing: { type: String },
    deck: { type: String },
    deliveryTerms: { type: String },
    deliveryLocation: { type: String },
    inspectionDate: { type: Date }
  }],
}, {
  timestamps: true,
  collection: 'vehicles'
});

VehicleSchema.index({ 'registrationData.registrationNumber': 1, corp_id: 1 }, { unique: true });
VehicleSchema.index({ corp_id: 1 });
VehicleSchema.index({ created_by: 1 });

// Ensure legalId is always uppercase on save, update, and find
function toUpperLegalId(val) {
  if (typeof val === 'string') return val.toUpperCase();
  return val;
}

// Pre-save hook
VehicleSchema.pre('save', function (next) {
  if (this.legalId) {
    this.legalId = toUpperLegalId(this.legalId);
  }
  next();
});

// Pre-update hooks
VehicleSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  if (this._update && this._update.legalId) {
    this._update.legalId = toUpperLegalId(this._update.legalId);
  }
  next();
});

// Pre-find hooks (for queries with legalId in filter)
VehicleSchema.pre(['find', 'findOne'], function (next) {
  if (this.getQuery().legalId) {
    this.setQuery({
      ...this.getQuery(),
      legalId: toUpperLegalId(this.getQuery().legalId)
    });
  }
  next();
});

const Vehicle = mongoose.model('Vehicle', VehicleSchema);

module.exports = {
  Vehicle,
  VehicleStatus,
  VehicleStatusDisplay
};
