import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Review {
  _id: string;
  userId: string;
  name: string;
  rating: number;
  duration: string;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private backendUrl = environment.BACKEND_URL;
  private REVIEWS_API = `${this.backendUrl}/api/reviews`;

  constructor(private http: HttpClient) {}

  getReviews(): Observable<ApiResponse<Review[]>> {
    return this.http.get<ApiResponse<Review[]>>(`${this.REVIEWS_API}/my-reviews`);
  }

  getAllReviews(): Observable<ApiResponse<Review[]>> {
    return this.http.get<ApiResponse<Review[]>>(`${this.REVIEWS_API}/all`);
  }

  getReviewById(id: string): Observable<ApiResponse<Review>> {
    return this.http.get<ApiResponse<Review>>(`${this.REVIEWS_API}/${id}`);
  }

  createReview(reviewData: Partial<Review>): Observable<ApiResponse<Review>> {
    return this.http.post<ApiResponse<Review>>(`${this.REVIEWS_API}`, reviewData);
  }

  updateReview(id: string, reviewData: Partial<Review>): Observable<ApiResponse<Review>> {
    return this.http.put<ApiResponse<Review>>(`${this.REVIEWS_API}/${id}`, reviewData);
  }

  deleteReview(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.REVIEWS_API}/${id}`);
  }

  updateReviewStatus(id: string, status: Review['status']): Observable<ApiResponse<Review>> {
    return this.http.patch<ApiResponse<Review>>(`${this.REVIEWS_API}/${id}/status`, { status });
  }
}
