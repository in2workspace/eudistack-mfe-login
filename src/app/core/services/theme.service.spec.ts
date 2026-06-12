import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

import { ThemeService } from './theme.service';
import { Theme } from '../models/theme.model';

describe('ThemeService', () => {
  let service: ThemeService;
  let httpMock: HttpTestingController;
  let translateService: jest.Mocked<TranslateService>;

  const mockTheme: Theme = {
    tenantDomain: 'test.example.com',
    branding: {
      name: 'Test Portal',
      primaryColor: '#2563EB',
      primaryContrastColor: '#FFFFFF',
      secondaryColor: '#1E40AF',
      secondaryContrastColor: '#E0E7FF',
      logoUrl: 'https://cdn.example.com/logo.png',
      faviconUrl: 'https://cdn.example.com/favicon.ico'
    },
    content: {
      links: [],
      footer: null,
      onboardingUrl: null,
      supportUrl: null,
      walletUrl: null,
      knowledgeBaseUrl: null
    },
    i18n: {
      defaultLang: 'es',
      available: ['en', 'es', 'ca']
    }
  };

  beforeEach(() => {
    translateService = {
      addLangs: jest.fn(),
      setDefaultLang: jest.fn(),
      use: jest.fn(),
      onLangChange: { subscribe: jest.fn() }
    } as unknown as jest.Mocked<TranslateService>;

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TranslateService, useValue: translateService }
      ]
    });

    service = TestBed.inject(ThemeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // --- load ---

  describe('load', () => {
    it('should fetch theme.json and emit theme', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockTheme);

      await loadPromise;

      expect(service.snapshot).toEqual(mockTheme);
    });

    it('should configure i18n when theme has i18n config', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(translateService.addLangs).toHaveBeenCalledWith(['en', 'es', 'ca']);
      expect(translateService.setDefaultLang).toHaveBeenCalledWith('es');
      expect(translateService.use).toHaveBeenCalledWith('es');
    });

    it('should not configure i18n when theme has no i18n config', async () => {
      const themeNoI18n = { ...mockTheme, i18n: undefined as unknown as Theme['i18n'] };
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(themeNoI18n);

      await loadPromise;

      expect(translateService.addLangs).not.toHaveBeenCalled();
    });

    it('should set document title from branding name', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(document.title).toBe('Test Portal');
    });

    it('should set favicon from branding faviconUrl', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      const faviconLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      expect(faviconLink?.href).toBe('https://cdn.example.com/favicon.ico');
    });

    it('should apply default theme when fetch fails', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot).toBeTruthy();
    });

    it('should apply CSS custom properties', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      const root = document.documentElement.style;
      expect(root.getPropertyValue('--primary-color')).toBe('#2563EB');
      expect(root.getPropertyValue('--primary-contrast-color')).toBe('#FFFFFF');
      expect(root.getPropertyValue('--secondary-color')).toBe('#1E40AF');
      expect(root.getPropertyValue('--surface-card')).toBe('#FFFFFF');
    });
  });

  // --- snapshot ---

  describe('snapshot', () => {
    it('should return null before load', () => {
      expect(service.snapshot).toBeNull();
    });

    it('should return theme after load', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(service.snapshot).toEqual(mockTheme);
    });
  });

  // --- observeTheme ---

  describe('observeTheme', () => {
    it('should emit null initially then theme after load', async () => {
      const values: (Theme | null)[] = [];
      const sub = service.observeTheme().subscribe(v => values.push(v));

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(values).toEqual([null, mockTheme]);
      sub.unsubscribe();
    });
  });

  // --- tenantDomain ---

  describe('tenantDomain', () => {
    it('should throw when theme is not loaded', () => {
      expect(() => service.tenantDomain).toThrow('ThemeService: theme not loaded yet');
    });

    it('should return tenantDomain after load', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(service.tenantDomain).toBe('test.example.com');
    });
  });

  // --- computeActionPrimary (via CSS property) ---

  describe('action-primary computation', () => {
    it('should use brand color when in safe blue range', async () => {
      const blueTheme = { ...mockTheme, branding: { ...mockTheme.branding, primaryColor: '#2563EB' } };
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(blueTheme);

      await loadPromise;

      const actionPrimary = document.documentElement.style.getPropertyValue('--action-primary');
      expect(actionPrimary).toBe('#2563EB');
    });

    it('should use default when brand color is outside safe range (red)', async () => {
      const redTheme = { ...mockTheme, branding: { ...mockTheme.branding, primaryColor: '#DC2626' } };
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(redTheme);

      await loadPromise;

      const actionPrimary = document.documentElement.style.getPropertyValue('--action-primary');
      expect(actionPrimary).toBe('#2563EB');
    });

    it('should use default when brand color is too dark', async () => {
      const darkTheme = { ...mockTheme, branding: { ...mockTheme.branding, primaryColor: '#0A1628' } };
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(darkTheme);

      await loadPromise;

      const actionPrimary = document.documentElement.style.getPropertyValue('--action-primary');
      expect(actionPrimary).toBe('#2563EB');
    });
  });

  it('should set document.documentElement.lang to defaultLang after load', async () => {
    const loadPromise = service.load();

    const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
    req.flush(mockTheme);

    await loadPromise;

    expect(document.documentElement.lang).toBe('es');
  });

  it('should update document.documentElement.lang when onLangChange emits', async () => {
    const loadPromise = service.load();

    const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
    req.flush(mockTheme);

    await loadPromise;

    const langChangeCallback = (translateService.onLangChange.subscribe as jest.Mock).mock.calls[0][0];
    langChangeCallback({ lang: 'ca' });

    expect(document.documentElement.lang).toBe('ca');
  });

  // ── Per-tenant load: resolution and fallback ──────────────────────────────

  describe('load — per-tenant resolution and fallback', () => {
    const originalLocation = window.location;

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    // AC-01 — per-tenant load applies branding
    it('AC-01: loads per-tenant theme.json when hostname resolves to a valid tenant', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      expect(req.request.method).toBe('GET');
      req.flush({
        ...mockTheme,
        tenantDomain: 'dome',
        branding: { ...mockTheme.branding, primaryColor: '#1A56DB' },
      });

      await loadPromise;

      expect(service.snapshot?.tenantDomain).toBe('dome');
    });

    // AC-02 + ES-01 — 404 → fallback (applyDefault, no throw)
    it('AC-02/ES-01: falls back to DEFAULT_THEME when tenant theme.json returns 404', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-02 — HTTP 400 (bad response) → fallback
    it('AC-02/ES-02: falls back to DEFAULT_THEME when tenant theme.json returns 400', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-02 — 200 OK + JSON malformado → parse error → fallback (AC literal)
    it('AC-02/ES-02b: falls back to DEFAULT_THEME when tenant theme.json returns 200 with malformed JSON', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      // Flush a 200 with an invalid JSON body — HttpClient throws HttpResponseParseError,
      // caught by the catch block in load() which calls applyDefault().
      req.flush('{broken json', { status: 200, statusText: 'OK' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-03 — HTTP 500 → fallback
    it('AC-02/ES-03: falls back to DEFAULT_THEME when tenant theme.json returns 500', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-04 — timeout-like (408) → fallback
    it('AC-02/ES-04: falls back to DEFAULT_THEME when tenant theme.json returns 408 (timeout-like)', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Request Timeout', { status: 408, statusText: 'Request Timeout' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-04 + EC-04 — partial theme without embed codes → load OK, tenant branding applied
    it('AC-04/EC-04: loads successfully when theme.json omits headerEmbedCode and footerEmbedCode', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'dome.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const partialTheme: Theme = {
        ...mockTheme,
        tenantDomain: 'dome',
        content: {
          links: [],
          footer: null,
          onboardingUrl: null,
          supportUrl: null,
          walletUrl: null,
          knowledgeBaseUrl: null,
          // headerEmbedCode and footerEmbedCode deliberately omitted
        },
      };

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush(partialTheme);

      await expect(loadPromise).resolves.toBeUndefined();
      // Theme loaded from tenant — must NOT have fallen back to the default
      expect(service.snapshot?.tenantDomain).not.toBe('EUDISTACK');
    });

    // ES-05 — invalid tenant identifier → resolveTenant returns FALLBACK_TENANT ('eudistack')
    it('ES-05: invalid tenant identifier in hostname resolves to eudistack (path-traversal guard)', async () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: '../evil.stg.eudistack.net' },
        writable: true,
        configurable: true,
      });

      const loadPromise = service.load();

      // resolveTenant('../evil.stg.eudistack.net') → first segment '..' → fails /^[a-z0-9-]+$/ → 'eudistack'
      const req = httpMock.expectOne('/assets/tenants/eudistack/theme.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).resolves.toBeUndefined();
      // Key assertion: the URL contained 'eudistack', not '../evil'
      expect(req.request.url).toBe('/assets/tenants/eudistack/theme.json');
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });
  });
});
