import { inject, Injectable, Signal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { FALLBACK_TENANT, KNOWN_TENANTS } from '../constants/tenants.constants';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private static readonly SLUG_RE = /^[a-z0-9-]+$/;
  private static readonly ENV_SUFFIXES = ['-stg', '-dev', '-pre'] as const;

  private readonly _tenant = signal<string>(FALLBACK_TENANT);
  private readonly _isCanonical = signal<boolean>(true);
  public readonly tenant: Signal<string> = this._tenant.asReadonly();
  public readonly isCanonical: Signal<boolean> = this._isCanonical.asReadonly();
  private readonly http = inject(HttpClient);


  async resolve(): Promise<void> {
    const fromHostname = this.fromHostname(window.location.hostname);
    if (fromHostname) {
      this._tenant.set(fromHostname);
      this._isCanonical.set(true);
      return;
    }

    try {
      const map = await firstValueFrom(
        this.http
          .get<Record<string, string>>('/assets/tenants/custom-domain.json')
          .pipe(timeout(800))
      );
      const slug = map?.[window.location.hostname];
      if (slug && this.isValid(slug)) {
        this._tenant.set(slug);
        this._isCanonical.set(false);
        return;
      }
    } catch {
      // timeout / 404 / JSON invàlid: fall through to default
    }

    this._tenant.set(FALLBACK_TENANT);
    this._isCanonical.set(false);
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