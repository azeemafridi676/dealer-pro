const mongoose = require('mongoose');
const { Schema } = mongoose;

const roleSchema = new Schema({
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    corp_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Corp'
    },
    name: {
        type: String,
        required: true,
        unique: false
    },
    description: {
        type: String
    },
    is_system: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'roles'
});

// Create indexes
roleSchema.index({ role_id: 1 }, { unique: true });
roleSchema.index({ corp_id: 1 });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role; 