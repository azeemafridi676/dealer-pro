import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UpgradeNotification {
  show: boolean;
  message: string;
  feature: string;
}

@Injectable({
  providedIn: 'root'
})
export class UpgradeNotificationService {
  private notificationSubject = new BehaviorSubject<UpgradeNotification>({
    show: false,
    message: '',
    feature: '',
  });

  notification$ = this.notificationSubject.asObservable();

  showUpgradeNotification(notification: UpgradeNotification) {
    this.notificationSubject.next({ ...notification, show: true });
  }

  hideUpgradeNotification() {
    this.notificationSubject.next({ ...this.notificationSubject.value, show: false });
  }
}