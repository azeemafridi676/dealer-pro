const asyncHandler = require('express-async-handler');
const { getOrgFromAPI } = require('../services/orgService');
const Org = require('../models/orgModel');
const Corp = require('../models/corpModel');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const { generateId } = require('../utils/generateIdUtil');
const mongoose = require('mongoose');
const Role = require('../models/roleModel');
const Permission = require('../models/permissionModel');
const Resource = require('../models/resourceModel');

// SEARCH: Search organization from API by legalId (organization number)
const searchOrg = asyncHandler(async (req, res) => {
    const { organization_number } = req.body;
    console.log("organization_number", req.body);

    if (!organization_number || organization_number === null || organization_number == "") {
        return res.status(400).json({ success: false, message: 'Organization number is required' });
    }

    try {
        // Get from API
        const orgData = await getOrgFromAPI(organization_number);
        if (!orgData) {
            return res.status(404).json({ success: false, message: 'Organization not found from API' });
        }

        // Get the visit address (or first address if no visit address)
        const address = orgData.addresses.find(a => a.kind === 'VISIT') || orgData.addresses[0];

        // Transform the data to match frontend needs
        const transformedData = {
            organization_number: orgData.legalId,
            corp_name: orgData.orgName.name,
            street_address: address ? `${address.street} ${address.number}${address.numberSuffix || ''}`.trim() : '',
            registered_city: address?.municipality || '',
            postal_code: address?.zip || '',
            city: address?.city || '',
            company_email: orgData.emails[0] || '',
            company_phone: orgData.phones[0] || ''
        };

        return res.status(200).json({ success: true, data: transformedData });
    } catch (error) {
        console.error('Error searching organization:', error);
        return res.status(500).json({ success: false, message: 'Failed to search organization' });
    }
});

// PUBLIC SEARCH: Search organization from API by legalId (organization number) - no auth
const publicSearchOrg = asyncHandler(async (req, res) => {
    const { organization_number } = req.body;

    if (!organization_number) {
        return res.status(400).json({ success: false, message: 'Organization number is required' });
    }

    try {
        // Get from API
        const orgData = await getOrgFromAPI(organization_number);
        if (!orgData) {
            return res.status(404).json({ success: false, message: 'Organization not found from API' });
        }        
        // Get the visit address (or first address if no visit address)
        const address = orgData.addresses.find(a => a.kind === 'VISIT') || orgData.addresses[0];
        
        const transformedData = {
            organization_number: organization_number,
            corp_name: orgData.orgName.name,
            street_address: address ? `${address.street} ${address.number}${address.numberSuffix || ''}`.trim() : '',
            registered_city: address?.municipality || '',
            postal_code: address?.zip || '',
            city: address?.city || '',
            company_email: orgData.emails[0] || '',
            company_phone: orgData.phones[0] || '',
            
            // Additional fields
            vat_number: orgData.taxInfo?.vatNumber || '',
            is_f_skatt_payer: orgData.taxInfo?.fskattPayer || false,
            contact_person: orgData.contactInfo?.name || '',
            business_description: orgData.businessActivity || '',
            business_category: orgData.primaryBusinessCategory?.description || '',
            legal_form: orgData.legalForm?.name || '',
            
            // Optional fields with fallback
            website: orgData.urls?.[0] || '',
            established_year: orgData.lifecycle?.establishedInYear || null,
            company_status: orgData.lifecycle?.status?.value || ''
        };

        return res.status(200).json({ success: true, data: transformedData });
    } catch (error) {
        console.error('Error searching organization:', error);
        return res.status(500).json({ success: false, message: 'Failed to search organization' });
    }
});

// GET ALL: Get all organizations (summary)
const getAll = asyncHandler(async (req, res) => {
    const { corp_id } = req.user;
    const orgs = await Org.find({ corp_id }).select({
        legalId: 1,
        'orgName': 1,
        'lifecycle.status': 1,
        'primaryBusinessCategory': 1,
        'legalForm': 1,
        'taxInfo.vatNumber': 1,
        'manpower.nrOfEmployeesOrg': 1
    }).lean();
    return res.status(200).json({ success: true, data: orgs });
});

// GET BY ID: Get full organization detail
const getById = asyncHandler(async (req, res) => {
    const { legalId } = req.params;
    const { corp_id } = req.user;

    if (!legalId) {
        return res.status(400).json({ success: false, message: 'legalId is required' });
    }

    const org = await Org.findOne({ legalId, corp_id });
    if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    return res.status(200).json({ success: true, data: org });
});

