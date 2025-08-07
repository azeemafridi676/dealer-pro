const apiKeyAuth = (req, res, next) => {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
        return res.status(401).json({ 
            success: false, 
            message: 'API key is missing' 
        });
    }

    // Check if API key matches the one in environment variables
    if (apiKey !== process.env.THIRD_PARTY_API_KEY) {
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid API key' 
        });
    }

    next();
};

module.exports = apiKeyAuth; 