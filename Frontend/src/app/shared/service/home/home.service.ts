import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Review {
  name: string;
  rating: number;
  comment: string;
  duration: string;
  date?: Date;
}

export interface Stats {
  value: string;
  label: string;
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private backendUrl = environment.BACKEND_URL;
  private REVIEWS_API = `${this.backendUrl}/api/reviews`;

  private stats: Stats[] = [
    { value: '95%', label: 'Campaign Success Rate' },
    { value: '200+', label: 'Active Campaigns' },
    { value: '35+', label: 'Cities Covered' },
    { value: '2M+', label: 'Daily Impressions' }
  ];

  constructor(private http: HttpClient) {}

  getApprovedReviews(page: number = 1, limit: number = 6): Observable<PaginatedResponse<Review>> {
    return this.http.get<PaginatedResponse<Review>>(`${this.REVIEWS_API}/approved?page=${page}&limit=${limit}`);
  }

  getStats(): Stats[] {
    return this.stats;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase();
  }

  truncateName(name: string): string {
    const maxLength = 20;
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength) + '...';
  }

  getRatingStars(rating: number): string {
    const roundedRating = Math.round(rating);
    return '★'.repeat(roundedRating);
  }
} 