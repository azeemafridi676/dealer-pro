const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const Corp = require("../models/corpModel");
const Resource = require("../models/resourceModel");
const Theme = require("../models/themeModel");
const DeviceVerification = require("../models/deviceVerificationModel");
const { generateId } = require('../utils/generateIdUtil');
const { getOrgFromAPI } = require('../services/orgService');
const {
  generateTokens,
  verifyRefreshToken,
} = require("../utils/generateTokenUtil.js");
const { sendEmail } = require("../utils/sendEmailUtil.js");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Org = require("../models/orgModel");
const Role = require("../models/roleModel");
const Permission = require("../models/permissionModel");

// Helper function to generate OTP
const generateOTP = async (email) => {
  try {
    // const otp = crypto.randomInt(100000, 999999).toString();
    const otp = "123456";
    const emailContent = {
      userEmail: email,
      otp: otp,
    };
    await sendEmail(email, "Your Verification Code", "otp", emailContent);
    console.log(":::: otp send to email ::::")
    return otp;
  } catch (error) {
    console.error("Error generating/sending OTP:", error);
    throw new Error(
      "Failed to send verification email. Please try again later."
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password, deviceId, deviceName } = req.body;

    // Find user with related Corp data using MongoDB
    const user = await User.findOne({
      email: email.toLowerCase(),
      active: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Find the associated corp
    const corp = await Corp.findOne({
      corp_id: user.corp_id,
      corp_active: true,
    });

    if (!corp) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if device is verified
    const deviceVerification = await DeviceVerification.findOne({
      user_id: user.id,
      device_id: deviceId,
      is_verified: true,
    });

    if (deviceVerification) {
      // Device is verified, proceed with normal login
      const { accessToken, refreshToken } = generateTokens(user);

      // Update last login timestamp
      await User.findByIdAndUpdate(user._id, {
        last_notifications_check: Math.floor(Date.now() / 1000),
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          tokens: {
            accessToken,
            refreshToken,
          },
          user: {
            id: user.id,
            email: user.email,
            first: user.first,
            last: user.last,
            type: user.type,
            corp: {
              corp_id: corp.corp_id,
              corp_name: corp.corp_name,
            },
          },
        },
      });
    }

    try {
      // Device needs verification
      // Generate OTP
      const otp = await generateOTP(email);
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Find existing device verification record
      let deviceVerificationRecord = await DeviceVerification.findOne({
        user_id: user.id,
        device_id: deviceId,
      });

      if (deviceVerificationRecord) {
        // Update existing record
        deviceVerificationRecord = await DeviceVerification.findByIdAndUpdate(
          deviceVerificationRecord._id,
          {
            otp: otp,
            otp_expires_at: otpExpiresAt,
            last_otp_sent_at: new Date(),
            otp_attempts: 0,
          },
          { new: true }
        );
      } else {
        // Create new record
        deviceVerificationRecord = await DeviceVerification.create({
          user_id: user.id,
          device_id: deviceId,
          device_name: deviceName || "Unknown Device",
          otp: otp,
          otp_expires_at: otpExpiresAt,
          last_otp_sent_at: new Date(),
          otp_attempts: 0,
          is_verified: false,
        });
      }

      console.log("OTP for testing:", otp);

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        requiresVerification: true,
        otp,
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again later.",
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Helper function to validate required fields
const validateRequiredFields = (data) => {
    const requiredFields = {
        'Organization Number': data.organization_number,
        'Corporation Name': data.corp_name,
        'Admin Email': data.admin_data?.email || data.email,
        'Admin Password': data.admin_data?.password || data.password,
        'Admin First Name': data.admin_data?.first_name || data.first_name,
        'Admin Last Name': data.admin_data?.last_name || data.last_name
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field]) => field);

    return missingFields;
};

// Register full organization (creates org, corp, and admin user)
const signUpUser = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const {
      organization_number,
      corp_name,
      street_address,
      registered_city,
      postal_code,
      city,
      company_email,
      company_phone,
      email,
      password,
      first_name,
      last_name,      
      phone
    } = req.body;

    // Validate required fields
    const missingFields = validateRequiredFields(req.body);
    if (missingFields.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() }).session(session);
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    // Check if organization already exists
    const existingOrg = await Org.findOne({ legalId: organization_number }).session(session);
    if (existingOrg) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Organization with this number already exists"
      });
    }

    // Get all public resources
    const resources = await Resource.find({ is_public: true });
    const allowed_resources = resources.map(resource => resource.resource_id);
    console.log("allowed_resources", allowed_resources)

    // Generate corp_id
    const corp_id = generateId('CORP');

    // Create Corporation
    const [newCorp] = await Corp.create([{
      corp_id,
      corp_name,
      corp_active: true,
      allowed_resources
    }], { session });

    // Create admin role
    const adminRoleId = generateId('ROLE');
    const [adminRole] = await Role.create([{
      role_id: adminRoleId,
      corp_id,
      name: 'Admin',
      description: `Corporation ${corp_name} administrator`,
      is_system: true
    }], { session });

    // Create permissions for admin role including subresources (single doc per resource)
    const resourcesList = await Resource.find({ resource_id: { $in: allowed_resources } });
    const permissionPromises = [];
    for (const resource of resourcesList) {
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
          resource_id: resource.resource_id, // ObjectId only
          can_read: true,
          can_create: true,
          can_update: true,
          can_delete: true,
          subresource_permissions: subresourcePermissions
        }], { session })
      );
    }
    const all = await Promise.all(permissionPromises);
    console.log("permissionPromises", all)

    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId('USER');
    const [adminUser] = await User.create([{
      id: userId,
      corp_id,
      corp_name,
      role_id: adminRole.role_id,
      first: first_name,
      last: last_name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone: phone,
      type: 'Admin',
      active: true
    }], { session });

    // Get organization data from API
    const apiOrgData = await getOrgFromAPI(organization_number);
    if (!apiOrgData) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Organization not found in API"
      });
    }

    // Create organization
    const finalOrgData = {
      ...apiOrgData,
      corp_id,
      user_id: adminUser.id,
      legalId: organization_number,
      country: apiOrgData.country,
      street_address,
      registered_city,
      postal_code,
      city,
      company_email,
      company_phone
    };

    const [newOrg] = await Org.create([finalOrgData], { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Generate tokens for immediate login
    const { accessToken, refreshToken } = generateTokens(adminUser);

    return res.status(201).json({
      success: true,
      data: {
        corporation: newCorp,
        organization: newOrg,
        admin_user: adminUser,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in signup:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating organization",
      error: error.message
    });
  }
});

