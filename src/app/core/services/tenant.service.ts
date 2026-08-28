import { inject, Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { FALLBACK_TENANT, KNOWN_TENANTS } from '../constants/tenants.constants';
import { CustomDomainConfig, CustomDomainEnv } from '../models/custom-domain.model';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private static readonly SLUG_RE = /^[a-z0-9-]+$/;
  private static readonly ENV_SUFFIXES = ['-stg', '-dev', '-pre'] as const;

  private readonly _tenant = signal<string>(FALLBACK_TENANT);
  private readonly _isCanonical = signal<boolean>(true);
  private readonly _resolvedEnv = signal<CustomDomainEnv | null>(null);
  public readonly tenant: Signal<string> = this._tenant.asReadonly();
  public readonly isCanonical: Signal<boolean> = this._isCanonical.asReadonly();
  public readonly resolvedEnv: Signal<CustomDomainEnv | null> = this._resolvedEnv.asReadonly();
  private readonly http = inject(HttpClient);


  async resolve(): Promise<void> {
    const fromHostname = this.fromHostname(window.location.hostname);
    if (fromHostname) {
      this._tenant.set(fromHostname);
      this._isCanonical.set(true);
      this._resolvedEnv.set(null);
      return;
    }

    try {
      const config = await firstValueFrom(
        this.http
          .get<CustomDomainConfig>('/assets/tenants/custom-domain.json')
          .pipe(timeout(2500))
      );
      const entry = config?.domains?.[window.location.hostname];
      const slug = entry?.tenantId;
      const envId = entry?.envId;
      if (slug && this.isValid(slug)) {
        this._tenant.set(slug);
        this._isCanonical.set(false);
        const resolvedEnv = config?.tenants?.[slug]?.env?.[envId ?? ''] ?? null;
        if(!resolvedEnv) {
          console.warn(`No environment configuration found for tenant "${slug}" and envId "${envId}"`);
        }
        this._resolvedEnv.set(resolvedEnv);
        return;
      }
    } catch {
      // timeout / 404 / JSON invàlid: fall through to default
    }

    this._tenant.set(FALLBACK_TENANT);
    this._isCanonical.set(false);
    this._resolvedEnv.set(null);
  }

  private fromHostname(hostname: string): string | null {
    const first = hostname.split('.')[0].toLowerCase();
    const base = this.stripEnvSuffix(first);
    return this.isValid(base) ? base : null;
  }

  private isValid(slug: string): boolean {
    return !!slug && TenantService.SLUG_RE.test(slug) && KNOWN_TENANTS.includes(slug);
  }

  private stripEnvSuffix(label: string): string {
    const match = TenantService.ENV_SUFFIXES.find(s => label.endsWith(s));
    return match ? label.slice(0, -match.length) : label;
  }
}