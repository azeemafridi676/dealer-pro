// theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LoggingService } from './logging.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  SOURCE = 'theme.service.ts';
  private readonly DEFAULT_COLOR = '#3b82f6';
  
  // For backward compatibility
  private currentTheme = new BehaviorSubject<string>(this.DEFAULT_COLOR);
  currentTheme$ = this.currentTheme.asObservable();

  // For new color functionality
  private currentColor = new BehaviorSubject<string>(this.DEFAULT_COLOR);
  currentColor$ = this.currentColor.asObservable();

  constructor(private http: HttpClient, private loggingService: LoggingService) {
    // Load saved color on service initialization
    const savedColor = localStorage.getItem('primaryColor');
    if (savedColor) {
      this.applyColor(savedColor);
    } else {
      // Set default color
      this.applyColor(this.DEFAULT_COLOR);
    }
  }

  // For backward compatibility
  async setTheme(theme: string) {
    try {
      const response: any = await this.http.put(`${environment.BACKEND_URL}/api/theme`, { theme }).toPromise();
      if (response.success) {
        this.currentTheme.next(theme);
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
      }
    } catch (error) {
      console.error('Error setting theme:', error);
      // Still update local state even if API call fails
      this.currentTheme.next(theme);
      document.body.className = `theme-${theme}`;
      localStorage.setItem('theme', theme);
    }
  }

  // New color functionality
  async setColor(color: string) {
    try {
      const response: any = await this.http.put(`${environment.BACKEND_URL}/api/theme`, { color }).toPromise();
      if (response.success) {
        this.applyColor(color);
        localStorage.setItem('primaryColor', color);
        return { success: true };
      } else {
        throw new Error(response.message || 'Failed to update theme color');
      }
    } catch (error: any) {
      console.error('Error setting color:', error);
      // Log the error
  
      
      // Still update local state even if API call fails
      this.applyColor(color);
      localStorage.setItem('primaryColor', color);
      
      return { 
        success: false, 
        error: error.error?.message || error.message || 'Failed to update theme color'
      };
    }
  }

  private applyColor(color: string) {
    try {
      // Update the current color
      this.currentColor.next(color);      
      
      // Apply the colors to CSS variables
      const root = document.documentElement;
      root.style.setProperty('--primary-color-for-dynamic-theme', color);
      
      // Force a reflow to ensure the changes take effect
      root.style.display = 'none';
      root.offsetHeight; // Force reflow
      root.style.display = '';

    } catch (error) {
      console.error('Error applying color:', error);
    }
  }

  // Get current color
  getCurrentColor(): string {
    return this.currentColor.value;
  }

  private adjustColor(hex: string, percent: number): string {
    try {
      return hex.replace('#', '');
    } catch (error) {
      return hex; // Return original color if there's an error
    }
  }
}