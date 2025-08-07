const User = require("../models/userModel");
const Role = require("../models/roleModel");
const Permission = require("../models/permissionModel");
const Resource = require("../models/resourceModel");
const asyncHandler = require("express-async-handler");

/**
 * Middleware to check if user has permission for a specific resource and action
 * @param {string} resourceName - Name of the resource (e.g., 'users', 'roles')
 * @param {string} action - Action to check (read, create, update, delete)
 */
const checkPermission = (resourceID, action) => {
  return asyncHandler(async (req, res, next) => {
    try {
      // Find user with role
      const user = req.user;
      // Run resource query in parallel
      const resource = await Resource.findOne({ title: { $regex: new RegExp(`^${resourceID}$`, 'i') } }).lean();
      if (!resource) {
        // all resources
        const resource = await Resource.find({}).lean();
        return res.status(404).json({
          success: false,
          message: "Not authorized",
        });
      }

      // Find permission directly with all necessary conditions
      const permission = await Permission.findOne({
        role_id: user.role_id,
        resource_id: resource.resource_id,
        [`can_${action}`]: true, // Only match if the action is permitted
      }).lean();
      if (!permission) {
        return res.status(403).json({
          success: false,
          message: `You don't have permission to ${action} this resource`,
        });
      }
      
      req.permission = permission;
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({
        success: false,
        message: "Error checking permissions",
        error: error.message,
      });
    }
  });
};

module.exports = {
  checkPermission,
};