// DELETE: Delete organization by ID
const deleteById = asyncHandler(async (req, res) => {
    const { legalId } = req.params;
    const { corp_id } = req.user;

    if (!legalId) {
        return res.status(400).json({ success: false, message: 'legalId is required' });
    }

    const deleted = await Org.findOneAndDelete({ legalId, corp_id });
    if (!deleted) {
        return res.status(404).json({ success: false, message: 'Organization not found or already deleted' });
    }

    return res.status(200).json({ success: true, message: 'Organization deleted' });
});

// UPDATE: Refresh organization data from API
const refreshOrg = asyncHandler(async (req, res) => {
    const { legalId } = req.params;
    const { corp_id, id: user_id } = req.user;

    if (!legalId) {
        return res.status(400).json({ success: false, message: 'legalId is required' });
    }

    // Get fresh data from API
    const orgData = await getOrgFromAPI(legalId);
    if (!orgData) {
        return res.status(404).json({ success: false, message: 'Organization not found in API' });
    }

    // Update existing record
    orgData.user_id = user_id;
    orgData.corp_id = corp_id;

    const updated = await Org.findOneAndUpdate(
        { legalId, corp_id },
        orgData,
        { new: true, runValidators: true }
    );

    if (!updated) {
        return res.status(404).json({ success: false, message: 'Organization not found in database' });
    }

    return res.status(200).json({ success: true, data: updated });
});

// Helper function to validate required fields
const validateRequiredFields = (data) => {
    const requiredFields = {
        'Organization Number': data.organization_number,
        'Corporation Name': data.corp_name,
        'Admin Email': data.admin_data?.email,
        'Admin Password': data.admin_data?.password,
        'Admin First Name': data.admin_data?.first_name,
        'Admin Last Name': data.admin_data?.last_name
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

    return missingFields;
};

// Register full organization (creates org, corp, and admin user)
const registerFullOrganization = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        
        const {
            organization_number,
            corp_name,
            admin_data = {},
            ...orgData
        } = req.body;
        
        // Validate required fields
        const missingFields = validateRequiredFields(req.body);
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Check if admin email already exists
        const existingUser = await User.findOne({ email: admin_data.email }).session(session);
        if (existingUser) {
            throw new Error('A user with this email already exists');
        }

        // Check if organization already exists
        const existingOrg = await Org.findOne({ legalId: organization_number }).session(session);
        if (existingOrg) {
            throw new Error('Organization with this number already exists');
        }

        const corp_id = generateId('CORP');
        const [newCorp] = await Corp.create([{
            corp_id,
            corp_name,
            corp_active: true,
            allowed_resources: req.body.allowed_resources || []
        }], { session });

        // Create or get admin role
        let adminRole = await Role.findOne({
            corp_id,
            name: 'Admin',
            is_system: true
        }).session(session);

        if (!adminRole) {
            const adminRoleId = generateId('ROLE');
            [adminRole] = await Role.create([{
                role_id: adminRoleId,
                corp_id,
                name: 'Admin',
                description: `Corporation ${corp_name} administrator`,
                is_system: true
            }], { session });
        }

        // Create permissions for admin role including subresources (single doc per resource)
        const resources = await Resource.find({ 
            resource_id: { $in: req.body.allowed_resources || [] } 
        });
        const permissionPromises = [];
        for (const resource of resources) {
            const permissionId = generateId('PERM');
            let subresourcePermissions = [];
            if (resource.has_subresources && resource.subresources) {
                subresourcePermissions = resource.subresources.map(sub => ({
                    subresource_route: sub.route,
                    can_read: true,
                    can_create: true,
                    can_update: true,
                    can_delete: true
                }));
            }
            permissionPromises.push(
                Permission.create([{
                    permission_id: permissionId,
                    role_id: adminRole.role_id,
                    resource_id: resource.resource_id,
                    can_read: true,
                    can_create: true,
                    can_update: true,
                    can_delete: true,
                    subresource_permissions: subresourcePermissions
                }], { session })
            );
        }
        await Promise.all(permissionPromises);

        // Create admin user
        const hashedPassword = await bcrypt.hash(admin_data.password, 10);
        const userId = generateId('USER');
        const [adminUser] = await User.create([{
            id: userId,
            corp_id,
            corp_name,
            role_id: adminRole.role_id,
            first: admin_data.first_name,
            last: admin_data.last_name,
            email: admin_data.email,
            phone: admin_data.phone,
            password: hashedPassword,
            type: 'Admin',
            active: true
        }], { session });
        console.log("adminUser", adminUser);
        // Get organization data from API
        const apiOrgData = await getOrgFromAPI(organization_number);
        if (!apiOrgData) {
            throw new Error('Organization not found in API');
        }

        // Create organization
        const finalOrgData = {
            ...orgData,
            ...apiOrgData,
            corp_id,
            user_id: adminUser.id,
            legalId: organization_number,
            country: apiOrgData.country,
            emails: (Array.isArray(apiOrgData.emails) && apiOrgData.emails.length > 0)
                ? apiOrgData.emails
                : (orgData.company_email ? [orgData.company_email] : []),
            phones: (Array.isArray(apiOrgData.phones) && apiOrgData.phones.length > 0)
                ? (apiOrgData.phones.map(phone => typeof phone === 'object' ? phone.number : phone).filter(Boolean))
                : (orgData.company_phone ? [orgData.company_phone] : [])
        };
        console.log("finalOrgData", finalOrgData);
        const [newOrg] = await Org.create([finalOrgData], { session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            success: true,
            data: {
                corporation: newCorp,
                organization: newOrg,
                admin_user: adminUser
            }
        });

    } catch (error) {
        // Abort transaction on any error
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error in registerFullOrganization:', error);
        return res.status(error.message.includes('Missing required fields') ? 400 : 500).json({
            success: false,
            message: error.message || 'Error creating organization'
        });
    }
});

