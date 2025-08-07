const User = require('../models/userModel');
const Role = require('../models/roleModel');
const Permission = require('../models/permissionModel');
const Resource = require('../models/resourceModel');
const Corp = require('../models/corpModel')
const { generateId } = require('../utils/generateIdUtil');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

/**
 * Get all users in the same corporation as the logged-in user
 * @route GET /api/users
 * @access Private
 */
const getAllUsers = async (req, res) => {
    // Get the user's corporation ID from their user record
    const user = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id');

    if (!user || !user.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const corp_id = user.corp_id;

    // Pagination params
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    try {
        // Get total count
        const totalItems = await User.countDocuments({ corp_id, active: true });
        console.log('totalItems', totalItems);
        const totalPages = Math.ceil(totalItems / limit);

        // Get paginated users
        const users = await User.find({ 
            corp_id,
            active: true
        })
        .select('id first last email type active role_id createdAt')
        .skip(skip)
        .sort({ createdAt: -1 })
        .limit(limit);

        // Get all roles for these users
        const roleIds = users.map(user => user.role_id).filter(id => id);
        const roles = await Role.find({ 
            role_id: { $in: roleIds },
            corp_id 
        }).select('role_id name description');

        // Get all permissions for these roles
        const roleIdsForPermissions = roles.map(role => role.role_id);
        const permissions = await Permission.find({ 
            role_id: { $in: roleIdsForPermissions }
        }).select('role_id');

        // Create a map of role_id to permissions count
        const rolePermissionsCount = permissions.reduce((acc, permission) => {
            acc[permission.role_id] = (acc[permission.role_id] || 0) + 1;
            return acc;
        }, {});

        // Create a map of role_id to role details
        const roleMap = roles.reduce((acc, role) => {
            acc[role.role_id] = {
                role_id: role.role_id,
                name: role.name,
                description: role.description
            };
            return acc;
        }, {});

        // Format the response
        const formattedUsers = users.map(user => {
            const role = user.role_id ? roleMap[user.role_id] : null;
            const permissionsCount = role ? (rolePermissionsCount[role.role_id] || 0) : 0;
            return {
                user_id: user.id,
                first_name: user.first,
                last_name: user.last,
                email: user.email,
                user_type: user.type,
                is_active: user.active,
                role: role,
                permissionsCount,
                created_at: user.createdAt
            };
        });
        res.status(200).json({
            success: true,
            data: formattedUsers,
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

/**
 * Get a single user by ID
 * @route GET /api/users/:userId
 * @access Private
 */
const getUserById = async (req, res) => {
    const { userId } = req.params;
    
    // Get the user's corporation ID from their user record
    const currentUser = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id');

    if (!currentUser || !currentUser.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const corp_id = currentUser.corp_id;

    try {
        const user = await User.findOne({ 
            id: userId,
            corp_id,
            active: true
        }).select('id first last email mobile type active')
        .populate({
            path: 'role_id',
            model: 'Role',
            select: 'role_id name description',
            populate: {
                path: 'permissions',
                model: 'Permission',
                select: 'permission_id resource_id can_read can_create can_update can_delete',
                populate: {
                    path: 'resource_id',
                    model: 'Resource',
                    select: 'resource_id title description icon'
                }
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Format the response
        const permissionsCount = user.role_id?.permissions?.length || 0;
        
        const formattedUser = {
            user_id: user.id,
            first_name: user.first,
            last_name: user.last,
            email: user.email,
            mobile: user.mobile,
            user_type: user.type,
            is_active: user.active,
            role: user.role_id ? {
                role_id: user.role_id.role_id,
                name: user.role_id.name,
                description: user.role_id.description
            } : null,
            permissionsCount
        };

        res.status(200).json({
            success: true,
            data: formattedUser
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user',
            error: error.message
        });
    }
};

/**
 * Create a new user
 * @route POST /api/users
 * @access Private
 */
const createUser = async (req, res) => {
    // Get the user's corporation from their user record
    const currentUser = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id corp_name');

    if (!currentUser || !currentUser.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const { corp_id, corp_name } = currentUser;
    
    const { 
        first_name, 
        last_name, 
        email, 
        password, 
        type = 'User',
        role_id
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide all required fields'
        });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Check if role exists and belongs to the same corporation
        if (role_id) {
            const role = await Role.findOne({ 
                role_id: new mongoose.Types.ObjectId(role_id),
                corp_id
            });
            if (!role) {
                // Find if the role exists in any corporation
                const roleExists = await Role.findOne({ role_id: new mongoose.Types.ObjectId(role_id) });
                if (roleExists) {
                    return res.status(400).json({
                        success: false,
                        message: `Role exists but belongs to a different corporation. Cannot assign roles from other corporations.`
                    });
                }

                return res.status(400).json({
                    success: false,
                    message: 'Invalid role ID - role does not exist'
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
            corp_name,
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
            .select('id first last email mobile type active')
            .populate({
                path: 'role_id',
                model: 'Role',
                select: 'role_id name description'
            });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user_id: createdUser.id,
                first_name: createdUser.first,
                last_name: createdUser.last,
                email: createdUser.email,
                mobile: createdUser.mobile,
                user_type: createdUser.type,
                is_active: createdUser.active,
                role: createdUser.role_id ? {
                    role_id: createdUser.role_id.role_id,
                    name: createdUser.role_id.name,
                    description: createdUser.role_id.description
                } : null,
                permissionsCount: 0
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

/**
 * Update a user
 * @route PUT /api/users/:userId
 * @access Private
 */
const updateUser = async (req, res) => {
    const { userId } = req.params;
    
    // Get the user's corporation from their user record
    const currentUser = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id');

    if (!currentUser || !currentUser.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const { corp_id } = currentUser;
    
    const { 
        first_name, 
        last_name, 
        email, 
        type,
        role_id,
        is_active
    } = req.body;

    try {
        // Find the user
        const user = await User.findOne({ 
            id: userId,
            corp_id,
            active: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
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

        // Check if role exists and belongs to the same corporation
        if (role_id && role_id !== user.role_id) {
            const role = await Role.findOne({ 
                role_id: new mongoose.Types.ObjectId(role_id),
                corp_id
            });

            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role ID'
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
                    active: is_active !== undefined ? is_active : user.active
                }
            },
            { new: true }
        ).select('id first last email mobile type active')
        .populate({
            path: 'role_id',
            model: 'Role',
            select: 'role_id name description',
            populate: {
                path: 'permissions',
                model: 'Permission',
                select: 'permission_id'
            }
        });

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: {
                user_id: updatedUser.id,
                first_name: updatedUser.first,
                last_name: updatedUser.last,
                email: updatedUser.email,
                mobile: updatedUser.mobile,
                user_type: updatedUser.type,
                is_active: updatedUser.active,
                role: updatedUser.role_id ? {
                    role_id: updatedUser.role_id.role_id,
                    name: updatedUser.role_id.name,
                    description: updatedUser.role_id.description
                } : null,
                permissionsCount: updatedUser.role_id?.permissions?.length || 0
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

/**
 * Delete a user (soft delete)
 * @route DELETE /api/users/:userId
 * @access Private
 */
const deleteUser = async (req, res) => {
    const { userId } = req.params;
    
    // Get the user's corporation ID from their user record
    const currentUser = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id');

    if (!currentUser || !currentUser.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const corp_id = currentUser.corp_id;

    try {
        // Find the user
        const user = await User.findOne({ 
            id: userId,
            corp_id,
            active: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete the user
        await User.findOneAndUpdate(
            { id: userId },
            { $set: { active: false } }
        );

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

/**
 * Change user password
 * @route PUT /api/users/:userId/password
 * @access Private
 */
const changeUserPassword = async (req, res) => {
    const { userId } = req.params;
    
    // Get the user's corporation ID from their user record
    const currentUser = await User.findOne({ 
        id: req.user.id,
        active: true
    }).select('corp_id');

    if (!currentUser || !currentUser.corp_id) {
        return res.status(400).json({
            success: false,
            message: 'User corporation not found'
        });
    }

    const corp_id = currentUser.corp_id;
    
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({
            success: false,
            message: 'Password is required'
        });
    }

    try {
        // Find the user
        const user = await User.findOne({ 
            id: userId,
            corp_id,
            active: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update password
        await User.findOneAndUpdate(
            { id: userId },
            { $set: { password: hashedPassword } }
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    changeUserPassword
}; 