const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Add axios for alternative upload method

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * @typedef {Object} CloudinaryUploadResponse
 * @property {boolean} success - Whether the upload was successful
 * @property {string} url - The secure URL of the uploaded file
 * @property {string} publicId - The public ID of the uploaded file
 * @property {string} resourceType - The resource type of the uploaded file
 * @property {string} format - The format of the uploaded file
 * @property {number} bytes - The size of the uploaded file in bytes
 */

/**
 * Alternative upload method using axios
 * @param {string} filePath - Path to the file
 * @param {string} folderName - Cloudinary folder
 * @param {string} fileName - Optional file name
 * @returns {Promise<CloudinaryUploadResponse>} Upload result
 */
const axiosCloudinaryUpload = async (filePath, folderName, fileName) => {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'default');
    formData.append('folder', folderName);

    if (fileName) {
        formData.append('public_id', `${folderName}/${fileName}`);
    }

    try {
        const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`, 
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'X-Requested-With': 'XMLHttpRequest'
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60000
            }
        );

        return {
            success: true,
            url: response.data.secure_url,
            publicId: response.data.public_id,
            resourceType: response.data.resource_type,
            format: response.data.format,
            bytes: response.data.bytes
        };
    } catch (error) {
        console.error('Axios Cloudinary upload error:', error);
        throw error;
    }
};

/**
 * Upload file to Cloudinary with multiple fallback strategies
 * @param {string} filePath - Local file path
 * @param {string} folderName - Cloudinary folder name
 * @param {string} fileName - Optional custom file name
 * @param {boolean} keepLocalFile - Whether to keep the local file after upload
 * @returns {Promise<CloudinaryUploadResponse>} - Cloudinary upload result
 */
const uploadToCloudinary = async (filePath, folderName, fileName = null, keepLocalFile = false) => {
    const uploadStrategies = [
        // Strategy 1: Native Cloudinary SDK upload
        async () => {
        const fileExtension = path.extname(filePath).toLowerCase();
            const resourceType = fileExtension === '.pdf' ? 'raw' : 'auto';

        const uploadOptions = {
            folder: folderName,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: !fileName,
            type: 'upload',              
                access_mode: 'public',
                timeout: 60000
        };

        if (fileName) {
                const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
                uploadOptions.public_id = `${folderName}/${nameWithoutExt}`;
            }

            return await cloudinary.uploader.upload(filePath, uploadOptions);
        },
        
        // Strategy 2: Axios-based upload
        async () => {
            return await axiosCloudinaryUpload(filePath, folderName, fileName);
        }
    ];

    const MAX_ATTEMPTS = uploadStrategies.length * 2; // More attempts with multiple strategies
    const RETRY_DELAY_MS = 3000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const strategyIndex = Math.floor((attempt - 1) / 2) % uploadStrategies.length;
        
        try {
            console.log(`Upload Attempt ${attempt}/${MAX_ATTEMPTS} (Strategy ${strategyIndex + 1})`);
            
            const result = await uploadStrategies[strategyIndex]();
            
            // Clean up local file if needed
        if (!keepLocalFile) {
            try {
                fs.unlinkSync(filePath);
                console.log(`Local file deleted: ${filePath}`);
            } catch (deleteError) {
                console.warn(`Failed to delete local file: ${filePath}`, deleteError.message);
            }
        }

        return {
            success: true,
                url: result.secure_url || result.url,
                publicId: result.public_id || result.publicId,
                resourceType: result.resource_type || result.resourceType,
            format: result.format,
            bytes: result.bytes
        };

    } catch (error) {
            console.error(`Upload attempt ${attempt}/${MAX_ATTEMPTS} failed:`, error);

            // Final attempt
            if (attempt === MAX_ATTEMPTS) {
                // Clean up local file
        if (!keepLocalFile) {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                            console.log(`Local file deleted after final error: ${filePath}`);
                }
            } catch (deleteError) {
                        console.warn(`Failed to delete local file after final error: ${filePath}`, deleteError.message);
            }
        }

                throw new Error(`Failed to upload to Cloudinary after ${MAX_ATTEMPTS} attempts: ${error.message}`);
    }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw, auto)
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        return {
            success: result.result === 'ok',
            result: result.result,
            publicId: publicId
        };

    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
};

/**
 * Get Cloudinary URL for a public ID
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw, auto)
 * @param {Object} transformations - Optional transformations
 * @returns {string} - Cloudinary URL
 */
const getCloudinaryUrl = (publicId, resourceType = 'image', transformations = {}) => {
    try {
        return cloudinary.url(publicId, {
            secure: true,
            resource_type: resourceType,
            ...transformations
        });
    } catch (error) {
        console.error('Error generating Cloudinary URL:', error);
        throw new Error(`Failed to generate Cloudinary URL: ${error.message}`);
    }
};

/**
 * Get Cloudinary URL for PDF files (viewable in browser)
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Cloudinary URL for PDF viewing
 */
const getViewablePDFUrl = (publicId) => {
    try {
        // Use the cloudinary SDK to generate proper URL for raw files
        return cloudinary.url(publicId, {
            secure: true,
            resource_type: 'raw'
        });
    } catch (error) {
        console.error('Error generating viewable PDF URL:', error);
        throw new Error(`Failed to generate viewable PDF URL: ${error.message}`);
    }
};

/**
 * Get Cloudinary URL for PDF files
 * @param {string} publicId - Cloudinary public ID
 * @returns {string} - Cloudinary URL for PDF
 */
const getPDFUrl = (publicId) => {
    try {
        return cloudinary.url(publicId, {
            secure: true,
            resource_type: 'raw',
            flags: 'attachment' // This ensures the PDF is downloaded rather than displayed inline
        });
    } catch (error) {
        console.error('Error generating PDF URL:', error);
        throw new Error(`Failed to generate PDF URL: ${error.message}`);
    }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} filePaths - Array of file paths
 * @param {string} folderName - Cloudinary folder name
 * @returns {Promise<Array>} - Array of upload results
 */
const uploadMultipleToCloudinary = async (filePaths, folderName) => {
    try {
        const uploadPromises = filePaths.map((filePath, index) => 
            uploadToCloudinary(filePath, folderName, `file_${index}_${Date.now()}`)
        );

        const results = await Promise.allSettled(uploadPromises);
        
        return results.map((result, index) => ({
            index,
            filePath: filePaths[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));

    } catch (error) {
        console.error('Multiple upload error:', error);
        throw new Error(`Failed to upload multiple files: ${error.message}`);
    }
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
    getCloudinaryUrl,
    uploadMultipleToCloudinary,
    getPDFUrl,
    getViewablePDFUrl
}; 