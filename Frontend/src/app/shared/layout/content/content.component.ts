import {
  AfterViewInit,
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ThemeService } from '../../service/theme.service';
import { AuthService } from '../../service/Auth/Auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss'],  
})
export class ContentComponent implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isFilter = false;
  userName: string = '';
  currentTheme$ = this.themeService.currentTheme$;
  private userSubscription: Subscription = new Subscription();

  constructor(
    private themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get user details
    this.userSubscription = this.authService.getUserDetails().subscribe({
      next: (data) => {
        if (data && data.first_name) {
          this.userName = data.first_name;
        }
      }
    });
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.isFilter = this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
    this.isFilter = false;
  }
  
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }
}
