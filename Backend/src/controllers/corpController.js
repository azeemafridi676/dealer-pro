const Corp = require('../models/corpModel');
const Role = require('../models/roleModel');
const User = require('../models/userModel');
const Resource = require('../models/resourceModel');
const Permission = require('../models/permissionModel');
const { generateId } = require('../utils/generateIdUtil');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Org = require('../models/orgModel');
const Theme = require('../models/themeModel');
const {Vehicle} = require('../models/vehicleModel');

// Create a new corporation
const createCorporation = async (req, res) => {
    try {
        const { 
            corp_name,
            allowed_resources,
            admin_email,
            admin_password,
            admin_first_name,
            admin_last_name
        } = req.body;

        // Check if admin email already exists
        const existingUser = await User.findOne({ email: admin_email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Verify if requesting user's corporation has access to these resources
        const requestingUserCorp = await Corp.findOne({ corp_id: req.user.corp_id });
        const invalidResources = allowed_resources.filter(
            resId => !requestingUserCorp.allowed_resources.includes(resId)
        );

        if (invalidResources.length > 0) {
            return res.status(403).json({
                success: false,
                message: 'You cannot assign resources that your corporation does not have access to'
            });
        }

        // Create corporation
        const corp_id = generateId('CORP');
        const newCorp = await Corp.create({
            corp_id,
            corp_name,
            corp_active: true,
            allowed_resources
        });

        // Check if Admin role already exists for this corporation
        let adminRole = await Role.findOne({ 
            corp_id,
            name: 'Admin',
            is_system: true
        });

        // If Admin role doesn't exist, create it
        if (!adminRole) {
            const adminRoleId = generateId('ROLE');
            adminRole = await Role.create({
                role_id: adminRoleId,
                corp_id,
                name: 'Admin',
                description: `Corporation ${corp_name} administrator`,
                is_system: true
            });
        }

        // Create permissions for admin role
        for (const resourceId of allowed_resources) {
            const permissionId = generateId('PERM');
            await Permission.create({
                permission_id: permissionId,
                role_id: adminRole.role_id,
                resource_id: resourceId,
                can_read: true,
                can_create: true,
                can_update: true,
                can_delete: true
            });
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash(admin_password, 10);
        const userId = generateId('USER');
        await User.create({
            id: userId,
            corp_id,
            corp_name,
            role_id: adminRole.role_id,
            first: admin_first_name,
            last: admin_last_name,
            email: admin_email,
            password: hashedPassword,
            type: 'Admin',
            active: true
        });

        res.status(201).json({
            success: true,
            data: newCorp
        });

    } catch (error) {
        console.error('Error creating corporation:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating corporation'
        });
    }
};

// Update corporation
const updateCorporation = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const { corp_id } = req.params;
        const { 
            corp_name, 
            allowed_resources, 
            corp_active,
            street_address,
            registered_city,
            postal_code,
            city,
            company_email,
            company_phone
        } = req.body;

        // If allowed_resources is being updated, verify access
        if (allowed_resources) {
            const requestingUserCorp = await Corp.findOne({ corp_id: req.user.corp_id });
            const invalidResources = allowed_resources.filter(
                resId => !requestingUserCorp.allowed_resources.includes(resId)
            );

            if (invalidResources.length > 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(403).json({
                    success: false,
                    message: 'You cannot assign resources that your corporation does not have access to'
                });
            }
        }

        // Find the corporation
        const corp = await Corp.findOne({ corp_id }).session(session);
        if (!corp) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Update Corporation
        const updatedCorp = await Corp.findOneAndUpdate(
            { corp_id },
            { 
                $set: {
                    corp_name: corp_name || corp.corp_name,
                    allowed_resources: allowed_resources || corp.allowed_resources,
                    corp_active: corp_active !== undefined ? corp_active : corp.corp_active
                }
            },
            { new: true, session }
        );

        // Find or create Organization
        let org = await Org.findOne({ corp_id }).session(session);
        
        if (!org) {
            // If no organization exists, create a new one
            org = await Org.create([{
                corp_id,
                legalId: corp_id,
                orgName: { name: corp_name },
                addresses: [{
                    street: street_address,
                    municipality: registered_city,
                    zip: postal_code,
                    city: city
                }],
                emails: [company_email],
                phones: [company_phone]
            }], { session });
        } else {
            // Update existing organization
            org = await Org.findOneAndUpdate(
                { corp_id },
                {
                    $set: {
                        'orgName.name': corp_name || org.orgName?.name,
                        'addresses.0.street': street_address || org.addresses?.[0]?.street,
                        'addresses.0.municipality': registered_city || org.addresses?.[0]?.municipality,
                        'addresses.0.zip': postal_code || org.addresses?.[0]?.zip,
                        'addresses.0.city': city || org.addresses?.[0]?.city,
                        'emails.0': company_email || org.emails?.[0],
                        'phones.0': company_phone || org.phones?.[0]
                    }
                },
                { new: true, session }
            );
        }

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            data: {
                corporation: updatedCorp,
                organization: org
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating corporation:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating corporation',
            error: error.message
        });
    }
};

