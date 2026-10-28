import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LoginMethod = 'wallet' | 'x509';

export interface LoginMethods {
  methods: LoginMethod[];
  essential_level?: string;
}

@Injectable({ providedIn: 'root' })
export class LoginMethodsService {
  private readonly http = inject(HttpClient);

  getMethods(state: string): Observable<LoginMethods> {
    return this.http.get<LoginMethods>(`${environment.api_base_url}/api/login/methods`, { params: { state } });
  }
}
