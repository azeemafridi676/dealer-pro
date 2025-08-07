const asyncHandler = require('express-async-handler');
const { generateId } = require('../utils/generateIdUtil');
const Customer = require('../models/CustomerModel');
const mongoose = require('mongoose');
const { getPersonFromAPI } = require('../services/personService');

const getAllCustomers = async (req, res) => {
    try {
        // Get pagination parameters from query
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        
        // Get filter parameters
        const searchTerm = req.query.searchTerm || '';
        const statusAdv = req.query.statusAdv || '';
        const typeAdv = req.query.typeAdv || '';
        const fromDate = req.query.fromDate || '';
        const toDate = req.query.toDate || '';
        
        // Build filter query
        const filter = {};
        
        if (searchTerm) {
            filter.$or = [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
                { address: { $regex: searchTerm, $options: 'i' } }
            ];
        }
        
        if (statusAdv) {
            filter.status = statusAdv;
        }
        
        if (typeAdv) {
            filter.type = typeAdv;
        }
        
        if (fromDate && toDate) {
            filter.latestPurchase = { $gte: fromDate, $lte: toDate };
        } else if (fromDate) {
            filter.latestPurchase = { $gte: fromDate };
        } else if (toDate) {
            filter.latestPurchase = { $lte: toDate };
        }

        // Get total count for pagination
        const totalItems = await Customer.countDocuments(filter);
        
        // Fetch customers with pagination
        const customers = await Customer.find(filter)
            .skip(startIndex)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();
        
        // Calculate stats
        const privateCustomers = await Customer.countDocuments({ 
            $or: [
                { type: 'Private Individual' },
                { type: 'Private' }
            ]
        });
        const companyCustomers = await Customer.countDocuments({ 
            $or: [
                { type: 'Company' },
                { type: 'Business' }
            ]
        });
        
        // Count agreements by type (assuming agreement type is stored in the customer document)
        const purchaseAgreements = await Customer.countDocuments({ agreementType: 'Purchase' });
        const salesAgreements = await Customer.countDocuments({ agreementType: 'Sale' });
        const otherAgreements = await Customer.countDocuments({ 
            agreementType: { $nin: ['Purchase', 'Sale', null] } 
        });
        console.log("customers", customers);
        
        res.status(200).json({ 
            success: true, 
            data: customers,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            stats: {
                privateCustomers,
                companyCustomers,
                totalCustomers: totalItems,
                purchaseAgreements,
                salesAgreements,
                otherAgreements
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createCustomer = async (req, res) => {
    try {
        const { 
            name, 
            email, 
            telephone, 
            address, 
            type, 
            socialSecurityNumber,
            organizationNumber,
            companyName,
            postalCode,
            location
        } = req.body;
        console.log("type", type)
        const { corp_id, id: user_id } = req.user;

        // Normalize customer type
        const normalizedType = 
            type === 'Company' || type === 'Private Individual' ? type :
            type === 'Business' ? 'Company' : 
            type === 'Private' ? 'Private Individual' : 
            type;

        // Validate required fields based on customer type
        if (!name || !email || !telephone || !address) {
            return res.status(400).json({ success: false, message: 'Please provide all required customer details' });
        }

        // Additional validation based on customer type
        if (normalizedType === 'Company' && !organizationNumber) {
            return res.status(400).json({ success: false, message: 'Organization number is required for company customers' });
        }

        if (normalizedType === 'Private Individual' && !socialSecurityNumber) {
            return res.status(400).json({ success: false, message: 'Social security number is required for private individual customers' });
        }

        // Check if customer with this email already exists
        const existingCustomer = await Customer.findOne({ email });
        if (existingCustomer) {
            return res.status(400).json({ success: false, message: 'A customer with this email already exists' });
        }

        // Create new customer
        const customer = await Customer.create({
            customer_id: generateId(),
            corp_id,
            user_id,
            name,
            email,
            telephone,
            address,
            customerType: normalizedType,
            type: normalizedType,
            status: "Active",
            ...(organizationNumber && { organizationNumber }),
            ...(companyName && { companyName }),
            ...(socialSecurityNumber && { socialSecurityNumber }),
            ...(postalCode && { postalCode }),
            ...(location && { location })
        });

        // If successful, return customer data
        res.status(201).json({ 
            success: true, 
            data: customer,
            message: 'Customer created successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        // Find and delete the customer
        const customer = await Customer.findOneAndDelete({ _id : customerId });

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Customer deleted successfully',
            data: customer 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const { customerNumber } = req.params;
        console.log("customerNumber", customerNumber);
        // Validate MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(customerNumber)) {
            console.log("Invalid customer number format");
            return res.status(400).json({
                success: false,
                message: 'Invalid customer number format'
            });
        }

        // Find customer by customer_id
        const customer = await Customer.findOne({ 
            _id: customerNumber 
        }).lean();
        console.log("customer", customer);
        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // Remove sensitive or unnecessary fields
        const { 
            _id, 
            customer_id, 
            corp_id, 
            user_id, 
            ...customerData 
        } = customer;
        console.log("customerData", customerData);
        res.status(200).json({ 
            success: true, 
            data: {
                ...customerData,
                customer_id: customer_id.toString()
            }
        });
    } catch (error) {
        console.log("error", error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
};

const updateCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const { 
            name, 
            email, 
            telephone, 
            address, 
            type, 
            status,
            socialSecurityNumber,
            postalCode,
            location
        } = req.body;

        // Normalize customer type
        const normalizedType = 
            type === 'Company' || type === 'Private Individual' ? type :
            type === 'Business' ? 'Company' : 
            type === 'Private' ? 'Private Individual' : 
            type;

        // Validate required fields based on customer type
        if (!name || !email || !telephone || !address) {
            return res.status(400).json({ success: false, message: 'Please provide all required customer details' });
        }

        // Additional validation based on customer type
        if (normalizedType === 'Company' && !organizationNumber) {
            return res.status(400).json({ success: false, message: 'Organization number is required for company customers' });
        }

        if (normalizedType === 'Private Individual' && !socialSecurityNumber) {
            return res.status(400).json({ success: false, message: 'Social security number is required for private individual customers' });
        }

        // Find and update the customer
        const customer = await Customer.findOneAndUpdate(
            { customer_id: customerId },
            {
                name,
                email,
                telephone,
                address,
                type: normalizedType,
                customerType: normalizedType,
                status,
                socialSecurityNumber,
                ...(postalCode && { postalCode }),
                ...(location && { location })
            },
            { 
                new: true,  // Return the updated document
                runValidators: true  // Run model validation
            }
        );

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.status(200).json({ 
            success: true, 
            data: customer,
            message: 'Customer updated successfully' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const searchPerson = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber === null || phoneNumber === "") {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    try {
        // Get from API
        const personData = await getPersonFromAPI(phoneNumber);
        if (!personData) {
            return res.status(404).json({ success: false, message: 'Person not found' });
        }

        return res.status(200).json({ success: true, data: personData });
    } catch (error) {
        console.error('Error searching person:', error);
        return res.status(500).json({ success: false, message: 'Failed to search person' });
    }
});

const searchCustomerByNumber = asyncHandler(async (req, res) => {
    const { customerNumber } = req.query;
    const expectedCustomerType = req.query.customerType;

    if (!customerNumber) {
        return res.status(400).json({ 
            success: false, 
            message: 'Customer number is required' 
        });
    }

    try {
        // Find customer by customer number
        const customer = await Customer.findOne({ 
            _id: customerNumber,
            corp_id: req.user.corp_id 
        }).lean();

        if (!customer) {
            return res.status(404).json({ 
                success: false, 
                message: 'Customer not found' 
            });
        }

        // If expected customer type is provided, validate it
        if (expectedCustomerType && customer.customerType !== expectedCustomerType) {
            return res.status(400).json({ 
                success: false, 
                message: `Invalid customer type. Expected ${expectedCustomerType}, but found ${customer.customerType}` 
            });
        }

        // Remove sensitive or unnecessary fields
        const { 
            _id, 
            corp_id, 
            user_id, 
            ...customerData 
        } = customer;

        res.status(200).json({ 
            success: true, 
            data: {
                ...customerData,
                customer_id: customer.customer_id
            }
        });
    } catch (error) {
        console.error('Error searching customer by number:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to search customer' 
        });
    }
});

const getCustomersByType = asyncHandler(async (req, res) => {
    try {
        const { customerType } = req.query;

        // Validate customer type
        if (!customerType || !['Private Individual', 'Company'].includes(customerType)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid customer type. Must be "Private Individual" or "Company".' 
            });
        }

        // Count customers of the specified type for the current corporation
        const totalCustomers = await Customer.countDocuments({ 
            corp_id: req.user.corp_id,
            customerType: customerType 
        });

        // Return boolean indicating if customers exist
        res.status(200).json({ 
            success: true, 
            hasCustomers: totalCustomers > 0,
            totalCustomers
        });
    } catch (error) {
        console.error('Error checking customers by type:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to check customers by type',
            error: error.message 
        });
    }
});

module.exports = { 
    getAllCustomers,
    createCustomer,
    deleteCustomer,
    getCustomerById,
    updateCustomer,
    searchPerson,
    searchCustomerByNumber,
    getCustomersByType
};
