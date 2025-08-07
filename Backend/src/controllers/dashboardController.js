const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const { Vehicle } = require('../models/vehicleModel');
const Agreement = require('../models/agreementModel');
const Receipt = require('../models/receiptModel');
const Customer = require('../models/CustomerModel');

const getDashboardData = asyncHandler(async (req, res) => {
    try {
        const { corp_id, id: user_id } = req.user;

        // Total Users
        const totalUsers = await User.countDocuments({ corp_id, active: true });
        const activeUsers = await User.countDocuments({ corp_id, active: true });

        // Total Vehicles
        const totalVehicles = await Vehicle.countDocuments({ corp_id });
        const vehicleStatusCounts = await Vehicle.aggregate([
            { $match: { corp_id } },
            { 
                $group: { 
                    _id: '$status.code', 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        // Ensure all status types are represented
        const statusTypes = ['STOCK', 'SOLD', 'CONSIGNMENT'];
        const normalizedStatusCounts = statusTypes.map(status => {
            const found = vehicleStatusCounts.find(item => item._id === status);
            return {
                status,
                count: found ? found.count : 0
            };
        });

        // Total Revenue (from Receipts)
        const totalRevenue = await Receipt.aggregate([
            { $match: { corp_id } },
            { $group: { _id: null, total: { $sum: '$totally' } } }
        ]);

        // Recent Users
        const recentUsers = await User.find({ corp_id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('first last email role active lastLogin');

        // Recent Vehicles
        const recentVehicles = await Vehicle.find({ corp_id })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('legalId detail.modelNumber detail.vehicleBrandRaw detail.vehicleYear status');

        // Recent Agreements
        const recentAgreements = await Agreement.find({ corp_id })
            .sort({ createdAt: -1 })
            .limit(3)


        // Fetch customer names for agreements
        const processedAgreements = await Promise.all(recentAgreements.map(async (agreement) => {

            if (!agreement.customer_id) {
                return {
                    ...agreement.toObject(),
                    customerName: 'N/A'
                };
            }

            try {
                // Use findOne with customer_id field
                const customer = await Customer.findOne({ customer_id: agreement.customer_id });

                return {
                    ...agreement.toObject(),
                    customerName: customer ? customer.name : 'N/A'
                };
            } catch (error) {
                console.error(`Error fetching customer for agreement ${agreement._id}:`, error);
                return {
                    ...agreement.toObject(),
                    customerName: 'N/A'
                };
            }
        }));


        // Recent Receipts
        const recentReceipts = await Receipt.find({ corp_id })
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();

        // Manual customer lookup with detailed logging
        const processedReceipts = await Promise.all(recentReceipts.map(async (receipt) => {
            try {
                // Find customer by customerNumber
                const customer = await Customer.findOne({ 
                    customer_id: receipt.customerNumber 
                }).select('name').lean();
                return {
                    ...receipt,
                    customer: customer || { name: 'N/A' }
                };
            } catch (error) {
                console.error(`Error finding customer for receipt ${receipt.receiptNumber}:`, error);
                return {
                    ...receipt,
                    customer: { name: 'N/A' }
                };
            }
        }));
        
        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                activeUsers,
                totalVehicles,
                vehicleStatusCounts: normalizedStatusCounts,
                totalRevenue: totalRevenue[0]?.total || 0,
                recentUsers,
                recentVehicles,
                recentAgreements: processedAgreements,
                recentReceipts: processedReceipts
            }
        });
    } catch (error) {
        console.error("Dashboard Data Fetch Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

module.exports = {
    getDashboardData
};
