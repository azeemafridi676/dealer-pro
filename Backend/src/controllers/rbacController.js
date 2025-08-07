const User = require('../models/userModel');
const Role = require('../models/roleModel');
const Permission = require('../models/permissionModel');
const Resource = require('../models/resourceModel');
const Corp = require('../models/corpModel');
const { generateId } = require('../utils/generateIdUtil');

/**
 * @desc    Get user permissions and resources
 * @route   GET /api/rbac/user-permissions
 * @access  Private
 */
const getUserPermissions = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the role using the role_id from user
        const role = await Role.findOne({ role_id: user.role_id });
        
        if (!role) {
            return res.status(404).json({ message: 'User role not found' });
        }

        // Get permissions for the user's role
        const permissions = await Permission.find({ role_id: role.role_id });

        // Get all resources for these permissions
        const resourceIds = permissions.map(p => p.resource_id);
        const resources = await Resource.find({ resource_id: { $in: resourceIds } });
        // Create a map of resources for easy lookup
        const resourceMap = resources.reduce((acc, resource) => {
            acc[resource.resource_id.toString()] = resource;
            return acc;
        }, {});

        // Get the corporation's allowed resources
        const corporation = await Corp.findOne({ corp_id: user.corp_id });

        if (!corporation) {
            return res.status(404).json({ message: 'Corporation not found' });
        }

        // Filter permissions based on corporation's allowed resources
        const filteredPermissions = permissions.filter(permission => {
            const resource = resourceMap[permission.resource_id.toString()];
            return resource && corporation.allowed_resources.includes(resource.resource_id.toString());
        });

        // Format resources with all required fields for the frontend
        const formattedResources = filteredPermissions.map(permission => {
            const resource = resourceMap[permission.resource_id.toString()];
            if (!resource) return null;
            
            // Format subresource permissions if they exist
            const subresourcePermissions = resource.has_subresources ? 
                resource.subresources.map(sub => {
                    const subPerm = permission.subresource_permissions?.find(
                        sp => sp.subresource_route === sub.route
                    ) || {
                        can_read: false,
                        can_create: false,
                        can_update: false,
                        can_delete: false
                    };
                    
                    return {
                        resource_id: sub._id,
                        title: sub.title,
                        route: sub.route,
                        icon: sub.icon,
                        position: resource.position,
                        permissions: {
                            can_read: subPerm.can_read,
                            can_create: subPerm.can_create,
                            can_update: subPerm.can_update,
                            can_delete: subPerm.can_delete
                        }
                    };
                }) : [];

            return {
                resource_id: resource.resource_id,
                title: resource.title,
                route: resource.route,
                icon: resource.icon,
                position: resource.position,
                has_subresources: resource.has_subresources || false,
                subresources: subresourcePermissions,
                permissions: {
                    can_read: permission.can_read,
                    can_create: permission.can_create,
                    can_update: permission.can_update,
                    can_delete: permission.can_delete
                }
            };
        }).filter(Boolean);

        // Create a resources object with resource_id as key for the frontend
        const resourcesObject = {};
        formattedResources.forEach(resource => {
            resourcesObject[resource.resource_id] = resource;
        });

        const formattedData = {
            role: {
                role_id: role.role_id,
                name: role.name,
                description: role.description,
            },
            resources: resourcesObject
        };
        
        res.status(200).json({
            success: true,
            data: formattedData
        });
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        res.status(500).json({ message: 'Error fetching user permissions' });
    }
};

/**
 * @desc    Get all roles with their permissions
 * @route   GET /api/rbac/roles
 * @access  Private
 */
