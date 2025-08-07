import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RolesService } from 'src/app/shared/service/roles/roles.service';
import { modalAnimation } from 'src/app/shared/animations/modal.animations';
import { ToastrService } from 'ngx-toastr';
import { PermissionService } from 'src/app/shared/service/permissions/permission.service';
import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { finalize, delay } from 'rxjs/operators';

interface SubResource {
    resource_id: string;
    title: string;
    route: string;
    icon: string;
    position: number;
    permissions: {
        can_read: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
    };
}

interface Resource {
    resource_id: string;
    title: string;
    route: string;
    icon: string;
    position: number;
    has_subresources: boolean;
    subresources: SubResource[];
    permissions: {
        can_read: boolean;
        can_create: boolean;
        can_update: boolean;
        can_delete: boolean;
    };
}

interface Role {
    role_id: string;
    name: string;
    description: string;
    is_system: boolean;
    permissions: { [key: string]: Resource };
    permissionsCount: number;
}

@Component({
    selector: 'app-roles',
    templateUrl: './roles.component.html',
    styleUrls: ['./roles.component.scss'],
    animations: [modalAnimation],
})
export class RolesComponent implements OnInit {
    roles: Role[] = [];
    selectedId: string = '';
    updatedRoles: { [key: string]: any } = {};
    isVisible = false;
    roleForm: FormGroup;
    loading = false;
    searchTerm: string = '';
    filteredRoles: Role[] = [];
    currentTheme$ = this.themeService.currentTheme$;

    // Accordion state: expanded by default for all resources with subresources
    expandedResources: { [resourceId: string]: boolean } = {};
    private readonly MINIMUM_LOADING_TIME = 250; // Minimum time to show loading state in ms

    constructor(
        private roleService: RolesService,
        private fb: FormBuilder,
        private toastr: ToastrService,
        private navService: NavService,
        private permissionService: PermissionService,
        private themeService: ThemeService
    ) { 
        this.roleForm = this.fb.group({
            name: ['', Validators.required],
            description: ['', Validators.required]
        });
    }

    ngOnInit(): void {
        this.loadRoles();
        this.navService.setTitle('Roles Management');
        this.navService.setSubtitle('Manage your roles');
    }

