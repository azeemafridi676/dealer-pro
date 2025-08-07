const asyncHandler = require('express-async-handler');
const { Swish } = require('../models/swishModel');
const Receipt = require('../models/receiptModel');
const Customer = require('../models/CustomerModel');
const { generateId } = require('../utils/generateIdUtil');
const mongoose = require('mongoose');

// @desc    Create a new Swish payment
// @route   POST /api/swish
// @access  Private
const createSwishPayment = asyncHandler(async (req, res) => {
    const { 
        reference, 
        name, 
        category, 
        amounts, 
        socialSecurityNumber, 
        telephoneNumber, 
        email, 
        address, 
        description 
    } = req.body;
    console.log("req.body", req.body)
    // Remove customer lookup by reference
    // Calculate total amount
    const totalAmount = amounts.reduce((sum, item) => sum + item.amount, 0);

    // Create Receipt (without customer linkage)
    const receipt = await Receipt.create({
        receipt_id: new mongoose.Types.ObjectId(),
        corp_id: req.user.corp_id,
        created_by: req.user._id,
        // customer: undefined, // No customer linkage
        organization: req.user.corp_id,
        receiptNumber: `RCP-${Date.now()}`,
        receiptDate: new Date(),
        articles: amounts.map(amount => ({
            description: amount.description || 'Swish Payment',
            price: amount.amount,
            number: 1
        })),
        invoiceItems: [
            {
                product: 'Swish Payment',
                number: 1,
                unit: 'st',
                priceExclVAT: totalAmount,
                vatRate: 0.25,
                amount: totalAmount * 1.25
            }
        ],
        subtotal: totalAmount,
        moms: totalAmount * 0.25,
        totally: totalAmount * 1.25,
        customerNumber: reference || 'N/A',
        customerType: 'Private',
        organizationNumber: '000000-0000',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        isReference: reference,
        contactPerson: name,
        email: email,
        telephoneNumber: telephoneNumber,
        businessDescription: '',
        businessCategory: '',
        legalForm: '',
        vatNumber: '',
        website: '',
        language: 'English',
        currency: 'SEK',
        invoiceStatus: 'PENDING'
    });

    // Create Swish payment (no customer_id linkage)
    const swishPayment = await Swish.create({
        swish_id: generateId(),
        corp_id: req.user.corp_id,
        user_id: req.user._id,
        // customer_id: undefined, // No customer linkage
        receipt_id: receipt._id, // Link receipt to Swish payment
        reference,
        name,
        category,
        amounts,
        socialSecurityNumber,
        telephoneNumber,
        email,
        address,
        description,
        totalAmount,
        status: 'PENDING'
    });

    res.status(201).json({
        success: true,
        data: {
            swishPayment,
            receipt
        },
        message: 'Swish payment and receipt created successfully'
    });
});

// @desc    Get Swish payments
// @route   GET /api/swish
// @access  Private
const getSwishPayments = asyncHandler(async (req, res) => {
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Build filter query
    const filter = { corp_id: req.user.corp_id };

    // Search term filter
    if (req.query.searchTerm) {
        const searchTerm = req.query.searchTerm.toString();
        filter.$or = [
            { reference: { $regex: searchTerm, $options: 'i' } },
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    // Category filter
    if (req.query.category) {
        filter.category = req.query.category;
    }

    // Status filter
    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Date range filter
    if (req.query.fromDate || req.query.toDate) {
        filter.date = {};
        if (req.query.fromDate) filter.date.$gte = new Date(req.query.fromDate);
        if (req.query.toDate) filter.date.$lte = new Date(req.query.toDate);
    }

    // Amount range filter
    if (req.query.minAmount || req.query.maxAmount) {
        filter.totalAmount = {};
        if (req.query.minAmount) filter.totalAmount.$gte = parseFloat(req.query.minAmount);
        if (req.query.maxAmount) filter.totalAmount.$lte = parseFloat(req.query.maxAmount);
    }

    // Get total count for pagination
    const totalItems = await Swish.countDocuments(filter);

    // Fetch Swish payments with pagination and populate receipt
    const swishPayments = await Swish.find(filter)
        .populate('receipt_id', 'receiptNumber receiptDate subtotal moms totally')
        .skip(startIndex)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
    console.log("swishPayments", swishPayments)
    // Calculate statistics
    const totalPayments = await Swish.countDocuments({ 
        corp_id: req.user.corp_id 
    });

    const averagePaymentAmount = await Swish.aggregate([
        { $match: { corp_id: req.user.corp_id } },
        { 
            $group: { 
                _id: null, 
                averageAmount: { $avg: '$totalAmount' } 
            } 
        }
    ]);

    const statusCounts = await Swish.aggregate([
        { $match: { corp_id: req.user.corp_id } },
        { 
            $group: { 
                _id: '$status', 
                count: { $sum: 1 } 
            } 
        }
    ]);

    // Convert statusCounts to an object for easy access
    const statusCountsObj = statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
    }, {});

    res.status(200).json({
        success: true,
        data: swishPayments,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        stats: {
            totalPayments,
            averagePaymentAmount: averagePaymentAmount[0]?.averageAmount || 0,
            statusCounts: {
                COMPLETED: statusCountsObj.COMPLETED || 0,
                PENDING: statusCountsObj.PENDING || 0,
                FAILED: statusCountsObj.FAILED || 0
            }
        }
    });
});

// @desc    Delete a Swish payment
// @route   DELETE /api/swish/:swishId
// @access  Private
const deleteSwishPayment = asyncHandler(async (req, res) => {
    const { swishId } = req.params;

    // Find the Swish payment
    const swishPayment = await Swish.findOne({ 
        swish_id: swishId,
        corp_id: req.user.corp_id 
    });

    if (!swishPayment) {
        return res.status(404).json({ 
            success: false, 
            message: 'Swish payment not found' 
        });
    }

    // Delete the Swish payment (do not delete the receipt)
    await Swish.deleteOne({ swish_id: swishId });

    res.status(200).json({ 
        success: true, 
        message: 'Swish payment deleted successfully',
        data: swishPayment 
    });
});

module.exports = {
    createSwishPayment,
    getSwishPayments,
    deleteSwishPayment
};
