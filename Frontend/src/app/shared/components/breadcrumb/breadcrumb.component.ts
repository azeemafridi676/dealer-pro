import { Component, Input, OnInit } from '@angular/core';
import { ThemeService } from '../../service/theme.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
})
export class BreadcrumbComponent implements OnInit {
  @Input() title: any;
  @Input() items!: any[];
  @Input() active_item: any;
  currentTheme$ = this.themeService.currentTheme$;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {}
}
