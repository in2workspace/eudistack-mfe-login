import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { TenantService } from './tenant.service';
import { FALLBACK_TENANT } from '../constants/tenants.constants';

const CUSTOM_DOMAIN_URL = '/assets/tenants/custom-domain.json';

describe('TenantService', () => {
  let service: TenantService;
  let httpMock: HttpTestingController;
  const originalLocation = window.location;

  function setHostname(hostname: string): void {
    Object.defineProperty(window, 'location', {
      value: { hostname },
      writable: true,
      configurable: true,
    });
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TenantService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TenantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('should start with FALLBACK_TENANT before resolve()', () => {
    expect(service.tenant()).toBe(FALLBACK_TENANT);
  });

  // ── Hostname resolution (EC-01, EC-03, ES-05) ─────────────────────────────

  describe('resolve() — from hostname', () => {
    it('EC-01: dome.stg.eudistack.net → dome (env suffix stripped from second label)', async () => {
      setHostname('dome.stg.eudistack.net');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('dome');
    });

    it('EC-01: kpmg-stg.eudistack.net → kpmg (env suffix stripped from first label)', async () => {
      setHostname('kpmg-stg.eudistack.net');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('kpmg');
    });

    it('EC-01: sandbox-dev.eudistack.net → sandbox', async () => {
      setHostname('sandbox-dev.eudistack.net');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('sandbox');
    });

    it('EC-01: platform-pre.eudistack.net → platform', async () => {
      setHostname('platform-pre.eudistack.net');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('platform');
    });

    it('EC-03: localhost → localhost', async () => {
      setHostname('localhost');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('localhost');
    });

    it('uppercase hostname is normalised: DOME.stg.eudistack.net → dome', async () => {
      setHostname('DOME.stg.eudistack.net');
      await service.resolve();
      httpMock.expectNone(CUSTOM_DOMAIN_URL);
      expect(service.tenant()).toBe('dome');
    });
  });

  // ── Hostname unknown → JSON lookup ────────────────────────────────────────

  describe('resolve() — from custom-domain.json', () => {
    it('resolves tenant from JSON when hostname is not a known tenant', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({
        domains: { 'wallets.company.com': { tenantId: 'kpmg', envId: 'stg' } },
        tenants: {},
      });
      await resolvePromise;
      expect(service.tenant()).toBe('kpmg');
    });

    it('falls back when hostname not in JSON map', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({
        domains: { 'other.domain.com': { tenantId: 'dome', envId: 'stg' } },
        tenants: {},
      });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('falls back when JSON value fails slug regex', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({
        domains: { 'wallets.company.com': { tenantId: 'INVALID!', envId: 'stg' } },
        tenants: {},
      });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('falls back when JSON value is not in KNOWN_TENANTS', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({
        domains: { 'wallets.company.com': { tenantId: 'unknowntenant', envId: 'stg' } },
        tenants: {},
      });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('falls back when JSON returns 404', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock
        .expectOne(CUSTOM_DOMAIN_URL)
        .flush('Not Found', { status: 404, statusText: 'Not Found' });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('falls back when JSON request fails (network error)', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).error(new ProgressEvent('error'));
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('falls back when JSON is malformed (200 with non-object body)', async () => {
      setHostname('wallets.company.com');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush(null);
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });
  });

  // ── ES-05: path traversal guard ───────────────────────────────────────────

  describe('resolve() — ES-05 path traversal / invalid chars', () => {
    it('../evil.stg.eudistack.net → first label empty → JSON miss → FALLBACK_TENANT', async () => {
      setHostname('../evil.stg.eudistack.net');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({ domains: {}, tenants: {} });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('dome%00.stg → % fails regex → JSON miss → FALLBACK_TENANT', async () => {
      setHostname('dome%00.stg');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({ domains: {}, tenants: {} });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('empty string → FALLBACK_TENANT', async () => {
      setHostname('');
      const resolvePromise = service.resolve();
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({ domains: {}, tenants: {} });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });

    it('newclient-stg.eudistack.net → valid slug but not in KNOWN_TENANTS → JSON fallback', async () => {
      setHostname('newclient-stg.eudistack.net');
      const resolvePromise = service.resolve();
      // 'newclient' passes regex but is not in KNOWN_TENANTS → falls through to JSON
      httpMock.expectOne(CUSTOM_DOMAIN_URL).flush({ domains: {}, tenants: {} });
      await resolvePromise;
      expect(service.tenant()).toBe(FALLBACK_TENANT);
    });
  });
});
