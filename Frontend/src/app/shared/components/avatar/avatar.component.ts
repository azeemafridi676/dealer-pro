import { Component, OnInit, Input } from '@angular/core';
import { ThemeService } from '../../service/theme.service';

@Component({
    selector: 'app-avatar-photo',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
})
export class AvatarPhotoComponent implements OnInit {

    @Input()
    public photoUrl: any;

    @Input()
    public name: any;

    public showInitials = false;
    public initials: any;
    public circleColor: any;
    currentTheme$ = this.themeService.currentTheme$;

    private colors = [
        'var(--primary-color)', 
        'var(--primary-color-dark)', 
    ];

    constructor(private themeService: ThemeService) {}

    ngOnInit() {

        if (!this.photoUrl) {
            this.showInitials = true;
            this.createInititals();

            const randomIndex = Math.floor(Math.random() * Math.floor(this.colors.length));
            this.circleColor = this.colors[randomIndex];
        }

    }

    private createInititals(): void {
        let initials = "";

        for (let i = 0; i < this.name.length; i++) {
            if (this.name.charAt(i) === ' ') {
                continue;
            }

            if (this.name.charAt(i) === this.name.charAt(i).toUpperCase()) {
                initials += this.name.charAt(i);

                if (initials.length == 2) {
                    break;
                }
            }
        }

        this.initials = initials;
    }
}