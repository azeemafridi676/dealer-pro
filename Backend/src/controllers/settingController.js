const asyncHandler = require('express-async-handler');
const Theme = require('../models/themeModel');
const Corp = require('../models/corpModel');
const fs = require('fs').promises;
const fsSync = require('fs');  // Add this for sync operations
const path = require('path');

// Helper function to validate hex color
const isValidHexColor = (color) => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
};

// Helper function to check admin status
const isAdmin = (userType) => {
    return userType === 'Super Admin' || userType === 'Admin';
};

// Helper function to get full logo URL
const getFullLogoUrl = (relativePath) => {
    if (!relativePath) return null;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    return `${backendUrl}/${relativePath}`;
};

// Get theme for a corporation
const getTheme = asyncHandler(async (req, res) => {
    try {
        const { corp_id } = req.user;

        const color = await Theme.findOne({ corp_id });
        
        if (!color) {
            // If no theme exists, create default
            const defaultTheme = await Theme.create({
                corp_id,
                theme: '#3b82f6',
                updated_by: req.user.id
            });
            return res.status(200).json({
                success: true,
                theme: defaultTheme.theme
            });
        }

        res.status(200).json({
            success: true,
            theme: color.theme
        });

    } catch (error) {
        console.error('Get theme error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Update theme for a corporation
const updateTheme = asyncHandler(async (req, res) => {
    try {
        const { corp_id, type } = req.user;
        const { color } = req.body;
        // Check if user is admin of the corporation
        if (type !== 'Super Admin' && type !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can update theme'
            });
        }

        // Validate color input
        if (!color) {
            return res.status(400).json({
                success: false,
                message: 'Theme color is required'
            });
        }

        // Validate hex color format
        if (!isValidHexColor(color)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid color format. Please provide a valid hex color (e.g., #3b82f6)'
            });
        }
        
        // Update or create theme using findOneAndUpdate for atomic operation
        const updatedTheme = await Theme.findOneAndUpdate(
            { corp_id },
            { 
                theme: color,
                updated_by: req.user.id,
                updated_at: new Date()
            },
            { 
                new: true, 
                upsert: true,
                runValidators: true // Ensure schema validation runs
            }
        );

        if (!updatedTheme) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update theme'
            });
        }

        res.status(200).json({
            success: true,
            theme: updatedTheme.theme,
            message: 'Theme updated successfully'
        });

    } catch (error) {
        console.error('Update theme error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Get logo for a corporation
const getLogo = asyncHandler(async (req, res) => {
    try {
        const { corp_id } = req.user;

        const corp = await Corp.findOne({ corp_id });
        
        if (!corp) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // If no logo is set, return null
        if (!corp.logo) {
            return res.status(200).json({
                success: true,
                logo: null
            });
        }

        const logoPath = path.join(process.cwd(), corp.logo);

        // Check if file exists using sync version
        if (!fsSync.existsSync(logoPath)) {
            // If file doesn't exist, clear the logo reference
            corp.logo = null;
            await corp.save();
            
            return res.status(200).json({
                success: true,
                logo: null
            });
        }

        // Return the logo path with full URL
        const relativePath = path.relative(process.cwd(), corp.logo);
        res.status(200).json({
            success: true,
            logo: getFullLogoUrl(relativePath)
        });

    } catch (error) {
        console.error('Get logo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Update logo for a corporation
const updateLogo = asyncHandler(async (req, res) => {
    try {
        const { corp_id, type } = req.user;

        // Check if user is admin
        if (!isAdmin(type)) {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can update logo'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No logo file provided'
            });
        }

        const corp = await Corp.findOne({ corp_id });
        
        if (!corp) {
            // Clean up uploaded file if corp not found
            await fs.unlink(req.file.path);
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // If there's an existing logo, delete it
        if (corp.logo) {
            const oldLogoPath = path.join(process.cwd(), corp.logo);
            try {
                if (fsSync.existsSync(oldLogoPath)) {
                    await fs.unlink(oldLogoPath);
                }
            } catch (error) {
                console.error('Error deleting old logo:', error);
            }
        }

        // Update corp with new logo path (store relative path)
        const relativePath = path.relative(process.cwd(), req.file.path);
        corp.logo = relativePath;
        await corp.save();

        res.status(200).json({
            success: true,
            logo: getFullLogoUrl(relativePath),
            message: 'Logo updated successfully'
        });

    } catch (error) {
        console.error('Update logo error:', error);
        // Clean up uploaded file if there's an error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Error cleaning up file:', unlinkError);
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// Remove logo for a corporation
const removeLogo = asyncHandler(async (req, res) => {
    try {
        const { corp_id, type } = req.user;

        // Check if user is admin
        if (!isAdmin(type)) {
            return res.status(403).json({
                success: false,
                message: 'Only corporation admins can remove logo'
            });
        }

        const corp = await Corp.findOne({ corp_id });
        
        if (!corp) {
            return res.status(404).json({
                success: false,
                message: 'Corporation not found'
            });
        }

        // If there's an existing logo, delete it
        if (corp.logo) {
            const logoPath = path.join(process.cwd(), corp.logo);
            try {
                if (fsSync.existsSync(logoPath)) {
                    await fs.unlink(logoPath);
                }
            } catch (error) {
                console.error('Error deleting logo file:', error);
            }
        }

        // Remove logo reference from corp
        corp.logo = null;
        await corp.save();

        res.status(200).json({
            success: true,
            message: 'Logo removed successfully'
        });

    } catch (error) {
        console.error('Remove logo error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = {
    getTheme,
    updateTheme,
    getLogo,
    updateLogo,
    removeLogo
};
