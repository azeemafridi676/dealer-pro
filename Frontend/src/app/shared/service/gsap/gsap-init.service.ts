import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Injectable({
  providedIn: 'root'
})
export class GsapInitService {
  public init(): Promise<void> {
    return new Promise<void>((resolve) => {
      gsap.registerPlugin(ScrollTrigger);
      resolve();
    });
  }
} 