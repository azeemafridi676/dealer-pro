import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/shared/service/Auth/Auth.service';
import { LoggingService } from 'src/app/shared/service/logging.service';
import { ThemeService } from 'src/app/shared/service/theme.service';

@Component({
  selector: 'app-auth-callback',
  template: `
    <div class="h-screen flex items-center justify-center ">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p class="mt-4 text-primary/60">Completing authentication...</p>
      </div>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private readonly SOURCE = 'auth-callback.component.ts';
  currentTheme$ = this.themeService.currentTheme$;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private loggingService: LoggingService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const accessToken = params['accessToken'];
      const refreshToken = params['refreshToken'];

      if (accessToken && refreshToken) {
        this.authService.handleGoogleCallback(accessToken, refreshToken);
        const user = this.authService.getDecodedToken();
        if (user?.role === 'admin') {
          this.router.navigate(['/dashboard/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
} 