const getAllRoles = async (req, res) => {
    try {
        // Get all roles
        const roles = await Role.find({ corp_id: req.user.corp_id }).sort({ createdAt: -1 });

        // Get all permissions for these roles
        const roleIds = roles.map(role => role.role_id);
        const permissions = await Permission.find({ role_id: { $in: roleIds } });

        // Get all resources for these permissions
        const resourceIds = permissions.map(permission => permission.resource_id);
        const resources = await Resource.find({ is_public: true, resource_id: { $in: resourceIds } });

        // Create maps for easy lookup
        const resourceMap = resources.reduce((acc, resource) => {
            acc[resource.resource_id.toString()] = resource;
            return acc;
        }, {});

        const permissionMap = permissions.reduce((acc, permission) => {
            if (!acc[permission.role_id.toString()]) {
                acc[permission.role_id.toString()] = [];
            }
            acc[permission.role_id.toString()].push(permission);
            return acc;
        }, {});

        // Format the response
        const formattedRoles = roles.map(role => {
            const rolePermissions = permissionMap[role.role_id.toString()] || [];
            
            const permissions = rolePermissions.reduce((acc, permission) => {
                const resource = resourceMap[permission.resource_id.toString()];
                if (!resource) return acc;
                
                // Format subresource permissions if they exist
                const subresourcePermissions = resource.has_subresources ? 
                    resource.subresources.map(sub => {
                        const subPerm = permission.subresource_permissions?.find(
                            sp => sp.subresource_route === sub.route
                        ) || {
                            can_read: false,
                            can_create: false,
                            can_update: false,
                            can_delete: false
                        };
                        
                        return {
                            resource_id: sub._id,
                            title: sub.title,
                            route: sub.route,
                            icon: sub.icon,
                            position: resource.position,
                            permissions: {
                                can_read: subPerm.can_read,
                                can_create: subPerm.can_create,
                                can_update: subPerm.can_update,
                                can_delete: subPerm.can_delete
                            }
                        };
                    }) : [];

                if (!acc[resource.resource_id.toString()]) {
                    acc[resource.resource_id.toString()] = {
                        resource_id: resource.resource_id,
                        title: resource.title,
                        route: resource.route,
                        icon: resource.icon,
                        position: resource.position,
                        has_subresources: resource.has_subresources || false,
                        subresources: subresourcePermissions,
                        permissions: {
                            can_read: permission.can_read,
                            can_create: permission.can_create,
                            can_update: permission.can_update,
                            can_delete: permission.can_delete
                        }
                    };
                }
                
                return acc;
            }, {});

            return {
                role_id: role.role_id,
                name: role.name,
                description: role.description,
                is_system: role.is_system,
                permissions,
                permissionsCount: Object.keys(permissions).length
            };
        });

        res.status(200).json({
            success: true,
            data: formattedRoles
        });

    } catch (error) {
        console.error('Error getting roles:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting roles',
            error: error.message
        });
    }
};

/**
 * @desc    Create a new role
 * @route   POST /api/rbac/roles
 * @access  Private
 */
const createRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId = req.user.id;

        // Get the user's corporation to determine allowed resources
        const user = await User.findOne({ id: userId })
            .populate('role_id');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get the corporation's allowed resources
        const corporation = await Corp.findOne({ corp_id: user.corp_id });

        if (!corporation) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // Create the role with the corporation ID
        const roleId = generateId('ROLE');
        const role = await Role.create({
            role_id: roleId,
            name,
            description,
            is_system: false,
            corp_id: corporation.corp_id
        });

        // Get all resources that are allowed for this corporation
        const allowedResources = await Resource.find({
            resource_id: { $in: corporation.allowed_resources }
        });

        // Create permissions for each allowed resource with all permissions set to false
        const permissions = await Promise.all(
            allowedResources.map(async (resource) => {
                const permissionId = generateId('PERM');
                return await Permission.create({
                    permission_id: permissionId,
                    role_id: roleId,
                    resource_id: resource.resource_id,
                    can_read: false,
                    can_create: false,
                    can_update: false,
                    can_delete: false
                });
            })
        );

        res.status(201).json({
            success: true,
            data: {
                role,
                permissions
            }
        });

    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating role',
            error: error.message
        });
    }
};

/**
 * @desc    Update a role
 * @route   PUT /api/rbac/roles/:roleId
 * @access  Private
 */
const updateRole = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { name, description } = req.body;

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        if (role.is_system) {
            return res.status(403).json({
                success: false,
                message: 'System roles cannot be modified'
            });
        }

        const updatedRole = await Role.findOneAndUpdate(
            { role_id: roleId },
            { $set: { name, description } },
            { new: true }
        );

        res.status(200).json({
            success: true,
            data: updatedRole
        });

    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating role',
            error: error.message
        });
    }
};

/**
 * @desc    Delete a role
 * @route   DELETE /api/rbac/roles/:roleId
 * @access  Private
 */
const deleteRole = async (req, res) => {
    try {
        const { roleId } = req.params;

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        if (role.is_system) {
            return res.status(403).json({
                success: false,
                message: 'System roles cannot be deleted'
            });
        }

        await Role.deleteOne({ role_id: roleId });

        res.status(200).json({
            success: true,
            message: 'Role deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting role',
            error: error.message
        });
    }
};

/**
 * @desc    Assign permissions to a role
 * @route   POST /api/rbac/roles/:roleId/permissions
 * @access  Private
 */
const assignPermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;

        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        if (role.is_system) {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify permissions for system roles'
            });
        }

        // Delete existing permissions for this role
        await Permission.deleteMany({ role_id: roleId });

        // Create new permissions
        const newPermissions = await Promise.all(
            permissions.map(async (permission) => {
                const permissionId = generateId('PERM');
                return await Permission.create({
                    permission_id: permissionId,
                    role_id: roleId,
                    resource_id: permission.resource_id,
                    can_read: permission.can_read,
                    can_create: permission.can_create,
                    can_update: permission.can_update,
                    can_delete: permission.can_delete
                });
            })
        );

        res.status(201).json({
            success: true,
            data: newPermissions
        });

    } catch (error) {
        console.error('Error assigning permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning permissions',
            error: error.message
        });
    }
};

