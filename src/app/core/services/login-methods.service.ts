import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LoginMethod = 'wallet' | 'x509';

export interface LoginMethods {
  methods: LoginMethod[];
  essential_level?: string;
}

export interface WalletRequest {
  authRequest: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class LoginMethodsService {
  private readonly http = inject(HttpClient);

  getMethods(state: string): Observable<LoginMethods> {
    return this.http.get<LoginMethods>(`${environment.api_base_url}/api/login/methods`, { params: { state } });
  }

  startWallet(state: string): Observable<WalletRequest> {
    return this.http.post<WalletRequest>(`${environment.api_base_url}/api/login/wallet`, null, { params: { state } });
  }
}
