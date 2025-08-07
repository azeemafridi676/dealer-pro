import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, fromEvent, Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

export interface Menu {
  headTitle1?: any;
  headTitle2?: string;
  path?: string;
  title?: any;
  icon?: string;
  type?: string;
  badgeType?: string;
  badgeValue?: string;
  active?: boolean;
  bookmark?: boolean;
  children?: Menu[];
}
@Injectable({
  providedIn: 'root',
})
export class NavService {
  private unsubscriber: Subject<any> = new Subject();
  public screenWidth: BehaviorSubject<number> = new BehaviorSubject(
    window.innerWidth
  );

  // Search Box
  public search: boolean = false;

  // Language
  public language: boolean = false;

  // Collapse Sidebar
  public collapseSidebar: boolean = window.innerWidth < 991 ? true : false;

  // For Horizontal Layout Mobile
  public horizontal: boolean = window.innerWidth < 991 ? false : true;

  // Full screen
  public fullScreen: boolean = false;

  constructor(private router: Router) {
    this.setScreenWidth(window.innerWidth);
    fromEvent(window, 'resize')
      .pipe(debounceTime(1000), takeUntil(this.unsubscriber))
      .subscribe((evt: any) => {
        this.setScreenWidth(evt.target.innerWidth);
        if (evt.target.innerWidth < 991) {
          this.collapseSidebar = true;
        }
        if (evt.target.innerWidth < 1199) {
        }
      });
    if (window.innerWidth < 991) {
      // Detect Route change sidebar close
      this.router.events.subscribe((event) => {
        this.collapseSidebar = true;
      });
    }
  }

  private setScreenWidth(width: number): void {
    this.screenWidth.next(width);
  }

  MENUITEMS: Menu[] = [
    {
      headTitle1: 'General',
    },
    {
      title: 'Campaigns',
      icon: 'home',
      type: 'sub',
      badgeType: 'light-primary',
      active: true,
      children: [
        { path: '/view-campaigns', title: 'View Campaigns', type: 'link' },
        { path: '/add-campaigns', title: 'Add Campaigns', type: 'link' },
      ],
    },
    {
      title: 'Leeds',
      icon: 'shopping-bag',
      type: 'sub',
      badgeType: 'light-primary',
      children: [
        { path: '/view-leeds', title: 'View Leeds', type: 'link' },
      ],
    },
    {
      title: 'Email',
      icon: 'mail',
      type: 'sub',
      badgeType: 'light-primary',
      children: [
        { path: '/mail-inbox', title: 'Mail Inbox', type: 'link' },
        { path: '/mail-compose', title: 'Compose', type: 'link' },
      ],
    },
    {
      title: 'Chat',
      icon: 'message-square',
      type: 'sub',
      badgeType: 'light-primary',
      children: [
        { path: '/view-chat', title: 'View Chat', type: 'link' },
      ],
    },
    
  
  ];

  items = new BehaviorSubject<Menu[]>(this.MENUITEMS);
}
