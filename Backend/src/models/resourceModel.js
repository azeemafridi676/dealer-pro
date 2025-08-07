const mongoose = require('mongoose');
const { Schema } = mongoose;

const subResourceSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    route: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    }
});

const resourceSchema = new Schema({
    resource_id: {
        type: String,
        required: true
    },
    resource_active: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        required: true,
        unique: true
    },
    position: {
        type: Number,
        required: true
    },
    route: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    is_public: {
        type: Boolean,
        default: true
    },
    has_subresources: {
        type: Boolean,
        default: false
    },
    subresources: [subResourceSchema]
}, {
    timestamps: true,
    collection: 'resources'
});

// Create indexes
resourceSchema.index({ resource_id: 1 }, { unique: true });
resourceSchema.index({ route: 1 }, { unique: true });
resourceSchema.index({ icon: 1 }, { unique: true });

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource; 