// Soft delete corporation
const deleteCorporation = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const { corp_id } = req.params;

        // Check if corporation exists
        const corp = await Corp.findOne({ corp_id }).session(session);
        if (!corp) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Get all roles for this corporation
        const roles = await Role.find({ corp_id }).session(session);
        const roleIds = roles.map(role => role.role_id);

        // Delete all related data in parallel
        await Promise.all([
            // Delete corporation
            Corp.deleteOne(
                { corp_id },
                { session }
            ),

            // Delete organization
            Org.deleteOne(
                { corp_id },
                { session }
            ),

            // Delete all users
            User.deleteMany(
                { corp_id },
                { session }
            ),

            // Delete all permissions for roles
            Permission.deleteMany(
                { role_id: { $in: roleIds } },
                { session }
            ),

            // Delete all roles
            Role.deleteMany(
                { corp_id },
                { session }
            ),

            // Delete theme
            Theme.deleteOne(
                { corp_id },
                { session }
            ),

            // Delete all vehicles
            await Vehicle.deleteMany(
                { corp_id },
                { session }
            ),

            // Log vehicle statuses
            console.log('Deleting vehicles with statuses:', ['STOCK', 'SOLD', 'CONSIGNMENT'])
        ]);

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Corporation and all related data have been deleted successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error deleting corporation:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting corporation',
            error: error.message
        });
    }
};

// Get all corporations
const getAllCorporations = async (req, res) => {
    try {
        // Parse pagination params
        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
        const skip = (page - 1) * limit;

        // Prepare search query
        const searchQuery = req.query.search ? {
            $or: [
                { corp_name: { $regex: req.query.search, $options: 'i' } },
                { organization_number: { $regex: req.query.search, $options: 'i' } }
            ]
        } : {};

        // Get total count
        const totalItems = await Corp.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalItems / limit);

        // Get paginated corporations with search
        const corporations = await Corp.find(searchQuery).skip(skip).limit(limit).sort({ createdAt: -1 });
        
        // Get roles/resources for each corporation
        const corporationsWithDetails = await Promise.all(
            corporations.map(async (corp) => {
                // Fetch organization details to get more information
                const org = await Org.findOne({ corp_id: corp.corp_id }).lean();

                // Prepare corporation details
                const corpDetails = {
                    ...corp.toObject(),
                    organization_number: org?.legalId || corp.corp_id,
                    street_address: org?.addresses?.[0]?.street || '',
                    registered_city: org?.addresses?.[0]?.municipality || '',
                    postal_code: org?.addresses?.[0]?.zip || '',
                    city: org?.addresses?.[0]?.city || '',
                    company_email: org?.emails?.[0] || '',
                    company_phone: org?.phones?.[0] || '',
                };

                // Get resources
                const resources = await Resource.find({
                    resource_id: { $in: corp.allowed_resources }
                }).select('resource_id title');
                
                const allowed_resources_names = resources.map(resource => ({
                    resource_id: resource.resource_id,
                    title: resource.title
                }));

                return {
                    ...corpDetails,
                    allowed_resources: corp.allowed_resources,
                    allowed_resources_names
                };
            })
        );

        res.json({
            success: true,
            data: corporationsWithDetails,
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit
        });
    } catch (error) {
        console.error('Error fetching corporations:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching corporations'
        });
    }
};

// Get users by corporation ID
const getUsersByCorporation = async (req, res) => {
    try {
        const { corp_id } = req.params;

        const users = await User.find({ corp_id }).populate({
            path: 'role_id',
            model: 'Role'
        });

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Error fetching corporation users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching corporation users'
        });
    }
};

