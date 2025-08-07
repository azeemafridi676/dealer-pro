const mongoose = require('mongoose');

const deviceVerificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    device_id: {
        type: String,
        required: true
    },
    device_name: {
        type: String,
        required: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    otp: {
        type: String
    },
    otp_expires_at: {
        type: Date
    },
    last_otp_sent_at: {
        type: Date
    },
    otp_attempts: {
        type: Number,
        default: 0
    },
    last_verified_at: {
        type: Date
    }
}, {
    timestamps: true
});

// Create compound index for user_id and device_id
deviceVerificationSchema.index({ user_id: 1, device_id: 1 }, { unique: true });

const DeviceVerification = mongoose.model('DeviceVerification', deviceVerificationSchema);

module.exports = DeviceVerification; 