// UPDATE: Full organization update
const updateFullOrganization = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        // get corp_id from url
        const { 
            corp_id,
            organization_number, 
            corp_name, 
            street_address,
            registered_city,
            postal_code,
            city,
            company_email,
            company_phone,
            corp_active,
            allowed_resources
        } = req.body;
        // Validate required fields
        if (!organization_number || !corp_id) {
            throw new Error('Organization number and corporation ID are required');
        }

        // Find the existing organization
        let existingOrg = await Org.findOne({ legalId: organization_number }).session(session);
        
        // If organization doesn't exist, fetch from API and create
        if (!existingOrg) {
            // Get organization data from API
            const apiOrgData = await getOrgFromAPI(organization_number);
            if (!apiOrgData) {
                throw new Error('Organization not found in API');
            }

            // Find the associated corporation (if exists)
            const corp = await Corp.findOne({ corp_id: corp_id }).session(session);
            if (!corp) {
                throw new Error('Associated corporation not found');
            }

            // Prepare organization data
            const finalOrgData = {
                ...apiOrgData,
                corp_id: corp.corp_id,
                user_id: req.user.id,
                legalId: organization_number,
                country: apiOrgData.country,
                // Override with provided details if they exist
                'orgName.name': corp_name || apiOrgData.orgName?.name,
                addresses: [{
                    street: street_address || apiOrgData.addresses?.[0]?.street,
                    municipality: registered_city || apiOrgData.addresses?.[0]?.municipality,
                    zip: postal_code || apiOrgData.addresses?.[0]?.zip,
                    city: city || apiOrgData.addresses?.[0]?.city
                }],
                emails: [company_email || apiOrgData.emails?.[0]],
                phones: [company_phone || apiOrgData.phones?.[0]]
            };

            // Create new organization
            const [newOrg] = await Org.create([finalOrgData], { session });
            existingOrg = newOrg;
        }

        // Find the associated corporation
        const corp = await Corp.findOne({ corp_id: existingOrg.corp_id }).session(session);
        if (!corp) {
            console.log('Associated corporation not found', "existingOrg.corp_id", existingOrg.corp_id);
            // all corp            
            const allCorps = await Corp.find({}).session(session);
            console.log('All corps', allCorps.map(corp => corp.corp_id));
            throw new Error('Associated corporation not found');
        }

        // Update corporation details
        const updatedCorp = await Corp.findOneAndUpdate(
            { corp_id: corp.corp_id },
            { 
                $set: {
                    corp_name: corp_name || corp.corp_name,
                    corp_active: corp_active !== undefined ? corp_active : corp.corp_active,
                    allowed_resources: allowed_resources || corp.allowed_resources
                }
            },
            { new: true, session }
        );

        // --- SYNC ADMIN ROLE PERMISSIONS TO MATCH ALLOWED_RESOURCES ---
        const adminRole = await Role.findOne({ corp_id: corp.corp_id, name: 'Admin', is_system: true }).session(session);
        if (adminRole) {
            // Get all current permissions for this role
            const currentPermissions = await Permission.find({ role_id: adminRole.role_id }).session(session);
            const currentResourceIds = currentPermissions.map(p => p.resource_id.toString());
            const newResourceIds = (allowed_resources || []).map(r => r.toString());

            // Add permissions for new resources
            for (const resourceId of newResourceIds) {
                if (!currentResourceIds.includes(resourceId)) {
                    const permissionId = generateId('PERM');
                    await Permission.create([{
                        permission_id: permissionId,
                        role_id: adminRole.role_id,
                        resource_id: resourceId,
                        can_read: true,
                        can_create: true,
                        can_update: true,
                        can_delete: true
                    }], { session });
                }
            }

            // Remove permissions for resources no longer allowed
            for (const permission of currentPermissions) {
                if (!newResourceIds.includes(permission.resource_id.toString())) {
                    await Permission.deleteOne({ _id: permission._id }).session(session);
                }
            }
        }
        // --- END SYNC ---

        // Prepare organization update
        const orgUpdateData = {
            'orgName.name': corp_name || existingOrg.orgName?.name,
            'addresses.0.street': street_address || existingOrg.addresses?.[0]?.street,
            'addresses.0.municipality': registered_city || existingOrg.addresses?.[0]?.municipality,
            'addresses.0.zip': postal_code || existingOrg.addresses?.[0]?.zip,
            'addresses.0.city': city || existingOrg.addresses?.[0]?.city,
            'emails.0': company_email || existingOrg.emails?.[0],
            'phones.0': company_phone || existingOrg.phones?.[0]
        };

        // Update organization
        const updatedOrg = await Org.findOneAndUpdate(
            { legalId: organization_number },
            { $set: orgUpdateData },
            { new: true, session }
        );

        // Commit transaction
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            data: {
                corporation: updatedCorp,
                organization: updatedOrg
            }
        });

    } catch (error) {
        // Abort transaction on any error
        await session.abortTransaction();
        session.endSession();
        
        console.error('Error in updateFullOrganization:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Error updating organization'
        });
    }
});

