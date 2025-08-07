const mongoose = require('mongoose');
const { Schema } = mongoose;

const subResourcePermissionSchema = new Schema({
    subresource_route: {
        type: String,
        required: true
    },
    can_read: {
        type: Boolean,
        default: false
    },
    can_create: {
        type: Boolean,
        default: false
    },
    can_update: {
        type: Boolean,
        default: false
    },
    can_delete: {
        type: Boolean,
        default: false
    }
});

const permissionSchema = new Schema({
    permission_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Role'
    },
    resource_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Resource'
    },
    can_read: {
        type: Boolean,
        default: false
    },
    can_create: {
        type: Boolean,
        default: false
    },
    can_update: {
        type: Boolean,
        default: false
    },
    can_delete: {
        type: Boolean,
        default: false
    },
    subresource_permissions: [subResourcePermissionSchema]
}, {
    timestamps: true,
    collection: 'permissions'
});

// Create indexes
permissionSchema.index({ permission_id: 1 }, { unique: true });
permissionSchema.index({ role_id: 1 });
permissionSchema.index({ resource_id: 1 });

const Permission = mongoose.model('Permission', permissionSchema);

module.exports = Permission; 