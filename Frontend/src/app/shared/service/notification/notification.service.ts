import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = `${environment.BACKEND_URL}/api/notifications`;
  private notifications = new BehaviorSubject<Notification[]>([]);
  private unreadCount = new BehaviorSubject<number>(0);

  constructor(
    private http: HttpClient
  ) {}

  getAllNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.API_URL}/all`);
  }

  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.API_URL}/unread`);
  }

  markAsRead(notificationIds: string[]): Observable<any> {
    return this.http.post(`${this.API_URL}/mark-read`, { notificationIds });
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(`${this.API_URL}/mark-all-read`, {});
  }

  refreshNotifications() {
    this.getAllNotifications().subscribe((notifications: any) => {
      this.notifications.next(notifications.data);
      this.updateUnreadCount(notifications.data);
    });
  }

  getNotificationsObservable(): Observable<Notification[]> {
    return this.notifications.asObservable();
  }

  getUnreadCountObservable(): Observable<number> {
    return this.unreadCount.asObservable();
  }

  private updateUnreadCount(notifications: Notification[]) {
    const unreadCount = notifications.filter(n => !n.read).length;
    this.unreadCount.next(unreadCount);
  }
} 