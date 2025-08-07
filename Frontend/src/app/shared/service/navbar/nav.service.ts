import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavService {
  private title = new BehaviorSubject<string>('');
  private subtitle = new BehaviorSubject<string>('');
  constructor( ) { }
  setTitle(title: string): void {
      this.title.next(title);
  }
  getTitle(): Observable<string> {
    return this.title.asObservable();
  }
  setSubtitle(subtitle: string): void {
    this.subtitle.next(subtitle);
  }
  getSubtitle(): Observable<string> {
    return this.subtitle.asObservable();
  }
} 