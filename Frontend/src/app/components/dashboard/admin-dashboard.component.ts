import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { NavService } from 'src/app/shared/service/navbar/nav.service';
import { ThemeService } from 'src/app/shared/service/theme.service';
import { DashboardService } from 'src/app/shared/service/dashboard/dashboard.service';
import { DashboardData } from 'src/app/shared/service/dashboard/dashboard.service';
import { finalize, delay } from 'rxjs/operators';

// Comprehensive interfaces for recent data
interface RecentUser {
  id: string;
  first: string;
  last: string;
  email: string;
  role: string;
  active: boolean;
  lastLogin: Date;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  currentTheme$ = this.themeService.currentTheme$;

  // Loading state
  loading: boolean = true;
  loadingError: string | null = null;
  private readonly MINIMUM_LOADING_TIME = 250;

  // Dashboard data
  dashboardData: DashboardData = {
    totalUsers: 0,
    activeUsers: 0,
    totalVehicles: 0,
    vehicleStatusCounts: [],
    totalRevenue: 0,
    recentUsers: [],
    recentVehicles: [],
    recentAgreements: [],
    recentReceipts: []
  };

  // Flags for empty data
  isEmpty = {
    users: false,
    vehicles: false,
    agreements: false,
    receipts: false
  };

  constructor(
    private navService: NavService,
    private themeService: ThemeService,
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit() {
    this.navService.setTitle('Dashboard');
    this.navService.setSubtitle('Manage your dashboard');
    
    // Fetch dashboard data
    this.fetchDashboardData();
  }

  fetchDashboardData() {
    const startTime = Date.now();
    this.loading = true;
    this.loadingError = null;

    this.dashboardService.getDashboardData().pipe(
      delay(Math.max(0, this.MINIMUM_LOADING_TIME - (Date.now() - startTime))),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (response: { success: boolean, data: DashboardData }) => {
        if (response.success) {
          this.dashboardData = response.data;
          
          // Check for empty data
          this.isEmpty = {
            users: this.dashboardData.recentUsers.length === 0,
            vehicles: this.dashboardData.recentVehicles.length === 0,
            agreements: this.dashboardData.recentAgreements.length === 0,
            receipts: this.dashboardData.recentReceipts.length === 0
          };
        } else {
          this.loadingError = 'Failed to load dashboard data.';
        }
      },
      error: (error: Error) => {
        console.error('Failed to fetch dashboard data', error);
        this.loadingError = 'Failed to fetch dashboard data. Please try again.';
      }
    });
  }

  // Methods to handle "See More" actions with navigation
  onSeeMoreUsers() {
    this.router.navigate(['/dashboard/users']);
  }

  onSeeMoreVehicles() {
    this.router.navigate(['/dashboard/vehicles/warehouse']);
  }

  onSeeMoreAgreements() {
    this.router.navigate(['/dashboard/agreements']);
  }

  onSeeMoreReceipts() {
    this.router.navigate(['/dashboard/invoices']);
  }

  // Method to generate a consistent color based on the user's name
  getUserAvatarColor(user: any): string {
    // Simple hash function to generate a consistent color
    const hash = this.hashCode(user.first + user.last);
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-red-500', 'bg-yellow-500', 
      'bg-indigo-500', 'bg-teal-500', 'bg-orange-500'
    ];
    return colors[Math.abs(hash) % colors.length];
  }

  // Simple hash function to generate a consistent integer from a string
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