// Get allowed resources for a corporation
const getAllowedResources = async (req, res) => {
    try {
        const corp_id = req.user.corp_id;
        const corporation = await Corp.findOne({ corp_id });
        
        if (!corporation) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Get all resources 
        const resources = await Resource.find({ is_public: true }).select('resource_id title description icon route');
        
        res.json({
            success: true,
            data: resources
        });

    } catch (error) {
        console.error('Error fetching allowed resources:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching allowed resources'
        });
    }
};

// Get roles by corporation ID
const getRolesByCorporation = async (req, res) => {
    try {
        const { corp_id } = req.params;

        const roles = await Role.find({ corp_id })
            .select('role_id corp_id name description is_system createdAt updatedAt');

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {
        console.error('Error fetching corporation roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching corporation roles'
        });
    }
};

// Update user of any corporation
const updateUserOfCorporation = async (req, res) => {
    try {
        const { userId } = req.params;
        const { 
            first_name, 
            last_name, 
            email, 
            type,
            role_id,
            active,
            corp_id
        } = req.body;

        // Find the user to update
        const user = await User.findOne({ 
            id: userId,
            active: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // If corp_id is provided, verify it exists
        if (corp_id) {
            const corporation = await Corp.findOne({ corp_id });
            if (!corporation) {
                return res.status(404).json({
                    success: false,
                    message: 'Corporation not found'
                });
            }
        }

        // Check if email is being changed and if it already exists
        if (email && email.toLowerCase() !== user.email) {
            const existingUser = await User.findOne({ email: email.toLowerCase() });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }
        }

        // If role_id is provided, verify it exists and belongs to the target corporation
        if (role_id) {
            const role = await Role.findOne({ 
                role_id,
                corp_id: corp_id || user.corp_id
            });

            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role ID for the target corporation'
                });
            }
        }

        // Update user
        const updatedUser = await User.findOneAndUpdate(
            { id: userId },
            {
                $set: {
                    first: first_name || user.first,
                    last: last_name || user.last,
                    email: email ? email.toLowerCase() : user.email,
                    type: type || user.type,
                    role_id: role_id !== undefined ? role_id : user.role_id,
                    active: active !== undefined ? active : user.active,
                    corp_id: corp_id || user.corp_id
                }
            },
            { new: true }
        ).populate({
            path: 'role_id',
            model: 'Role',
            select: 'role_id name description'
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                id: updatedUser.id,
                first_name: updatedUser.first,
                last_name: updatedUser.last,
                email: updatedUser.email,
                type: updatedUser.type,
                active: updatedUser.active,
                corp_id: updatedUser.corp_id,
                role: updatedUser.role_id ? {
                    role_id: updatedUser.role_id.role_id,
                    name: updatedUser.role_id.name,
                    description: updatedUser.role_id.description
                } : null
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// Create user in a corporation
const createUserInCorporation = async (req, res) => {
    try {
        const { 
            corp_id,
            first_name, 
            last_name, 
            email, 
            password, 
            type = 'User',
            role_id
        } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !email || !password || !corp_id) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Verify corporation exists
        const corporation = await Corp.findOne({ corp_id });
        if (!corporation) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // If role_id is provided, verify it exists and belongs to the corporation
        if (role_id) {
            const role = await Role.findOne({ 
                role_id,
                corp_id
            });

            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role ID for the corporation'
                });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate user ID
        const userId = generateId('USER');

        // Create user
        const user = await User.create({
            id: userId,
            corp_id,
            corp_name: corporation.corp_name,
            first: first_name,
            last: last_name,
            email: email.toLowerCase(),
            password: hashedPassword,
            type,
            active: true,
            role_id: role_id || null
        });

        // Get the created user with role information
        const createdUser = await User.findOne({ id: userId })
            .populate({
                path: 'role_id',
                model: 'Role',
                select: 'role_id name description'
            });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: createdUser.id,
                first_name: createdUser.first,
                last_name: createdUser.last,
                email: createdUser.email,
                type: createdUser.type,
                active: createdUser.active,
                corp_id: createdUser.corp_id,
                role: createdUser.role_id ? {
                    role_id: createdUser.role_id.role_id,
                    name: createdUser.role_id.name,
                    description: createdUser.role_id.description
                } : null
            }
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
};

