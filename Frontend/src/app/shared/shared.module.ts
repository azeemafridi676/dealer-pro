import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { LanguageComponent } from './components/header/language/language.component';
import { ModeComponent } from './components/header/mode/mode.component';
import { BookmarkComponent } from './components/header/bookmark/bookmark.component';
import { NotificationComponent } from './components/header/notification/notification.component';
import { MessageBoxComponent } from './components/header/message-box/message-box.component';
import { MaximiseComponent } from './components/header/maximise/maximise.component';
import { SearchComponent } from './components/header/search/search.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ContentComponent } from './layout/content/content.component';
import { FullComponent } from './layout/full/full.component';
import { AccountComponent } from './components/header/account/account.component';
import { TapToTopComponent } from './components/tap-to-top/tap-to-top.component';
import { FeatherIconComponent } from './components/feather-icon/feather-icon.component';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BreadcrumbComponent } from './components/breadcrumb/breadcrumb.component';
import { CustomizerComponent } from './components/customizer/customizer.component';
import { ColorComponent } from './components/customizer/color/color.component';
import { LayoutSettingComponent } from './components/customizer/layout-setting/layout-setting.component';
import { ProductboxService } from './service/product/productbox.service';
import { ProductBoxFilterService } from './service/product/product-box-filter.service';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { LayoutService } from './service/layout/layout.service';
import { AvatarPhotoComponent } from './components/avatar/avatar.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { SVGComponent } from './components/svg/svg.component';
import { NgxPermissionsModule } from 'ngx-permissions';
import { GobackComponent } from './components/goback/goback.component';
import { TagsComponent } from './components/tags/tags.component';
import { TagComponent } from './components/tag/tag.component';
import { TagFilterPipe } from './pipes/tag-filter.pipe';
import { SuggestionComponent } from './components/suggestions/suggestion.component';
import { UpgradeNotificationComponent } from './components/upgrade-notification/upgrade-notification.component';
import { MapPipe } from './pipes/binding.pipe';
import { JoinPipe } from './pipes/binding.pipe';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { ImageNotFoundDirective } from './directive/image-not-found.directive';
import { NavService } from './service/nav.service';
import { CustomSelectComponent } from './components/custom-select/custom-select.component';
@NgModule({
  declarations: [
    HeaderComponent,
    LanguageComponent,
    ModeComponent,
    BookmarkComponent,
    NotificationComponent,
    MessageBoxComponent,
    MaximiseComponent,
    SearchComponent,
    FooterComponent,
    NavbarComponent,
    ContentComponent,
    FullComponent,
    AccountComponent,
    TapToTopComponent,
    FeatherIconComponent,
    BreadcrumbComponent,
    CustomizerComponent,
    ColorComponent,
    LayoutSettingComponent,
    AvatarPhotoComponent,
    SpinnerComponent,
    SVGComponent,
    GobackComponent,
    TagsComponent, TagComponent, TagFilterPipe, SuggestionComponent,ImageNotFoundDirective, UpgradeNotificationComponent,
    MapPipe, JoinPipe, PageHeaderComponent, CustomSelectComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    TranslateModule.forRoot(),
    NgbModule,
    ReactiveFormsModule,
    NgxPermissionsModule.forRoot(),
    AngularSvgIconModule.forRoot(),
  ],
  exports: [
    HeaderComponent,
    LanguageComponent,
    ModeComponent,
    BookmarkComponent,
    NotificationComponent,
    MessageBoxComponent,
    MaximiseComponent,
    SearchComponent,
    FooterComponent,
    NavbarComponent,
    AvatarPhotoComponent,
    ContentComponent,
    FullComponent,
    AccountComponent,
    TapToTopComponent,
    FeatherIconComponent,
    BreadcrumbComponent,
    SpinnerComponent,
    GobackComponent,
    TagsComponent, TagComponent, TagFilterPipe, SuggestionComponent, UpgradeNotificationComponent,
    MapPipe, JoinPipe, PageHeaderComponent, ImageNotFoundDirective, CustomSelectComponent
  ],
  providers: [
    DecimalPipe,
    NavService,
    LayoutService,
    ProductboxService,
    ProductBoxFilterService,
  ],
})
export class SharedModule {}
