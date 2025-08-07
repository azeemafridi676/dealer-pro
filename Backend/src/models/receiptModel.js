const mongoose = require('mongoose');
const { Schema } = mongoose;

const ArticleSchema = new Schema({
  description: { type: String, default: 'N/A' },
  price: { type: Number, default: 0 },
  number: { type: Number, default: 1 }
}, { _id: false });

const InvoiceItemSchema = new Schema({
  product: { 
    type: String, 
    required: [true, 'Product name is required'],
    minlength: [2, 'Product name must be at least 2 characters long']
  },
  number: { 
    type: Number, 
    default: 1,
    min: [1, 'Number must be at least 1'],
    max: [1000, 'Number cannot exceed 1000']
  },
  unit: { 
    type: String, 
    default: 'st' 
  },
  priceExclVAT: { 
    type: Number, 
    default: 0,
    min: [0, 'Price must be non-negative'],
    max: [1000000, 'Price is too high']
  },
  vatRate: { 
    type: Number, 
    default: 0.25,
    enum: [0, 0.06, 0.12, 0.25]
  },
  amount: { 
    type: Number, 
    default: 0 
  }
}, { _id: false });

const ReceiptSchema = new Schema({
  receipt_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Receipt ID is required']
  },
  corp_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Corporation ID is required'],
    ref: 'Corp'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Creator ID is required'],
    ref: 'User'
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Org',
    default: null
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  receiptNumber: {
    type: String,
    required: [true, 'Receipt number is required'],
    unique: true
  },
  receiptDate: {
    type: Date,
    required: [true, 'Receipt date is required'],
    default: Date.now
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  articles: [ArticleSchema],
  invoiceItems: {
    type: [InvoiceItemSchema],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one invoice item is required'
    }
  },
  subtotal: { 
    type: Number, 
    default: 0,
    min: [0, 'Subtotal must be non-negative']
  },
  moms: { 
    type: Number, 
    default: 0,
    min: [0, 'VAT amount must be non-negative']
  },
  totally: { 
    type: Number, 
    default: 0,
    min: [0, 'Total amount must be non-negative']
  },

  // Customer-related fields
  customerNumber: { 
    type: String, 
    required: function() { 
      return this.customerType === 'Private Individual'; 
    }
  },
  customerType: { 
    type: String, 
    required: [true, 'Customer type is required'],
    enum: ['Private Individual', 'Company']
  },
  organizationNumber: { 
    type: String, 
  },
  dueDate: { 
    type: Date, 
    required: [true, 'Due date is required']
  },
  isReference: { 
    type: String, 
    default: 'N/A' 
  },
  contactPerson: { 
    type: String
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    maxlength: [100, 'Email cannot exceed 100 characters'],
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format']
  },
  telephoneNumber: { 
    type: String
  },
  
  // Additional organization details
  businessDescription: { 
    type: String, 
    maxlength: [500, 'Business description cannot exceed 500 characters']
  },
  businessCategory: { 
    type: String 
  },
  legalForm: { 
    type: String 
  },
  vatNumber: { 
    type: String,
    match: [/^(SE)?[0-9]{12}$/, 'Invalid VAT number format']
  },
  website: { 
    type: String,
    validate: {
      validator: function(v) {
        // If website is empty or 'N/A', return true
        if (!v || v === 'N/A') return true;
        
        // Otherwise, use the existing regex
        return /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(v);
      },
      message: 'Invalid website URL'
    }
  },

  // Invoice details
  language: { 
    type: String, 
    default: 'English',
    enum: ['English', 'Swedish', 'Other']
  },
  currency: { 
    type: String, 
    default: 'SEK',
    enum: ['SEK', 'USD', 'EUR']
  },

  // Add this near the top of the schema definition, after other fields
  invoiceStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'OVERDUE'],
    default: 'PENDING',
    required: true
  },
}, {
  timestamps: true,
  collection: 'receipts'
});

// Indexes
ReceiptSchema.index({ receipt_id: 1 }, { unique: true });
ReceiptSchema.index({ corp_id: 1 });
ReceiptSchema.index({ created_by: 1 });
ReceiptSchema.index({ customerNumber: 1 });
ReceiptSchema.index({ organizationNumber: 1 });
ReceiptSchema.index({ organization: 1 });
ReceiptSchema.index({ customer: 1 });

const Receipt = mongoose.model('Receipt', ReceiptSchema);

module.exports = Receipt; 