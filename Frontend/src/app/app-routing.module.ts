import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContentComponent } from './shared/layout/content/content.component';
import { content } from './shared/routes/routes/routers';
import { LoginComponent } from './components/Auth/login/login.component';
import { OtpComponent } from './components/Auth/otp/otp.component';
import { AuthGuard } from './shared/guard/auth.guard';
import { ForgetPasswordComponent } from './components/Auth/forget-password/forget-password.component';
import { ResetPasswordComponent } from './components/Auth/reset-password/reset-password.component';
import { SignUpComponent } from './components/Auth/sign-up/sign-up.component';
import { HomeComponent } from './website/home.component';
import { AuthCallbackComponent } from './components/Auth/auth-callback/auth-callback.component';
import { SignAgreementComponent } from './components/agreement/sign-agreement/sign-agreement.component';
import { OrgRegistrationComponent } from './components/Auth/org-registration/org-registration.component';
import { OtpOrgRegistrationComponent } from './components/Auth/otp-org-registration/otp-org-registration.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    data: { animation: 'LoginPage' },
  },
  {
    path: 'sign-up',
    component: SignUpComponent,
    data: { animation: 'SignUpPage' },
  },
  {
    path: '',
    component: HomeComponent,
    data: { animation: 'HomePage' },
  },
  {
    path: 'otp',
    component: OtpComponent,
    data: { animation: 'OtpPage' },
  },
  {
    path: 'forgot-password',
    component: ForgetPasswordComponent,
    data: { animation: 'ForgotPasswordPage' },
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    data: { animation: 'ResetPasswordPage' },
  },
  {
    path: 'auth/callback',
    component: AuthCallbackComponent,
  },
  {
    path: 'sign/:id',
    component: SignAgreementComponent,
    data: { animation: 'SignPage' },
  },
  {
    path: 'org-registration',
    component: OrgRegistrationComponent,
    data: { animation: 'OrgRegistrationPage' },
  },
  {
    path: 'otp-org-registration',
    component: OtpOrgRegistrationComponent,
    data: { animation: 'OtpOrgRegistrationPage' },
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    component: ContentComponent,
    children: content,
    data: { animation: 'DashboardPage' },
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
