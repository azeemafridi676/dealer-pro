import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent {
  public userName: string | any;
  public profileImg: 'assets/images/dashboard/profile.jpg' | any;

  constructor(public router: Router) {}

  logoutFunc() {
    // localStorage.clear();
    localStorage.removeItem('user');
    this.router.navigate(['auth/login']);
  }
}
