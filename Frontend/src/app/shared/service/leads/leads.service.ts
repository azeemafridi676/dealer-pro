import { Injectable } from '@angular/core';
import {  Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Lead } from '../../model/leads.model';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  private backendUrl = environment.BACKEND_URL;
  GET_LEADS=`${this.backendUrl}/api/leads/get-all`;
  constructor(private http:HttpClient) {}

  getLeads(pagesize:number,currentPage:number): Observable<Lead[]> {
    return this.http.get<Lead[]>(`${this.GET_LEADS}?pageSize=${pagesize}&currentPage=${currentPage}`);
  }
}
