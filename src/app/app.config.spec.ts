/**
 * Bootstrap integration tests for APP_INITIALIZER (ThemeService.load codepath).
 *
 * `themeService.load()` is the identical codepath to the factory registered as
 * APP_INITIALIZER in app.config.ts:
 *
 *   function initializeTheme(themeService: ThemeService): () => Promise<void> {
 *     return () => themeService.load();
 *   }
 *
 * Testing `themeService.load()` directly is therefore equivalent to testing the
 * APP_INITIALIZER factory. The goal of this suite is to verify that Angular's
 * bootstrap phase always settles (never hangs) regardless of the HTTP outcome of
 * theme.json — 404, 500, or success.
 */
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { ThemeService } from './core/services/theme.service';
import { Theme } from './core/models/theme.model';

describe('APP_INITIALIZER — ThemeService.load bootstrap safety', () => {
  let themeService: ThemeService;
  let httpMock: HttpTestingController;
  let translateService: jest.Mocked<TranslateService>;

  const mockTheme: Theme = {
    tenantDomain: 'dome',
    branding: {
      name: 'DOME Portal',
      primaryColor: '#1A56DB',
      primaryContrastColor: '#FFFFFF',
      secondaryColor: '#1E40AF',
      secondaryContrastColor: '#E0E7FF',
      logoUrl: 'https://cdn.example.com/logo.png',
      faviconUrl: 'https://cdn.example.com/favicon.ico',
    },
    content: {
      links: [],
      footer: null,
      onboardingUrl: null,
      supportUrl: null,
      walletUrl: null,
      knowledgeBaseUrl: null,
    },
    i18n: {
      defaultLang: 'es',
      available: ['en', 'es'],
    },
  };

  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'dome.stg.eudistack.net' },
      writable: true,
      configurable: true,
    });

    translateService = {
      addLangs: jest.fn(),
      setDefaultLang: jest.fn(),
      use: jest.fn(),
      onLangChange: { subscribe: jest.fn() },
    } as unknown as jest.Mocked<TranslateService>;

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslateService, useValue: translateService },
      ],
    });

    themeService = TestBed.inject(ThemeService);
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

  it('should resolve when theme.json returns 404', async () => {
    const loadPromise = themeService.load();

    const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    await expect(loadPromise).resolves.toBeUndefined();
    expect(themeService.snapshot?.tenantDomain).toBe('EUDISTACK');
  });

  it('should resolve when theme.json returns 500', async () => {
    const loadPromise = themeService.load();

    const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
    req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    await expect(loadPromise).resolves.toBeUndefined();
    expect(themeService.snapshot?.tenantDomain).toBe('EUDISTACK');
  });

  it('should resolve with per-tenant URL for known hostname', async () => {
    const loadPromise = themeService.load();

    const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockTheme);

    await expect(loadPromise).resolves.toBeUndefined();
    expect(themeService.snapshot?.tenantDomain).toBe('dome');
  });
});