// CHECK IF ORG EXISTS IN DB ONLY
const checkOrgExists = asyncHandler(async (req, res) => {
    const { organization_number } = req.body;
    if (!organization_number) {
        return res.status(400).json({ success: false, message: 'Organization number is required' });
    }
    try {
        const org = await Org.findOne({ legalId: organization_number });
        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found in database' });
        }
        // Transform to match publicSearchOrg format (reuse as much as possible)
        const address = org.addresses?.find(a => a.kind === 'VISIT') || org.addresses?.[0] || {};
        const transformedData = {
            organization_number: org.legalId,
            corp_name: org.orgName?.name || '',
            street_address: address.street ? `${address.street} ${address.number || ''}${address.numberSuffix || ''}`.trim() : '',
            registered_city: address.municipality || '',
            postal_code: address.zip || '',
            city: address.city || '',
            company_email: org.emails?.[0] || '',
            company_phone: org.phones?.[0] || '',
            vat_number: org.taxInfo?.vatNumber || '',
            is_f_skatt_payer: org.taxInfo?.fskattPayer || false,
            contact_person: org.contactInfo?.name || '',
            business_description: org.businessActivity || '',
            business_category: org.primaryBusinessCategory?.description || '',
            legal_form: org.legalForm?.name || '',
            website: org.urls?.[0] || '',
            established_year: org.lifecycle?.establishedInYear || null,
            company_status: org.lifecycle?.status?.value || ''
        };
        return res.status(200).json({ success: true, data: transformedData });
    } catch (error) {
        console.error('Error checking org in DB:', error);
        return res.status(500).json({ success: false, message: 'Failed to check organization in database' });
    }
});

module.exports = {
    searchOrg,
    getAll,
    getById,
    deleteById,
    refreshOrg,
    registerFullOrganization,
    publicSearchOrg,
    updateFullOrganization,
    checkOrgExists
};