const tokenCheck = asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(401).json({
        status: 401,
        isValid: false,
        message: "No token provided",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const { email } = decodedToken;

    const user = await User.findOne({
      email: email.toLowerCase(),
      active: true,
    });

    if (!user) {
      throw new Error("User has been deleted or not found");
    }

    res.status(200).json({
      status: 200,
      isValid: true,
      message: "Valid Token",
    });
  } catch (error) {
    console.log("Token validation error:", error);
    res.status(401).json({
      status: 401,
      isValid: false,
      message:
        error.name === "TokenExpiredError"
          ? "Token has expired"
          : "Invalid Token",
    });
  }
});

const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const users = await User.find()
      .select("id first last email type active")
      .sort({ createdAt: -1 });

    if (!users.length) {
      console.log(`WARNING! No users found. Returning 404.`);
      return res.status(404).json({ message: "No users found" });
    }

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

const refreshUserToken = asyncHandler(async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify the refresh token
    const decoded = verifyRefreshToken(token);

    // Find user
    const user = await User.findOne({
      id: decoded.user_id,
      active: true,
    }).populate({
      path: "corp_id",
      select: "corp_id corp_name",
      match: { corp_active: true },
    });

    if (!user || !user.corp_id) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
});

const getUserInfo = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({
      id: userId,
      active: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get the corporation separately
    const corp = await Corp.findOne({
      corp_id: user.corp_id,
      corp_active: true,
    });

    if (!corp) {
      return res.status(404).json({
        success: false,
        message: "Corporation not found",
      });
    }

    // Find the organization associated with this corp
    const org = await Org.findOne({
      corp_id: user.corp_id,
      user_id: userId
    });

    // Get theme data for the corporation
    const theme = await Theme.findOne({ corp_id: user.corp_id });
    const themeData = theme ? theme.theme : "#3b82f6";

    // Get logo URL using the same helper function as themeController
    const getFullLogoUrl = (relativePath) => {
      if (!relativePath) return null;
      const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
      return `${backendUrl}/${relativePath}`;
    };

    const logoUrl = corp.logo ? getFullLogoUrl(corp.logo) : null;

    const complete_address = org ? org.addresses && org.addresses.length > 0 ? org.addresses[0]?.street + " " + org.addresses[0]?.number + (org.addresses[0]?.numberSuffix ? " " + org.addresses[0]?.numberSuffix : "") + ", " + org.addresses[0]?.city + ", " + org.addresses[0]?.zip : '' : '';
    
    // Prepare organization details
    const orgDetails = org ? {
      organization_number: org.legalId,
      organization_name: org.orgName?.name || org.orgName?.rawName,
      organization_email: org.emails && org.emails.length > 0 ? org.emails[0] : null,
      organization_phone: org.phones && org.phones.length > 0 ? org.phones[0] : null,
      business_category: org.primaryBusinessCategory?.description,
      legal_form: org.legalForm?.name,
      company_email: org.company_email,
      company_phone: org.company_phone,
      company_address: complete_address || '',
    } : null;

    const returnData = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first,
        last_name: user.last,
        type: user.type,
        corp: {
          corp_id: corp.corp_id,
          corp_name: corp.corp_name,
        },
        organization: orgDetails,
        theme: themeData,
        logo: logoUrl,
        mobile: user.phone || null,
        profileImage: user.profileImage || null
      }
    };

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first,
        last_name: user.last,
        type: user.type,
        corp: {
          corp_id: corp.corp_id,
          corp_name: corp.corp_name,
        },
        organization: orgDetails,
        theme: themeData,
        logo: logoUrl,
        mobile: user.phone || null,
        profileImage: user.profileImage || null
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const verifyOTP = asyncHandler(async (req, res) => {
  try {
    const { email, otp, deviceId } = req.body;

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      active: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // Find device verification record
    const deviceVerification = await DeviceVerification.findOne({
      user_id: user.id,
      device_id: deviceId,
    });

    if (!deviceVerification) {
      return res.status(400).json({
        success: false,
        message: "Device verification record not found",
      });
    }

    // Check if OTP has expired
    if (
      !deviceVerification.otp_expires_at ||
      new Date() > deviceVerification.otp_expires_at
    ) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Check OTP attempts
    if (deviceVerification.otp_attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    if (otp !== deviceVerification.otp) {
      // Increment failed attempts
      await DeviceVerification.findByIdAndUpdate(deviceVerification._id, {
        $inc: { otp_attempts: 1 },
      });

      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Update device verification status
    await DeviceVerification.findByIdAndUpdate(deviceVerification._id, {
      is_verified: true,
      last_verified_at: new Date(),
      otp: null,
      otp_expires_at: null,
      otp_attempts: 0,
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Update last login timestamp
    await User.findByIdAndUpdate(user._id, {
      last_notifications_check: Math.floor(Date.now() / 1000),
    });

    // Send success response with tokens
    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        tokens: {
          accessToken,
          refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first: user.first,
          last: user.last,
          type: user.type,
        },
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const resendOTP = asyncHandler(async (req, res) => {
  try {
    const { email, deviceId, deviceName } = req.body;

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase(),
      active: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // Find or create device verification record
    let deviceVerification = await DeviceVerification.findOne({
      user_id: user.id,
      device_id: deviceId,
    });

    if (!deviceVerification) {
      deviceVerification = await DeviceVerification.create({
        user_id: user.id,
        device_id: deviceId,
        device_name: deviceName,
        is_verified: false,
      });
    }

    // Generate new OTP
    const otp = await generateOTP(email);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update device verification record with new OTP
    await DeviceVerification.findByIdAndUpdate(deviceVerification._id, {
      otp: otp,
      otp_expires_at: otpExpiresAt,
      last_otp_sent_at: new Date(),
      otp_attempts: 0,
    });

    console.log("OTP for testing:", otp);

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email",
      requiresVerification: true,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase(),
      active: true,
    });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

    // Update user with reset token
    await User.findByIdAndUpdate(user._id, {
      reset_token: resetToken,
      reset_token_expires: resetTokenExpiry,
    });

    // Create reset URL
    const resetUrl = `${process.env.ADMIN_URL}/reset-password?token=${resetToken}`;

    // Prepare email content
    const emailContent = {
      userEmail: email,
      resetUrl: resetUrl,
      userName: `${user.first} ${user.last}`,
    };

    // Send password reset email
    await sendEmail(
      email,
      "Password Reset Request",
      "password-reset",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, you will receive password reset instructions.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() },
      active: true,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      reset_token: null,
      reset_token_expires: null,
    });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findOne({
      id: req.user.id,
      active: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid old password",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    });

    return res.status(200).json({
      success: true,
      message: "Password has been changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Update profile for current user
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({ id: userId, active: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Debug: log incoming data
    console.log('updateProfile: req.body:', req.body);
    console.log('updateProfile: req.file:', req.file);

    let updateFields = {};
    if (req.body.first_name) updateFields.first = req.body.first_name;
    if (req.body.last_name) updateFields.last = req.body.last_name;
    if (req.body.email) updateFields.email = req.body.email;
    if (req.body.mobile) updateFields.phone = req.body.mobile;
    if (req.file && req.file.path) {
      updateFields.profileImage = req.file.path;
    } else if (req.body.profileImage) {
      updateFields.profileImage = req.body.profileImage;
    }
    // Debug: log updateFields
    console.log('updateProfile: updateFields:', updateFields);

    const mongoose = require('mongoose');
    const userIdObj = new mongoose.Types.ObjectId(userId);
    // Debug: log userId and userIdObj
    console.log('updateProfile: userId:', userId, 'userIdObj:', userIdObj);

    const updatedUser = await User.findOneAndUpdate(
      { id: userIdObj },
      { $set: updateFields },
      { new: true }
    );
    // Debug: log updatedUser
    console.log('updateProfile: updatedUser:', updatedUser);

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found after update' });
    }

    // Get the corporation
    const corp = await Corp.findOne({ corp_id: updatedUser.corp_id, corp_active: true });
    if (!corp) {
      return res.status(404).json({ success: false, message: 'Corporation not found' });
    }

    // Find the organization associated with this corp
    const org = await Org.findOne({ corp_id: updatedUser.corp_id, user_id: userId });
    let orgDetails = null;
    if (org) {
      orgDetails = {
        organization_number: org.legalId,
        organization_name: org.orgName?.name || org.orgName?.rawName,
        organization_email: org.emails && org.emails.length > 0 ? org.emails[0] : null,
        organization_phone: org.phones && org.phones.length > 0 ? org.phones[0] : null,
        business_category: org.primaryBusinessCategory?.description,
        legal_form: org.legalForm?.name
      };
    }

    // Get theme data for the corporation
    const theme = await Theme.findOne({ corp_id: updatedUser.corp_id });
    const themeData = theme ? theme.theme : "#3b82f6";

    // Get logo URL
    const getFullLogoUrl = (relativePath) => {
      if (!relativePath) return null;
      const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
      return `${backendUrl}/${relativePath}`;
    };
    const logoUrl = corp.logo ? getFullLogoUrl(corp.logo) : null;

    // Build return data
    const returnData = {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first,
        last_name: updatedUser.last,
        type: updatedUser.type,
        corp: {
          corp_id: corp.corp_id,
          corp_name: corp.corp_name,
        },
        organization: orgDetails,
        theme: themeData,
        logo: logoUrl,
        mobile: updatedUser.phone || null,
        profileImage: updatedUser.profileImage || null
      }
    };

    res.status(200).json({
      success: true,
      ...returnData
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
  }
});

// In-memory OTP store for org registration (for demo)
const orgRegistrationOtps = {};

// Send OTP for org registration (not saved in DB)
const sendOrgRegistrationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  const otp = await generateOTP(email);
  console.log(":::: sendOrgRegistrationOtp otp", otp)
  orgRegistrationOtps[email.toLowerCase()] = {
    otp,
    expires: Date.now() + 10 * 60 * 1000 // 10 min
  };
  return res.status(200).json({ success: true, message: 'OTP sent to your email' });
});

// Verify OTP for org registration (not saved in DB)
const verifyOrgRegistrationOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }
  const record = orgRegistrationOtps[email.toLowerCase()];
  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
  // OTP is valid, remove it
  delete orgRegistrationOtps[email.toLowerCase()];
  return res.status(200).json({ success: true, message: 'OTP verified successfully' });
});

module.exports = {
  loginUser,
  signUpUser,
  tokenCheck,
  getAllUsers,
  refreshUserToken,
  getUserInfo,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  sendOrgRegistrationOtp,
  verifyOrgRegistrationOtp,
};
