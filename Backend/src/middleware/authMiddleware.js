const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
    // Check token existence first to avoid unnecessary processing
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
    
    try {
        // Get token from header
        const token = req.headers.authorization.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Get user from token with lean query for better performance
        const user = await User.findOne({
            id: decoded.user_id,
            active: true
        }).lean().select('-password'); // Don't retrieve password field
        if (!user) {
            return res.status(401).json({ message: 'User not found or inactive' });
        }
     
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized' });
    }
});

module.exports = { protect }; 