import { Component, OnInit, OnDestroy, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavService } from '../../service/nav.service';
import { LayoutService } from '../../service/layout/layout.service';
import { AuthService } from '../../service/Auth/Auth.service';
import { PermissionService } from '../../service/permissions/permission.service';
import { ThemeService } from '../../service/theme.service';
import { map, Observable, Subscription } from 'rxjs';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';

interface SubResource {
  title: string;
  route: string;
  icon: string;
}

interface Resource {
  resource_id: string;
  title: string;
  route: string;
  icon: string;
  position: string;
  has_subresources?: boolean;
  subresources?: SubResource[];
  permissions: {
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() isMobileMenuOpen: boolean = false;
  @Output() mobileMenuToggled = new EventEmitter<void>();
  
  isProfileMenuOpen: boolean = false;
  selectedItem: string | null = null;
  footerDark: any;
  footerLight: any;
  footerFix: any;
  Scorlled: any;
  permissions: any;
  isFilter = false;
  permissionLoad = false;
  public currentRoute: string = '/';
  public show: boolean = true;
  public userData: any = {};
  public width = window.innerWidth;
  public screenwidth: any = window.innerWidth;
  private routeSubscription: Subscription = new Subscription();
  activeDropdown: string | null = null;
  resources: Resource[] = [];
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    public navServices: NavService,
    public route: ActivatedRoute,
    public layout: LayoutService,
    public authService: AuthService,
    private router: Router,
    private permissionService: PermissionService,
    private breakpointObserver: BreakpointObserver,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    this.authService.getUserProfileData().subscribe();
    this.permissionService.loadPermissions().subscribe();
    
    this.permissionService.resources$.subscribe(resources => {
      console.log('resources', resources);
      // Convert resources object to array, filter out specific resources, and sort by position
      this.resources = Object.values(resources)
        .filter(resource => 
          resource.title !== 'Roles Management' && 
          resource.title !== 'Corporations' &&
          resource.title !== 'Users Management'
        )
        .sort((a, b) => parseInt(a.position) - parseInt(b.position));
    });

    this.authService.getUserDetails().subscribe({
      next: (data) => {
        this.userData = data || {};
      }
    });

    this.routeSubscription = this.router.events.subscribe(event => {
      this.currentRoute = this.router.url;
    });

    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.isMobileMenuOpen = false;
          this.isProfileMenuOpen = false;
          this.isFilter = false;
        } else {
          this.isMobileMenuOpen = false;
          this.isFilter = false;
        }
      });
      
    // Close dropdown when clicking outside
    document.addEventListener('click', this.closeDropdownOnClickOutside.bind(this));
  }

  hasPermission(resourceId: string, action: 'read' | 'create' | 'update' | 'delete'): boolean {
    return this.permissionService.hasPermission(resourceId, action);
  }

  toggleMobileMenu(): void {
    this.mobileMenuToggled.emit();
    if (this.isProfileMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  closeDropdownOnClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('#user-menu-button') && this.isProfileMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    this.mobileMenuToggled.emit();
  }

  toggleDropdown(dropdownName: string): void {
    this.activeDropdown = this.activeDropdown === dropdownName ? null : dropdownName;
  }

  selectItem(item: string) {
    this.selectedItem = this.selectedItem === item ? null : item;
  }
  
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.router.navigate(['/auth/login']);
  }

  ngOnDestroy(): void {
    this.routeSubscription.unsubscribe();
    document.removeEventListener('click', this.closeDropdownOnClickOutside.bind(this));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (window.innerWidth < 768) {
      this.isMobileMenuOpen = false;
      this.isProfileMenuOpen = false;
    }
  }

  hasSubResourcePermission(subResource: any): boolean {
    // If subResource has a permissions object, use it
    if (subResource.permissions) {
      return !!subResource.permissions.can_read;
    }
    // Fallback: use the permissionService if needed
    return this.permissionService.hasPermission(subResource.resource_id, 'read');
  }

  hasAnyVisibleSubResource(resource: Resource): boolean {
    return !!resource.subresources?.some(sub => this.hasSubResourcePermission(sub));
  }

  navigateToResource(resource: Resource): void {
    // Navigate to the main resource route
    this.router.navigate([resource.route]);
    // Toggle dropdown for mobile view
    if (window.innerWidth < 768) {
      this.toggleDropdown(resource.resource_id);
    }
  }
  getAllFilteredResources(): Observable<Resource[]> {
    const resourceTitles = ['Roles Management', 'Corporations', 'Users Management'];
    return this.permissionService.resources$.pipe(
      map(resources => {
        const filteredResources = Object.values(resources).filter(resource => 
          resourceTitles.includes(resource.title) &&
          this.hasPermission(resource.resource_id, 'read') &&
          (!resource.has_subresources || this.hasAnyVisibleSubResource(resource))
        );
        return filteredResources;
      })
    );
  }
}
