import { Component, Input, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-svg',
    template: '',
    styles: [`.svg-icon { width: 24px; height: 24px; }`]
})
export class SVGComponent implements OnInit {
    @Input() isActive = false;
    @Input() src: string = '';
    @Input() name: string = '';


    constructor(
        private sanitizer: DomSanitizer,
        private elementRef: ElementRef,
        private renderer: Renderer2
    ) {}

    ngOnInit() {
        
       
    }

}