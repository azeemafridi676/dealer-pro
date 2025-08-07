import { Component } from '@angular/core';
import { NavService } from '../../../../shared/service/nav.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
})
export class LanguageComponent {
  public language: boolean = false;

  public languages: any[] = [
    {
      language: 'English',
      code: 'en',
      type: 'US',
      icon: 'us',
    },
    {
      language: 'Español',
      code: 'es',
      icon: 'es',
    },
    {
      language: 'Français',
      code: 'fr',
      icon: 'fr',
    },
    {
      language: 'Português',
      code: 'pt',
      type: 'BR',
      icon: 'pt',
    },
  ];

  public selectedLanguage: any = {
    language: 'English',
    code: 'en',
    type: 'US',
    icon: 'us',
  };

  constructor(
    public navServices: NavService,
    private translate: TranslateService
  ) {}
  //
  ngOnInit() {}

  changeLanguage(lang: { code: string }) {
    this.translate.use(lang.code);
    this.selectedLanguage = lang;
  }
}