// Get full corporation details
const getFullCorporationDetails = async (req, res) => {
    try {
        const { corp_id } = req.params;

        // Find corporation
        const corporation = await Corp.findOne({ corp_id });
        if (!corporation) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Find associated organization
        const organization = await Org.findOne({ corp_id: corporation.corp_id }).lean();
        
        // Get resources details
        const resources = await Resource.find({
            resource_id: { $in: corporation.allowed_resources }
        }).select('resource_id title description icon');

        const allowed_resources_names = resources.map(resource => ({
            resource_id: resource.resource_id,
            title: resource.title,
            description: resource.description,
            icon: resource.icon
        }));

        // If no organization found, return corporation details with a warning
        if (!organization) {            
            return res.json({
                success: true,
                data: {
                    corporation: {
                        ...corporation.toObject(),
                        allowed_resources_names
                    },
                    organization: null,
                    warning: 'No organization details found for this corporation'
                }
            });
        }

        // Transform organization data to match OrgSearchResponse
        const transformedOrg = {
            organization_number: organization.legalId,
            corp_name: organization.orgName?.name || corporation.corp_name,
            street_address: organization.addresses?.[0]?.street || '',
            registered_city: organization.addresses?.[0]?.municipality || '',
            postal_code: organization.addresses?.[0]?.zip || '',
            city: organization.addresses?.[0]?.city || '',
            company_email: organization.emails?.[0] || '',
            company_phone: organization.phones?.[0] || '',

            // Additional optional fields
            contact_person: '',
            business_description: '',
            business_category: '',
            legal_form: '',
            vat_number: '',
            website: '',
            is_f_skatt_payer: false,
            established_year: null,
            company_status: ''
        };

        res.json({
            success: true,
            data: {
                corporation: {
                    ...corporation.toObject(),
                    allowed_resources_names
                },
                organization: transformedOrg
            }
        });

    } catch (error) {
        console.error('Error fetching full corporation details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching full corporation details'
        });
    }
};

// Get current corporation details
const getCurrentCorporationDetails = async (req, res) => {
    try {
        const { corp_id } = req.user;

        // Find corporation
        const corporation = await Corp.findOne({ corp_id });
        if (!corporation) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Find associated organization
        const organization = await Org.findOne({ corp_id: corporation.corp_id }).lean();
        
        // Get resources details
        const resources = await Resource.find({
            resource_id: { $in: corporation.allowed_resources }
        }).select('resource_id title description icon');

        const allowed_resources_names = resources.map(resource => ({
            resource_id: resource.resource_id,
            title: resource.title,
            description: resource.description,
            icon: resource.icon
        }));

        // If no organization found, return corporation details with a warning
        if (!organization) {            
            return res.json({
                success: true,
                data: {
                    corporation: {
                        ...corporation.toObject(),
                        allowed_resources_names
                    },
                    organization: null,
                    warning: 'No organization details found for this corporation'
                }
            });
        }

        // Transform organization data
        const transformedOrg = {
            organization_number: organization.legalId,
            corp_name: organization.orgName?.name || corporation.corp_name,
            street_address: organization.addresses?.[0]?.street || '',
            registered_city: organization.addresses?.[0]?.municipality || '',
            postal_code: organization.addresses?.[0]?.zip || '',
            city: organization.addresses?.[0]?.city || '',
            company_email: organization.emails?.[0] || '',
            company_phone: organization.phones?.[0] || '',
            vat_number: organization.taxInfo?.vatNumber || '',
            is_f_skatt_payer: organization.taxInfo?.fskattPayer || false,
            contact_person: organization.contactInfo?.name || '',
            business_description: organization.businessActivity || '',
            business_category: organization.primaryBusinessCategory?.description || '',
            legal_form: organization.legalForm?.name || '',
            website: organization.urls?.[0] || '',
            established_year: organization.lifecycle?.establishedInYear || null,
            company_status: organization.lifecycle?.status?.value || ''
        };

        res.json({
            success: true,
            data: {
                corporation: {
                    ...corporation.toObject(),
                    allowed_resources_names
                },
                organization: transformedOrg
            }
        });

    } catch (error) {
        console.error('Error fetching current corporation details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching current corporation details'
        });
    }
};

module.exports = {
    createCorporation,
    updateCorporation,
    deleteCorporation,
    getAllCorporations,
    getUsersByCorporation,
    getAllowedResources,
    getRolesByCorporation,
    updateUserOfCorporation,
    createUserInCorporation,
    getFullCorporationDetails,
    getCurrentCorporationDetails
};
