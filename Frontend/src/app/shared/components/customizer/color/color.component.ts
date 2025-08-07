import { DOCUMENT } from '@angular/common';
import { Component, HostBinding, Inject, OnInit } from '@angular/core';
import { LayoutService } from '../../../service/layout/layout.service';

@Component({
  selector: 'app-color',
  templateUrl: './color.component.html',
  styleUrls: ['./color.component.scss'],
})
export class ColorComponent {
  public MIXLayout: string = 'default';
  @HostBinding('@.disabled')
  public selectedValue: any;
  public primary_color: string = '#534686';
  public secondary_color: string = '#FFA47A';

  constructor(public layout: LayoutService) {}

  ngOnInit(): void {}

  applyColor() {
    document.documentElement.style.setProperty(
      '--theme-default',
      this.primary_color
    );
    document.documentElement.style.setProperty(
      '--theme-secondary',
      this.secondary_color
    );
    this.layout.config.color.primary_color = this.primary_color;
    this.layout.config.color.secondary_color = this.secondary_color;
  }
  resetColor() {
    document.documentElement.style.setProperty('--theme-default', '#534686');
    document.documentElement.style.setProperty('--theme-secondary', '#FFA47A');
    (<HTMLInputElement>document.getElementById('ColorPicker1')).value =
      '#534686';
    (<HTMLInputElement>document.getElementById('ColorPicker2')).value =
      '#FFA47A';
    this.layout.config.color.primary_color = '#534686';
    this.layout.config.color.secondary_color = '#FFA47A';
  }

  customizeMixLayout(val: any) {
    this.MIXLayout = val;
    this.layout.config.settings.layout_version = val;
    document.body?.classList.remove('light-only', 'dark-only');
    if (val === 'default') {
      document.body?.classList.add('light-only');
    } else {
      document.body?.classList.add('dark-only');
    }
  }
}
