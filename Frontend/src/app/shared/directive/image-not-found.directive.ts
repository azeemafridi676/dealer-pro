import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appImageNotFound]'
})
export class ImageNotFoundDirective {
  private readonly fallbackImage: string = 'assets/images/default-order-image.jpg';

  constructor(private elementRef: ElementRef) {
    console.log('ImageNotFoundDirective initialized');
  }

  @HostListener('error')
  onError() {
    const element = this.elementRef.nativeElement as HTMLImageElement;
    console.log('Image error detected for:', element.src);
    console.log('Attempting to set fallback image:', this.fallbackImage);
    
    element.src = this.fallbackImage;
    
    // Add another error listener to check if fallback also fails
    element.addEventListener('error', () => {
      console.error('Fallback image also failed to load:', this.fallbackImage);
    }, { once: true });
  }
} 