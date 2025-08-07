import { Component, HostListener, Input, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../service/Auth/Auth.service';
// import { SocketService } from '../../service/socket/socket.service';
// import { NotificationService } from '../../service/notification/notification.service';
import { Subscription } from 'rxjs';
import { NavService } from '../../service/navbar/nav.service';
import { ThemeService } from '../../service/theme.service';

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html'
})
export class PageHeaderComponent implements OnInit, OnDestroy {
  user: any;
  notifications: any[] = [];
  unreadCount: number = 0;
  private subscriptions: Subscription[] = [];
  title: string = '';
  subtitle: string = '';
  
  isNotificationsOpen: boolean = false;
  isProfileDropdownOpen: boolean = false;
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    private authService: AuthService,
    // private socketService: SocketService,
    // private notificationService: NotificationService,
    private navService: NavService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.navService.getTitle().subscribe(title => {
        this.title = title;
      }),
      this.navService.getSubtitle().subscribe(subtitle => {
        this.subtitle = subtitle;
      })
    );
    this.loadInitialData();
    this.setupSocketListeners();
  }

  private loadInitialData(): void {
    // Load user data
    this.subscriptions.push(
      this.authService.getUserProfileData().subscribe((user) => {
        this.user = user;
      })
    );

    // Load notifications
    this.refreshNotifications();
  }

  private setupSocketListeners(): void {
    // this.subscriptions.push(
    //   this.socketService.getNotifications().subscribe(() => {
    //     this.refreshNotifications();
    //   })
    // );
  }

  private refreshNotifications(): void {
    // this.notificationService.refreshNotifications();
    // this.subscriptions.push(
    //   this.notificationService.getNotificationsObservable().subscribe(notifications => {
    //     this.notifications = notifications;
    //   }),
    //   this.notificationService.getUnreadCountObservable().subscribe(count => {
    //     this.unreadCount = count;
    //   })
    // );
  }

  // markAllAsRead(): void {
  //   this.notificationService.markAllAsRead().subscribe(() => {
  //     this.refreshNotifications();
  //   });
  // }
  // markAsRead(notificationId: string): void {
  //   this.notificationService.markAsRead([notificationId]).subscribe(() => {
  //     this.refreshNotifications();
  //   });
  // }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.isProfileDropdownOpen = false;
    }
  }
  toggleProfileDropdown(event: Event): void {
    event.stopPropagation();
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
    if (this.isProfileDropdownOpen) {
      this.isNotificationsOpen = false;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'campaign_created':
        return 'ri-file-list-line';
      case 'campaign_approved':
        return 'ri-check-line';
      case 'campaign_rejected':
        return 'ri-close-line';
      case 'support_message':
        return 'ri-message-2-line';
      case 'system_update':
        return 'ri-system-line';
      default:
        return 'ri-notification-3-line';
    }
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  logout() {
    this.authService.logout();
  }

  @HostListener('document:click')
  closeDropdowns(): void {
    this.isNotificationsOpen = false;
    this.isProfileDropdownOpen = false;
  }
}