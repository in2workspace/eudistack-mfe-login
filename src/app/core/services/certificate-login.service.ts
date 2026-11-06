import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantService } from './tenant.service';

export const CERTIFICATE_LOGIN_REASONS = [
  'CertificateMissing',
  'CertificateNotQualified',
  'CertificateNotNaturalPerson',
  'CertificateExpired',
  'CertificateRevoked',
  'ValidationUnavailable',
  'LevelNotMet',
  'LoginNotFound',
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
      this.post(state, controller.signal).then(result => {
        subscriber.next(result);
        subscriber.complete();
      });
      return () => controller.abort();
    });
  }

  private async post(state: string, signal: AbortSignal): Promise<CertificateLoginResult> {
    const baseUrl = this.baseUrl();
    if (!baseUrl) {
      return { reason: 'ValidationUnavailable' };
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/login/certificate`, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
        signal,
      });
    } catch {
      return { reason: 'CertificateMissing' };
    }

    const body = await response.json().catch(() => null);
    if (response.ok && typeof body?.redirect_uri === 'string') {
      return { redirectUri: body.redirect_uri };
    }
    return { reason: this.toReason(body?.reason) };
  }

  private baseUrl(): string {
    const template = environment.cert_base_url ?? '';
    return template.replaceAll(TENANT_PLACEHOLDER, this.tenantService.tenant()).replace(/\/+$/, '');
  }

  private toReason(reason: unknown): CertificateLoginReason {
    return CERTIFICATE_LOGIN_REASONS.find(known => known === reason) ?? 'ValidationUnavailable';
  }
}
