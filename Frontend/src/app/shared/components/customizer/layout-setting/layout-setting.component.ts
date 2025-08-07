import { Component, HostBinding, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LayoutService } from '../../../service/layout/layout.service';

@Component({
  selector: 'app-layout-setting',
  templateUrl: './layout-setting.component.html',
  styleUrls: ['./layout-setting.component.scss'],
})
export class LayoutSettingComponent {
  public customizer: string = '';
  public sidebarType: string = '';
  public layoutType: any = 'ltr';

  public sidebarSetting: string = 'default-sidebar';
  public screenwidth: any = window.innerWidth;
  public MIXLayout: string = 'default';
  @HostBinding('@.disabled')
  public selectedValue: any;

  constructor(public layout: LayoutService) {}

  ngOnInit(): void {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.screenwidth = event.target.innerWidth;
  }

  Customizer(val: any) {
    this.customizer = val;
  }

  customizeSidebarType(val: any) {
    this.sidebarType = val;
    this.layout.config.settings.sidebar = val;
    // if (val == 'horizontal-wrapper') {
    //   document.getElementsByTagName('body')[0].setAttribute('had', val);
    // } else {
    //   document.getElementsByTagName('body')[0].removeAttribute('had');
    // }
  }

  customizeLayoutType(val: any) {
    this.layoutType = val;
    this.layout.config.settings.layout_type = val;
    document.getElementsByTagName('html')[0].removeAttribute('dir');
    document.getElementsByTagName('body')[0].removeAttribute('class');

    document.body?.classList.remove('box-layout');
    if (val == 'rtl' || val == 'ltr') {
      document.getElementsByTagName('html')[0].setAttribute('dir', val);
      document.getElementsByTagName('body')[0].setAttribute('class', val);
    } else {
      document.body?.classList.add('box-layout');
    }
  }

  prepareRoute(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }

  getAnimation() {
    if (this.selectedValue) {
      localStorage.setItem(
        'animate',
        this.selectedValue || localStorage.getItem('animate')
      );
      window.location.reload();
    }
  }
}
