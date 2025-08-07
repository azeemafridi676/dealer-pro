import { HttpClient, HttpClientModule ,HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule, isDevMode, APP_INITIALIZER } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ComponentsModule } from './components/components.module';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule } from 'ngx-toastr'; // Import ToastrModule
import { AuthGuard } from './shared/guard/auth.guard';
import { NgxPermissionsModule } from 'ngx-permissions';
import { AuthInterceptor } from './shared/interceptor/auth.interceptor';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { menuReducer } from './shared/reducer/menu.reducer';
import { MenuEffects } from './shared/effects/menu.effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { GsapInitService } from './shared/service/gsap/gsap-init.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RecaptchaModule, RECAPTCHA_SETTINGS, RecaptchaSettings } from 'ng-recaptcha';
import { environment } from '../environments/environment';
import { DragDropModule } from '@angular/cdk/drag-drop';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Factory function for APP_INITIALIZER
export function initializeGsap(gsapInitService: GsapInitService) {
  return () => gsapInitService.init();
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    MatSlideToggleModule,
    BrowserModule,
    AppRoutingModule,
    SharedModule,
    RouterModule,
    BrowserAnimationsModule,
    FormsModule,
    ToastrModule.forRoot(),
    HttpClientModule,
    NgbModule,
    HammerModule,
    ComponentsModule,
    AngularSvgIconModule.forRoot(),
    NgxPermissionsModule.forRoot(),
    ReactiveFormsModule,
    DragDropModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    StoreModule.forRoot({ state: menuReducer }),
    EffectsModule.forRoot([MenuEffects]),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      autoPause: true, 
      connectInZone: true,
      trace: false,
      traceLimit: 75,
      stateSanitizer: (state) => state, 
      actionSanitizer: (action) => action, 
    }),
    RecaptchaModule,
  ],
  providers: [
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeGsap,
      deps: [GsapInitService],
      multi: true
    },
    {
      provide: RECAPTCHA_SETTINGS,
      useValue: {
        siteKey: environment.RECAPTCHA_SITE_KEY
      } as RecaptchaSettings
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
