import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantService } from './tenant.service';

export const CERTIFICATE_LOGIN_REASONS = [
  'certificate_missing',
  'certificate_not_qualified',
  'certificate_not_natural_person',
  'certificate_expired',
  'certificate_revoked',
  'trust_validation_unavailable',
  'level_not_met',
  'login_not_found',
] as const;

export type CertificateLoginReason = typeof CERTIFICATE_LOGIN_REASONS[number];

export type CertificateLoginResult =
  | { redirectUri: string }
  | { reason: CertificateLoginReason };

const TENANT_PLACEHOLDER = '{tenant}';

@Injectable({ providedIn: 'root' })
export class CertificateLoginService {
  private readonly tenantService = inject(TenantService);

  login(state: string): Observable<CertificateLoginResult> {
    return new Observable<CertificateLoginResult>(subscriber => {
      const controller = new AbortController();
      this.post(state, controller.signal).then(
        result => {
          subscriber.next(result);
          subscriber.complete();
        },
        error => subscriber.error(error),
      );
      return () => controller.abort();
    });
  }

  private async post(state: string, signal: AbortSignal): Promise<CertificateLoginResult> {
    const baseUrl = this.baseUrl();
    if (!baseUrl) {
      return { reason: 'trust_validation_unavailable' };
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/login/certificate`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-Tenant': this.tenantService.tenant() },
        body: JSON.stringify({ state }),
        signal,
      });
    } catch {
      return { reason: 'certificate_missing' };
    }

    const body = await response.json().catch(() => null);
    if (response.ok && typeof body?.redirect_uri === 'string') {
      return { redirectUri: body.redirect_uri };
    }
    return { reason: this.toReason(body?.type) };
  }

  private baseUrl(): string {
    let url = (environment.cert_base_url ?? '').replaceAll(TENANT_PLACEHOLDER, this.tenantService.tenant());
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }

  private toReason(type: unknown): CertificateLoginReason {
    return CERTIFICATE_LOGIN_REASONS.find(known => known === type) ?? 'trust_validation_unavailable';
  }
}
