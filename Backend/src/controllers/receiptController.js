const asyncHandler = require('express-async-handler');
const Receipt = require('../models/receiptModel');
const Customer = require('../models/CustomerModel');
const Org = require('../models/orgModel');
const { generateId } = require('../utils/generateIdUtil');
const mongoose = require('mongoose');

/**
 * @desc    Create a new invoice
 * @route   POST /api/receipts
 * @access  Private
 */
const createInvoice = asyncHandler(async (req, res) => {
    try {
        const invoiceData = req.body;

        // Validate required fields
        if (!req.user || !req.user.id || !req.user.corp_id) {
            return res.status(400).json({
                success: false,
                message: 'User authentication failed'
            });
        }

        // Add user and corporation context
        invoiceData.created_by = req.user.id;
        invoiceData.corp_id = req.user.corp_id;

        // Generate unique invoice ID and receipt number
        invoiceData.receipt_id = generateId('INV');
        invoiceData.receiptNumber = `REC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

        // Resolve customer reference
        if (invoiceData.customerType === 'Company' && invoiceData.companyName) {
            const customer = await Customer.findOne({ 
                customerType: 'Company',
                'company_details.name': invoiceData.companyName 
            });
            console.log("customer", customer);
            if (!customer) {
                const newCustomer = await Customer.create({
                    user_id: req.user.id,
                    corp_id: req.user.corp_id,
                    name: invoiceData.companyName,
                    telephone: invoiceData.telephoneNumber || '+46000000000',
                    email: invoiceData.email || 'default@example.com',
                    address: invoiceData.address || 'N/A',
                    status: 'Active',
                    customerType: 'Company',
                    company_details: {
                        name: invoiceData.companyName,
                        organizationNumber: invoiceData.organizationNumber,
                        businessCategory: invoiceData.businessCategory,
                        legalForm: invoiceData.legalForm,
                        vatNumber: invoiceData.vatNumber,
                        website: invoiceData.website,
                        businessDescription: invoiceData.businessDescription
                    }
                });

                invoiceData.customer = newCustomer._id;
                invoiceData.customerNumber = newCustomer.customerNumber;
            } else {   
                invoiceData.customer = customer._id;
                invoiceData.customerNumber = customer.customerNumber;
            }
        } else if (invoiceData.customerType === 'Private Individual') {
            // Try to find customer by customerNumber first
            let customer;
            if (invoiceData.customerNumber) {
                customer = await Customer.findById(invoiceData.customerNumber).lean();
            }

            // If no customer found by number, try by name
            if (!customer) {
                customer = await Customer.findOne({ 
                    customerType: 'Private Individual',
                    'person_details.name': invoiceData.customerName 
                }).lean();
            }

            if (!customer) {
                console.log("Invalid customer details", invoiceData);
                return res.status(400).json({
                    success: false,
                    message: 'Customer not found'
                });
            }

            invoiceData.customer = customer._id;
            invoiceData.customerNumber = customer.customerNumber || invoiceData.customerNumber;
        } else {
            console.log("Invalid customer details", invoiceData);
            return res.status(400).json({
                success: false,
                message: 'Invalid customer details'
            });
        }

        // Handle organization for Company type
        if (invoiceData.customerType === 'Company') {
            // Directly store organization details
            invoiceData.organization = null; // Keep the field for potential future use
            invoiceData.organizationNumber = invoiceData.organizationNumber || 'N/A';
            invoiceData.businessCategory = invoiceData.businessCategory || 'N/A';
            invoiceData.legalForm = invoiceData.legalForm || 'N/A';
            invoiceData.vatNumber = invoiceData.vatNumber || 'N/A';
            invoiceData.website = invoiceData.website || 'N/A';
            invoiceData.businessDescription = invoiceData.businessDescription || 'N/A';
            
            // Set customer number to organization number for Company type
            invoiceData.customerNumber = invoiceData.organizationNumber;
        } else {
            // Remove organization-related fields for Private Individual
            delete invoiceData.organization;
            delete invoiceData.organizationNumber;
            delete invoiceData.businessCategory;
            delete invoiceData.legalForm;
            delete invoiceData.vatNumber;
            delete invoiceData.website;
            delete invoiceData.businessDescription;
        }

        // Calculate totals
        const calculateTotals = (items) => {
            let subtotal = 0;
            let moms = 0;

            items.forEach(item => {
                const itemTotal = item.priceExclVAT * item.number;
                subtotal += itemTotal;
                moms += itemTotal * item.vatRate;
            });

            return {
                subtotal,
                moms,
                totally: subtotal + moms
            };
        };

        // Calculate and add totals
        const totals = calculateTotals(invoiceData.invoiceItems);
        invoiceData.subtotal = totals.subtotal;
        invoiceData.moms = totals.moms;
        invoiceData.totally = totals.totally;

        // Ensure invoice items have amount calculated
        invoiceData.invoiceItems = invoiceData.invoiceItems.map(item => ({
            ...item,
            amount: item.priceExclVAT * item.number
        }));
        
        invoiceData.invoiceStatus = 'PENDING';
        // Create the invoice
        const newInvoice = await Receipt.create(invoiceData);

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: newInvoice
        });
    } catch (error) {
        console.error('Invoice creation error:', error);

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate key error. Receipt number or ID already exists.'
            });
        }

        // Generic error handler
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice',
            error: error.message
        });
    }
});

/**
 * @desc    Get invoices
 * @route   GET /api/receipts
 * @access  Private
 */
const getInvoices = asyncHandler(async (req, res) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        // Base filter for corporation
        const filter = { corp_id: req.user.corp_id };

        // Search term filter (broad search across multiple fields)
        if (req.query.searchTerm) {
            const searchTerm = req.query.searchTerm.toString();
            filter.$or = [
                { receiptNumber: { $regex: searchTerm, $options: 'i' } },
                { contactPerson: { $regex: searchTerm, $options: 'i' } },
                { customerNumber: { $regex: searchTerm, $options: 'i' } },
                { organizationNumber: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // Invoice status filter
        if (req.query.invoiceStatus) {
            filter.invoiceStatus = req.query.invoiceStatus;
        }

        // Customer type filter
        if (req.query.customerType) {
            filter.customerType = req.query.customerType;
        }

        // Date range filter
        if (req.query.fromDate || req.query.toDate) {
            filter.receiptDate = {};
            if (req.query.fromDate) filter.receiptDate.$gte = new Date(req.query.fromDate);
            if (req.query.toDate) filter.receiptDate.$lte = new Date(req.query.toDate);
        }

        // Amount range filter
        if (req.query.minAmount || req.query.maxAmount) {
            filter.totally = {};
            if (req.query.minAmount) filter.totally.$gte = parseFloat(req.query.minAmount);
            if (req.query.maxAmount) filter.totally.$lte = parseFloat(req.query.maxAmount);
        }

        // Fetch total items and invoices
        const [totalItems, invoices] = await Promise.all([
            Receipt.countDocuments(filter),
            Receipt.find(filter)
                .populate('organization', 'orgName')
                .populate('customer', 'name')
                .skip(startIndex)
                .limit(limit)
                .sort({ createdAt: -1 })
                .lean()
        ]);

        // Compute stats
        const totalInvoices = await Receipt.countDocuments({ corp_id: req.user.corp_id });
        const totalInvoiceAmount = await Receipt.aggregate([
            { $match: { corp_id: req.user.corp_id } },
            { $group: { _id: null, total: { $sum: '$totally' } } }
        ]);

        const statusCounts = {
            PAID: await Receipt.countDocuments({ ...filter, invoiceStatus: 'PAID' }),
            PENDING: await Receipt.countDocuments({ ...filter, invoiceStatus: 'PENDING' }),
            OVERDUE: await Receipt.countDocuments({ ...filter, invoiceStatus: 'OVERDUE' })
        };

        const customerTypeDistribution = await Receipt.aggregate([
            { $match: { corp_id: req.user.corp_id } },
            { 
                $group: { 
                    _id: '$customerType', 
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$totally' }
                } 
            }
        ]);

        // Transform customer type distribution
        const customerTypeStats = customerTypeDistribution.reduce((acc, item) => {
            acc[item._id] = {
                count: item.count,
                totalAmount: item.totalAmount
            };
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: invoices,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            stats: {
                totalInvoices,
                totalInvoiceAmount: totalInvoiceAmount[0]?.total || 0,
                averageInvoiceAmount: totalInvoiceAmount[0]?.total / totalInvoices || 0,
                statusCounts,
                customerTypeDistribution: customerTypeStats
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invoices',
            error: error.message
        });
    }
});

/**
 * @desc    Delete an invoice
 * @route   DELETE /api/receipts/:invoiceId
 * @access  Private
 */
const deleteInvoice = asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    try {
        // Find the invoice using receipt_id
        const invoice = await Receipt.findOne({ 
            receipt_id: invoiceId,
            corp_id: req.user.corp_id 
        });
        
        if (!invoice) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invoice not found' 
            });
        }

        // Delete the invoice using receipt_id
        await Receipt.deleteOne({ receipt_id: invoiceId });

        res.status(200).json({ 
            success: true, 
            message: 'Invoice deleted successfully',
            data: invoice 
        });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invoice',
            error: error.message
        });
    }
});

/**
 * @desc    Update invoice statuses periodically
 * @route   POST /api/receipts/update-status
 * @access  Private/Admin
 */
const updateInvoiceStatuses = asyncHandler(async (req, res) => {
    try {
        const today = new Date();

        // Update invoices to OVERDUE
        await Receipt.updateMany(
            { 
                corp_id: req.user.corp_id,
                invoiceStatus: 'PENDING', 
                dueDate: { $lt: today },
                totally: 0
            },
            { $set: { invoiceStatus: 'OVERDUE' } }
        );

        // Update invoices to PAID if fully paid
        await Receipt.updateMany(
            { 
                corp_id: req.user.corp_id,
                invoiceStatus: { $ne: 'PAID' },
                totally: { $gt: 0 }
            },
            { $set: { invoiceStatus: 'PAID' } }
        );

        res.status(200).json({
            success: true,
            message: 'Invoice statuses updated successfully'
        });
    } catch (error) {
        console.error('Update invoice statuses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice statuses',
            error: error.message
        });
    }
});

module.exports = {
    createInvoice,
    getInvoices,
    deleteInvoice,
    updateInvoiceStatuses
};
