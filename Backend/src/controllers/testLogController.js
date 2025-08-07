const fs = require('fs');
const path = require('path');

/**
 * @desc    Write a log message to file
 * @route   POST /api/test-logs
 * @access  Private
 */
const writeLog = async (req, res) => {
    try {
        const { message } = req.body;
        const logsDirectory = path.join(__dirname, '../../logs');
        const logFilePath = path.join(logsDirectory, 'logs.txt');

        // Ensure logs directory exists
        if (!fs.existsSync(logsDirectory)) {
            fs.mkdirSync(logsDirectory, { recursive: true });
        }

        // Append timestamp to the log message
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;

        fs.appendFile(logFilePath, logEntry, (err) => {
            if (err) {
                console.error('Error writing log to file:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Error writing log to file',
                    error: err.message
                });
            }

            res.status(200).json({
                success: true,
                message: 'Log written successfully',
                data: {
                    timestamp,
                    message
                }
            });
        });
    } catch (error) {
        console.error('Error in writeLog:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing log request',
            error: error.message
        });
    }
};

module.exports = {
    writeLog
};
