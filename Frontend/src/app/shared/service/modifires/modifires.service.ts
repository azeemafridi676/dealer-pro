import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ModifiresService {
  private backendUrl = environment.BACKEND_URL;
  private CREATE_MODIFIERS = `${this.backendUrl}/api/menuModifier/create`;
  private GET_ALL_MODIFIERS = `${this.backendUrl}/api/menuModifier/get-all-by-restaurant`;
  private DELETE_MODIFIER = `${this.backendUrl}/api/menuModifier/delete`;
  private GET_MODIFIER_BY_ID = `${this.backendUrl}/api/menuModifier/get`;
  private UPDATE_MODIFIER = `${this.backendUrl}/api/menuModifier/update`;
  constructor(private http: HttpClient) {}

  createModifier(modifierData: any): Observable<any> {
    return this.http.post<any>(this.CREATE_MODIFIERS, modifierData);
  }
  updateModifier(modifierId: string, modifierData: any): Observable<any> {
    return this.http.put<any>(`${this.UPDATE_MODIFIER}/${modifierId}`, modifierData);
  }
 

  getAllModifiers(): Observable<any> {
    return this.http.get<any>(this.GET_ALL_MODIFIERS);
  }
  deleteModifier(modifierId: string): Observable<any> {
    return this.http.delete<any>(`${this.DELETE_MODIFIER}/${modifierId}`);
  }
  getModifierById(modifierId: string): Observable<any> {
    return this.http.get<any>(`${this.GET_MODIFIER_BY_ID}/${modifierId}`);
  }

}
