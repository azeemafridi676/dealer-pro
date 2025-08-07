import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoggingService } from '../logging.service';

@Injectable({
  providedIn: 'root'
})
export class SettingService {
  private readonly API_URL = `${environment.BACKEND_URL}/api/theme`;
  SOURCE = 'setting.service.ts';

  constructor(
    private http: HttpClient,
    private loggingService: LoggingService
  ) {}

  // Get current logo
  getLogo(): Observable<any> {
    return this.http.get(`${this.API_URL}/logo`);
  }

  // Upload new logo
  uploadLogo(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);

    return this.http.put(`${this.API_URL}/logo`, formData);
  }

  // Remove logo
  removeLogo(): Observable<any> {
    return this.http.delete(`${this.API_URL}/logo`);
  }

  // Get current theme
  getTheme(): Observable<any> {
    return this.http.get(this.API_URL);
  }

  // Update theme color
  updateTheme(color: string): Observable<any> {
    return this.http.put(this.API_URL, { color });
  }
}
