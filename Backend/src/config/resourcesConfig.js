const resources = [
    {
        position:1,
        resource_id: 'USERS',
        title: 'Users Management',
        route: '/dashboard/users',
        icon: 'ri-group-line',
        description: 'Manage system users'
    },
    {
        position:0,
        resource_id: 'DASHBOARD',
        title: 'Dashboard',
        route: '/dashboard',
        icon: 'ri-dashboard-line',
        description: 'Manage Dashboard'
    },
    {
        position:2,
        resource_id: 'ROLES',
        title: 'Roles Management',
        route: '/dashboard/roles',
        icon: 'ri-p2p-line',
        description: 'Manage system roles'
    },
    {
        position:3,
        resource_id: 'CORPORATIONS',
        title: 'Corporations',
        route: '/dashboard/corporations',
        icon: 'ri-building-2-line', 
        description: 'Manage corporations'
    },
    {
        position:4,
        resource_id: 'CUSTOMERS',
        title: 'Customers',
        route: '/dashboard/customers',
        icon: 'ri-user-3-line',
        description: 'Manage customers'
    },
    {
        position:8,
        resource_id: 'VEHICLES',
        title: 'Vehicles',
        route: '/dashboard/vehicles',
        icon: 'ri-car-line',
        description: 'Manage vehicles',
        has_subresources: false
       
    },
    {
        position:9,
        resource_id: 'AGREEMENTS',
        title: 'Agreements',
        route: '/dashboard/agreements',
        icon: 'ri-file-list-3-line',
        description: 'Manage agreements',
        has_subresources: false
      
    },
    {
        position:10,
        resource_id: 'SWISH',
        title: 'Swish',
        route: '/dashboard/swish',
        icon: 'ri-bank-card-line',
        description: 'Manage Swish',
        has_subresources: false
    },
    {
        position:11,
        resource_id: 'INVOICES',
        title: 'Invoices',
        route: '/dashboard/invoices',
        icon: 'ri-file-text-line',
        description: 'Manage invoices',
        has_subresources: false
    }
];

module.exports = resources;