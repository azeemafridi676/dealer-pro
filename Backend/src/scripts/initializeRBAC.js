const mongoose = require('mongoose');
const Resource = require('../models/resourceModel');
const Role = require('../models/roleModel');
const Permission = require('../models/permissionModel');
const User = require('../models/userModel');
const Corp = require('../models/corpModel');
const bcrypt = require('bcryptjs');
const resources = require('../config/resourcesConfig.js');
const { generateId } = require('../utils/generateIdUtil.js');

const initializeRBAC = async () => {
    try {
        // Initialize resources
        const resourceIds = [];
        for (const resource of resources) {
            const existingResource = await Resource.findOne({
                route: resource.route
            });

            if (!existingResource) {
                const newResource = await Resource.create({
                    resource_id: generateId('RES'),
                    title: resource.title,
                    position: resource.position,
                    route: resource.route,
                    icon: resource.icon,
                    description: resource.description,
                    is_public: resource.resource_id !== 'CORPORATIONS',
                    has_subresources: resource.has_subresources || false,
                    subresources: resource.subresources || []
                });
                resourceIds.push(newResource.resource_id);
            } else {
                // Update existing resource with sub-resources if needed
                if (resource.has_subresources) {
                    await Resource.findOneAndUpdate(
                        { route: resource.route },
                        { 
                            $set: {
                                has_subresources: true,
                                subresources: resource.subresources
                            }
                        }
                    );
                }
                resourceIds.push(existingResource.resource_id);
            }
        }

        // Create default Corp for super admin with all resources allowed
        let systemCorp = await Corp.findOne({
            corp_name: 'System Corporation'
        });

        if (!systemCorp) {
            const corpId = generateId('CORP');
            systemCorp = await Corp.create({
                corp_id: corpId,
                corp_name: 'System Corporation',
                corp_active: true,
                allowed_resources: resourceIds
            });
        }

        // Initialize Super Admin role with corp_id
        let superAdminRole = await Role.findOne({
            name: 'Super Admin',
            corp_id: systemCorp.corp_id
        });

        if (!superAdminRole) {
            const superAdminRoleId = generateId('ROLE');
            superAdminRole = await Role.create({
                role_id: superAdminRoleId,
                name: 'Super Admin',
                description: 'System super administrator with full access',
                is_system: true,
                corp_id: systemCorp.corp_id
            });
        }

        // Get all resources
        const allResources = await Resource.find();

        // Create permissions for Super Admin role
        for (const resource of allResources) {
            const existingPermission = await Permission.findOne({
                role_id: superAdminRole.role_id,
                resource_id: resource.resource_id
            });

            if (!existingPermission) {
                // Create subresource permissions if the resource has subresources
                const subresourcePermissions = resource.has_subresources ? 
                    resource.subresources.map(sub => ({
                        subresource_route: sub.route,
                        can_read: true,
                        can_create: true,
                        can_update: true,
                        can_delete: true
                    })) : [];

                await Permission.create({
                    permission_id: generateId('PERM'),
                    role_id: superAdminRole.role_id,
                    resource_id: resource.resource_id,
                    can_read: true,
                    can_create: true,
                    can_update: true,
                    can_delete: true,
                    subresource_permissions: subresourcePermissions
                });
            } else if (resource.has_subresources) {
                // Update existing permission with subresource permissions
                const subresourcePermissions = resource.subresources.map(sub => ({
                    subresource_route: sub.route,
                    can_read: true,
                    can_create: true,
                    can_update: true,
                    can_delete: true
                }));

                await Permission.findOneAndUpdate(
                    { 
                        role_id: superAdminRole.role_id,
                        resource_id: resource.resource_id
                    },
                    {
                        $set: {
                            subresource_permissions: subresourcePermissions
                        }
                    }
                );
            }
        }

        // Check if super admin user exists
        const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
        const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
        if (superAdminEmail && superAdminPassword) {
            const existingSuperAdmin = await User.findOne({
                email: superAdminEmail
            });

            if (!existingSuperAdmin) {
                // Create super admin user
                const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
                const userId = generateId('USER');
                
                await User.create({
                    id: userId,
                    corp_id: systemCorp.corp_id,
                    corp_name: systemCorp.corp_name,
                    role_id: superAdminRole.role_id,
                    first: 'Super',
                    last: 'Admin',
                    email: superAdminEmail,
                    password: hashedPassword,
                    type: 'Super Admin',
                    active: true,
                    two_factor_enabled: true
                });

                console.log('Super Admin user created successfully');
            }
        }

        console.log('RBAC system initialized successfully');
    } catch (error) {
        console.error('Error initializing RBAC:', error);
        throw error;
    }
};

module.exports = initializeRBAC; 