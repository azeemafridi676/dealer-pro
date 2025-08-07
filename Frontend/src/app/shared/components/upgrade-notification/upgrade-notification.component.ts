import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { UpgradeNotificationService } from '../../service/upgrade-notifiication/upgrade-notificatiion.service';

@Component({
  selector: 'app-upgrade-notification',
  templateUrl: './upgrade-notification.component.html',
  animations: [
    trigger('slideDown', [
      state('void', style({ 
        transform: 'translateY(-100%)',
        opacity: 0
      })),
      state('*', style({ 
        transform: 'translateY(0)',
        opacity: 1
      })),
      transition('void => *', animate('300ms ease-out')),
      transition('* => void', animate('200ms ease-in'))
    ])
  ]
})
export class UpgradeNotificationComponent implements OnInit, OnDestroy {
  show = false;
  message = '';
  feature = '';
  private subscription: any;

  constructor(private upgradeNotificationService: UpgradeNotificationService) {}

  ngOnInit() {
    this.subscription = this.upgradeNotificationService.notification$.subscribe(notification => {
      this.show = notification.show;
      this.message = notification.message;
      this.feature = notification.feature;
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  close() {
    this.upgradeNotificationService.hideUpgradeNotification();
  }
}