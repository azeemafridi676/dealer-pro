import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class SignAgreementService {
  private backendUrl = environment.BACKEND_URL;

  constructor(private http: HttpClient) {}

  signWithBankID(endUserIp: string, userVisibleData: string = '', userNonVisibleData: string = '', env: 'test' | 'live' = 'test'): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/agreements/bankid-sign`, {
      endUserIp,
      userVisibleData,
      userNonVisibleData,
      env
    });
  }

  collectStatus(orderRef: string, env: 'test' | 'live' = 'test'): Observable<any> {
    return this.http.post(`${this.backendUrl}/api/agreements/bankid-collect`, {
      orderRef,
      env
    });
  }
}
