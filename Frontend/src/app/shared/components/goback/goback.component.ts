import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../service/theme.service';

@Component({
    selector: 'app-goback',
    templateUrl: './goback.component.html',
    styleUrls: ['./goback.component.scss'],
})
export class GobackComponent implements OnInit {
    currentTheme$ = this.themeService.currentTheme$;

    constructor(
        private location: Location,
        private themeService: ThemeService
    ) {}

    ngOnInit(): void {}

    goBack(): void {
        this.location.back();
    }
}