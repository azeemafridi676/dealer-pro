import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../service/theme.service';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss'
})
export class SpinnerComponent implements OnInit {
  currentTheme$ = this.themeService.currentTheme$;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {}
}
