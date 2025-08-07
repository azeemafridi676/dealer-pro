const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define payment categories enum
const PaymentCategory = {
  DIRECT_DEBIT: 'Direct Debit',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT_CARD: 'Credit Card',
  CASH: 'Cash',
  SWISH: 'Swish',
  INVOICE: 'Invoice',
  OTHER: 'Other'
};

const AmountItemSchema = new Schema({
  amount: { type: Number, required: true },
  description: { type: String }
}, { _id: false });

const SwishSchema = new Schema({
  swish_id: { type: String, required: true, unique: true },
  corp_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Corp' },
  user_id: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  receipt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Receipt' },
  reference: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  amounts: { type: [AmountItemSchema], required: true },
  socialSecurityNumber: { type: String, required: true },
  telephoneNumber: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },
  description: { type: String },
  totalAmount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' }
}, {
  timestamps: true,
  collection: 'swish_payments'
});

SwishSchema.index({ corp_id: 1 });
SwishSchema.index({ user_id: 1 });
SwishSchema.index({ customer_id: 1 });
SwishSchema.index({ receipt_id: 1 });

const Swish = mongoose.model('Swish', SwishSchema);

module.exports = {
  Swish,
  PaymentCategory
}; 