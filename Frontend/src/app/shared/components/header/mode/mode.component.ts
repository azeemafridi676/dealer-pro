import { Component } from '@angular/core';
import { LayoutService } from '../../../service/layout/layout.service';

@Component({
  selector: 'app-mode',
  templateUrl: './mode.component.html',
  styleUrls: ['./mode.component.scss'],
})
export class ModeComponent {
  public dark: boolean =
    this.layout.config.settings.layout_version == 'dark-only' ? true : false;

  constructor(public layout: LayoutService) {}
}
