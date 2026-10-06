import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface AbortLoginResponse {
  redirectUrl: string;
}

@Injectable({ providedIn: 'root' })
export class LoginSessionService {
  private readonly http = inject(HttpClient);

  /**
   * Aborts the pending login identified by `state` and returns the URL of the
   * application that started it (an OAuth2 `error=access_denied` response built
   * by the Verifier from the validated `redirect_uri`). Emits `null` when the
   * Verifier does not know the login or cannot be reached: the caller must not
   * guess a fallback destination.
   */
  abort(state: string): Observable<string | null> {
    return this.http
      .post<AbortLoginResponse>(`${environment.api_base_url}/api/login/abort`, null, { params: { state } })
      .pipe(
        map(response => response?.redirectUrl || null),
        catchError(() => of(null))
      );
  }
}
