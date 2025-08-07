import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../Auth/Auth.service';

// Add an interface for the modifier group
export interface ModifierGroup {
  _id?: string;
  name: string;
  description: string;
  plu: string;
  status: string;
  modifierIds: string[];
  minModifiers: number;
  maxModifiers: number;
  isRequired: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModifierGroupService {
  private apiUrl = `${environment.BACKEND_URL}/api/menuModifierGroup`;
  private modifierApiUrl = `${environment.BACKEND_URL}/api/menuModifier`;

  constructor(private http: HttpClient, private authService: AuthService) { }

  createModifierGroup(modifierGroup: ModifierGroup): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, modifierGroup);
  }

  getModifierGroupById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/get/${id}`);
  }

  getModifierGroups(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-all-by-restaurant`);
  }

  updateModifierGroup(id: string, modifierGroup: ModifierGroup): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${id}`, modifierGroup);
  }

  deleteModifierGroup(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${id}`);
  }

  getModifiersByGroupId(id: string): Observable<any> {
    return this.http.get(`${this.modifierApiUrl}/get-modifiers/${id}`);
  }

  getModifiersByRestaurantId(): Observable<any> {
    return this.http.get(`${this.modifierApiUrl}/get-all-by-restaurant`);
  }

  getModifierGroupsByRestaurantId(): Observable<any> {
    return this.http.get(`${this.apiUrl}/get-all-by-restaurant`);
  }
}