/**
 * @desc    Update role permissions
 * @route   PUT /api/rbac/roles/:roleId/permissions
 * @access  Private
 */
const updateRolePermissions = async (req, res) => {
    try {
        const { roleId } = req.params;
        const { permissions } = req.body;

        // Check if role exists
        const role = await Role.findOne({ role_id: roleId });
        if (!role) {
            return res.status(404).json({
                success: false,
                message: 'Role not found'
            });
        }

        // Check if it's a system role
        if (role.is_system) {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify system role permissions'
            });
        }

        // Process each permission
        const permissionPromises = permissions.map(async (permission) => {
            const existingPermission = await Permission.findOne({
                role_id: roleId,
                resource_id: permission.resource_id
            });

            // Get the resource to check for subresources
            const resource = await Resource.findOne({ resource_id: permission.resource_id });
            
            // Format subresource permissions if they exist
            const subresourcePermissions = resource?.has_subresources ? 
                resource.subresources.map(sub => {
                    const subPerm = permission.subresources?.find(
                        sp => sp.route === sub.route
                    ) || {
                        can_read: false,
                        can_create: false,
                        can_update: false,
                        can_delete: false
                    };
                    
                    return {
                        subresource_route: sub.route,
                        can_read: subPerm.can_read,
                        can_create: subPerm.can_create,
                        can_update: subPerm.can_update,
                        can_delete: subPerm.can_delete
                    };
                }) : [];

            if (existingPermission) {
                // Update existing permission
                return await Permission.findOneAndUpdate(
                    {
                        role_id: roleId,
                        resource_id: permission.resource_id
                    },
                    {
                        $set: {
                            can_read: permission.can_read,
                            can_create: permission.can_create,
                            can_update: permission.can_update,
                            can_delete: permission.can_delete,
                            subresource_permissions: subresourcePermissions
                        }
                    },
                    { new: true }
                );
            } else {
                // Create new permission
                const permissionId = generateId('PERM');
                return await Permission.create({
                    permission_id: permissionId,
                    role_id: roleId,
                    resource_id: permission.resource_id,
                    can_read: permission.can_read,
                    can_create: permission.can_create,
                    can_update: permission.can_update,
                    can_delete: permission.can_delete,
                    subresource_permissions: subresourcePermissions
                });
            }
        });

        // Wait for all permissions to be processed
        await Promise.all(permissionPromises);

        // Get the updated role
        const updatedRole = await Role.findOne({ role_id: roleId });

        // Get all permissions for this role
        const updatedPermissions = await Permission.find({ role_id: roleId });

        // Get all resources for these permissions
        const resourceIds = updatedPermissions.map(p => p.resource_id);
        const resources = await Resource.find({ resource_id: { $in: resourceIds } });
        // Create a map of resources for easy lookup
        const resourceMap = resources.reduce((acc, resource) => {
            acc[resource.resource_id.toString()] = resource;
            return acc;
        }, {});
        console.log('resourceMap', resourceMap);
        // Format the response
        const formattedPermissions = updatedPermissions.map(permission => {
            const resource = resourceMap[permission.resource_id.toString()];
            if (!resource) {
                // Log and skip this permission if resource is missing
                console.error(`Resource not found for resource_id: ${permission.resource_id}`);
                return null;
            }
            // Format subresource permissions if they exist
            const subresourcePermissions = resource?.has_subresources ? 
                resource.subresources.map(sub => {
                    const subPerm = permission.subresource_permissions?.find(
                        sp => sp.subresource_route === sub.route
                    ) || {
                        can_read: false,
                        can_create: false,
                        can_update: false,
                        can_delete: false
                    };
                    
                    return {
                        ...sub,
                        permissions: {
                            can_read: subPerm.can_read,
                            can_create: subPerm.can_create,
                            can_update: subPerm.can_update,
                            can_delete: subPerm.can_delete
                        }
                    };
                }) : [];

            return {
                resource: {
                    _id: resource.resource_id,
                    title: resource.title,
                    description: resource.description,
                    icon: resource.icon,
                    has_subresources: resource.has_subresources || false,
                    subresources: subresourcePermissions
                },
                view: permission.can_read,
                add: permission.can_create,
                edit: permission.can_update,
                delete: permission.can_delete
            };
        }).filter(Boolean); // Remove nulls from missing resources

        res.status(200).json({
            success: true,
            message: 'Permissions updated successfully',
            data: {
                role_id: updatedRole.role_id,
                name: updatedRole.name,
                description: updatedRole.description,
                permissions: formattedPermissions,
                permissionsCount: formattedPermissions.length
            }
        });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update permissions',
            error: error.message
        });
    }
};

module.exports = {
    getUserPermissions,
    getAllRoles,
    createRole,
    updateRole,
    deleteRole,
    assignPermissions,
    updateRolePermissions
}; 