const mongoose = require('mongoose');

// Helper function to validate hex color
const isValidHexColor = (color) => {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
};

const themeSchema = new mongoose.Schema({
    corp_id: {
        type: String,
        required: [true, 'Corporation ID is required'],
        ref: 'Corp'
    },
    theme: {
        type: String,
        default: '#3b82f6',
        validate: {
            validator: isValidHexColor,
            message: props => `${props.value} is not a valid hex color code!`
        }
    },
    updated_by: {
        type: String,
        required: [true, 'User ID of updater is required'],
        ref: 'User'
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Add index for faster queries
themeSchema.index({ corp_id: 1 }, { unique: true });

const Theme = mongoose.model('Theme', themeSchema);

module.exports = Theme;
