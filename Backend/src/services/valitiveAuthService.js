const axios = require('axios');
const qs = require('qs');

// Caching mechanism for token
let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Retrieves an authentication token from Valitive API
 * @returns {Promise<string>} The access token
 * @throws {Error} If token retrieval fails
 */
const getValitiveToken = async () => {
    // Validate required environment variables
    const requiredEnvVars = [
        'VALITIVE_AUTH_URL', 
        'VALITIVE_GRANT_TYPE', 
        'VALITIVE_USERNAME', 
        'VALITIVE_PASSWORD', 
        'VALITIVE_BASIC_AUTH_HEADER'
    ];
    
    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            throw new Error(`Missing required environment variable: ${varName}`);
        }
    });

    // Check if we have a valid cached token
    if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    try {
        // Prepare data for token request
        const data = qs.stringify({
            'grant_type': process.env.VALITIVE_GRANT_TYPE,
            'username': process.env.VALITIVE_USERNAME,
            'password': process.env.VALITIVE_PASSWORD
        });

        // Prepare config object for token request
        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: process.env.VALITIVE_AUTH_URL,
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded', 
                'Authorization': `Basic ${process.env.VALITIVE_BASIC_AUTH_HEADER}`
            },
            data: data,
            timeout: 10000 // 10 seconds timeout
        };

        // Make the request
        const response = await axios.request(config);

        // Validate response
        if (!response.data || !response.data.access_token) {
            throw new Error('Invalid token response');
        }

        // Cache the token and set expiration 
        cachedToken = response.data.access_token;
        tokenExpiresAt = Date.now() + (response.data.expires_in || 28799) * 1000;

        return cachedToken;
    } catch (error) {
        // Log detailed error for debugging
        console.error('Valitive Token Retrieval Error:', {
            message: error.message,
            response: error.response ? error.response.data : 'No response',
            status: error.response ? error.response.status : 'Unknown'
        });

        // Rethrow with a more generic error
        throw new Error('Failed to retrieve Valitive authentication token');
    }
};

module.exports = {
    getValitiveToken
}; 