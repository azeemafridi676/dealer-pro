const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateTokens = (user) => {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT secrets not configured');
    }

    // Access token
    const accessToken = jwt.sign(
        {
            user_id: user.id,
            email: user.user_email,
            corp_id: user.corp_id,
            role: user.type
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    // Refresh token
    const refreshToken = jwt.sign(
        {
            user_id: user.id
        },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
};

const verifyAccessToken = (token) => {
    if (!process.env.JWT_ACCESS_SECRET) {
        throw new Error('JWT access secret not configured');
    }
    
    try {
        return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (error) {
        throw new Error('Invalid access token');
    }
};

const verifyRefreshToken = (token) => {
    if (!process.env.JWT_REFRESH_SECRET) {
        throw new Error('JWT refresh secret not configured');
    }

    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid refresh token');
    }
};

module.exports = {
    generateTokens,
    verifyAccessToken,
    verifyRefreshToken
}; 