    loadRoles(): void {
        this.loading = true;
        const startTime = Date.now();

        this.roleService.getResources().pipe(
            delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))), // Ensure minimum loading time
            finalize(() => {
                this.loading = false;
            })
        ).subscribe({
            next: (response: any) => {
                if (response.success) {
                    this.roles = response.data;
                    this.filteredRoles = [...this.roles];
                    this.initializeUpdatedRoles();
                    this.setAllExpanded();
                } else {
                    this.toastr.error('Failed to load roles');
                }
            },
            error: (error: any) => {
                console.error('Error loading roles:', error);
                this.toastr.error('Failed to load roles');
            }
        });
    }

    selectRole(id: string): void {
        this.selectedId = this.selectedId === id ? '' : id;
    }

    initializeUpdatedRoles(): void {
        this.updatedRoles = {};
        this.roles.forEach(role => {
            this.updatedRoles[role.role_id] = Object.values(role.permissions).map((resource: any) => ({
                ...resource,
                view: resource.permissions.can_read,
                add: resource.permissions.can_create,
                edit: resource.permissions.can_update,
                delete: resource.permissions.can_delete,
                subresources: (resource.has_subresources && resource.subresources) ? resource.subresources.map((sub: any) => ({
                    ...sub,
                    resource_id: sub.resource_id || sub._id, // fallback for compatibility
                    route: sub.route,
                    view: sub.permissions.can_read,
                    add: sub.permissions.can_create,
                    edit: sub.permissions.can_update,
                    delete: sub.permissions.can_delete
                })) : []
            }));
        });
    }

    updatePermission(roleId: string, resourceId: string, action: string, event: any): void {
        const checked = event.target.checked;
        const resources = this.updatedRoles[roleId];

        // Try to find as main resource first
        const resource = resources.find((r: any) => r.resource_id === resourceId);
        if (resource) {
            switch (action) {
                case 'view': resource.view = checked; break;
                case 'add': resource.add = checked; break;
                case 'edit': resource.edit = checked; break;
                case 'delete': resource.delete = checked; break;
            }
            return;
        }

        // If not found, look in subresources
        for (const res of resources) {
            if (res.has_subresources && res.subresources) {
                const sub = res.subresources.find((s: any) => s.resource_id === resourceId);
                if (sub) {
                    switch (action) {
                        case 'view': sub.view = checked; break;
                        case 'add': sub.add = checked; break;
                        case 'edit': sub.edit = checked; break;
                        case 'delete': sub.delete = checked; break;
                    }
                    return;
                }
            }
        }
    }

    applyChanges() {
        this.loading = true;
        const startTime = Date.now();
        const selectedRole = this.roles.find(role => role.role_id === this.selectedId);
        if (!selectedRole) {
            this.loading = false;
            return;
        }

        // Format permissions for the selected role
        const formattedPermissions = this.updatedRoles[this.selectedId].map((resource: any) => ({
            resource_id: resource.resource_id,
            can_read: resource.view,
            can_create: resource.add,
            can_update: resource.edit,
            can_delete: resource.delete,
            subresources: resource.has_subresources
                ? resource.subresources.map((sub: any) => ({
                    resource_id: sub.resource_id,
                    route: sub.route,
                    can_read: sub.view,
                    can_create: sub.add,
                    can_update: sub.edit,
                    can_delete: sub.delete
                }))
                : []
        }));

        const updatedRoles = [{
            roleId: this.selectedId,
            permissions: formattedPermissions
        }];

        this.roleService.updateAllRolesPermissions(updatedRoles).pipe(
            delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
            finalize(() => {
                this.loading = false;
            })
        ).subscribe({
            next: (response) => {
                if (response.success) {
                    const index = this.roles.findIndex(role => role.role_id === this.selectedId);
                    if (index !== -1) {
                        this.roles[index] = response.data;
                        this.filteredRoles = this.roles;
                    }
                    this.toastr.success('Permissions updated successfully', 'Success');
                } else {
                    this.toastr.error(response.message || 'Failed to update permissions', 'Error');
                }
            },
            error: (error) => {
                console.error('Error updating permissions:', error);
                this.toastr.error(error.error?.message || 'Failed to update permissions', 'Error');
            }
        });
    }

    openModal() {
        this.isVisible = true;
    }

    closeModal() {
        this.isVisible = false;
        this.roleForm.reset();
    }

    onSubmit() {
        if (this.roleForm.valid) {
            this.loading = true;
            const startTime = Date.now();
            
            const roleData = {
                ...this.roleForm.value
            };
            
            this.roleService.createRole(roleData).pipe(
                delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
                finalize(() => {
                    this.loading = false;
                })
            ).subscribe({
                next: (response: any) => {
                    this.toastr.success('Role created successfully');
                    this.loadRoles();
                    this.closeModal();
                },
                error: (error: any) => {
                    this.toastr.error(error.message || 'Failed to create role');
                },
            });
        } else {
            this.toastr.error('Please fill in all required fields');
        }
    }

    filterRoles() {
        if (!this.searchTerm.trim()) {
            this.filteredRoles = [...this.roles];
            return;
        }
        
        const searchLower = this.searchTerm.toLowerCase();
        this.filteredRoles = this.roles.filter(role => 
            role.name.toLowerCase().includes(searchLower) || 
            role.description.toLowerCase().includes(searchLower)
        );
    }

    setAllExpanded(): void {
        // For each role, for each resource, if has_subresources, set expanded true
        this.expandedResources = {};
        this.roles.forEach(role => {
            Object.values(role.permissions).forEach((resource: any) => {
                if (resource.has_subresources) {
                    this.expandedResources[resource.resource_id] = true;
                }
            });
        });
    }

    toggleResource(resourceId: string): void {
        this.expandedResources[resourceId] = !this.expandedResources[resourceId];
    }

    isExpanded(resourceId: string): boolean {
        return !!this.expandedResources[resourceId];
    }
}
