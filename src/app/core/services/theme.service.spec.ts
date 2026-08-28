import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

import { ThemeService } from './theme.service';
import { TenantService } from './tenant.service';
import { Theme } from '../models/theme.model';

function htmlOf(safe: SafeHtml | null): string {
  return safe ? (safe as any).changingThisBreaksApplicationSecurity : '';
}

describe('ThemeService', () => {
  let service: ThemeService;
  let httpMock: HttpTestingController;
  let translateService: jest.Mocked<TranslateService>;
  let tenantSignal: WritableSignal<string>;

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

  const originalLanguages = Object.getOwnPropertyDescriptor(navigator, 'languages');
  function mockBrowserLanguages(languages: string[]): void {
    Object.defineProperty(navigator, 'languages', { value: languages, configurable: true });
  }
  function restoreBrowserLanguages(): void {
    if (originalLanguages) {
      Object.defineProperty(navigator, 'languages', originalLanguages);
    } else {
      delete (navigator as unknown as { languages?: readonly string[] }).languages;
    }
  }

  beforeEach(() => {
    tenantSignal = signal('localhost');

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
        { provide: TranslateService, useValue: translateService },
        { provide: TenantService, useValue: { tenant: tenantSignal } }
      ]
    });

    service = TestBed.inject(ThemeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    restoreBrowserLanguages();
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

    it('should configure i18n and use the browser language when the tenant supports it', async () => {
      mockBrowserLanguages(['en-US', 'en']);
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

      expect(translateService.addLangs).toHaveBeenCalledWith(['en', 'es', 'ca']);
      expect(translateService.setDefaultLang).toHaveBeenCalledWith('es');
      expect(translateService.use).toHaveBeenCalledWith('en');
    });

    it('should fall back to defaultLang when no browser language is supported', async () => {
      mockBrowserLanguages(['fr', 'de']);
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(mockTheme);

      await loadPromise;

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

  // ── Asset path rewriting ─────────────────────────────────────────────────

  describe('load — asset path rewriting', () => {
    beforeEach(() => {
      tenantSignal.set('dome');
    });

    it('rewrites /assets/tenant/logo.png → /assets/tenants/dome/logo.png after load', async () => {
      const tenantTheme: Theme = {
        ...mockTheme,
        branding: {
          ...mockTheme.branding,
          logoUrl: '/assets/tenant/logo.png',
          faviconUrl: '/assets/tenant/favicon.png',
        },
      };

      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush(tenantTheme);
      await loadPromise;

      expect(service.snapshot?.branding.logoUrl).toBe('/assets/tenants/dome/logo.png');
      expect(service.snapshot?.branding.faviconUrl).toBe('/assets/tenants/dome/favicon.png');
    });

    it('leaves /assets/tenants/dome/logo.png untouched (already correct format)', async () => {
      const tenantTheme: Theme = {
        ...mockTheme,
        branding: { ...mockTheme.branding, logoUrl: '/assets/tenants/dome/logo.png' },
      };

      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush(tenantTheme);
      await loadPromise;

      expect(service.snapshot?.branding.logoUrl).toBe('/assets/tenants/dome/logo.png');
    });
  });

  // ── Per-tenant load: resolution and fallback ──────────────────────────────

  describe('load — per-tenant resolution and fallback', () => {
    beforeEach(() => {
      tenantSignal.set('dome');
    });

    // AC-01 — per-tenant load applies branding
    it('AC-01: loads per-tenant theme.json when TenantService resolves to a known tenant', async () => {
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
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-02 — HTTP 400 (bad response) → fallback
    it('AC-02/ES-02: falls back to DEFAULT_THEME when tenant theme.json returns 400', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-02 — 200 OK + JSON malformado → parse error → fallback (AC literal)
    it('AC-02/ES-02b: falls back to DEFAULT_THEME when tenant theme.json returns 200 with malformed JSON', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('{broken json', { status: 200, statusText: 'OK' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-03 — HTTP 500 → fallback
    it('AC-02/ES-03: falls back to DEFAULT_THEME when tenant theme.json returns 500', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-02 + ES-04 — timeout-like (408) → fallback
    it('AC-02/ES-04: falls back to DEFAULT_THEME when tenant theme.json returns 408 (timeout-like)', async () => {
      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush('Request Timeout', { status: 408, statusText: 'Request Timeout' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });

    // AC-04 + EC-04 — partial theme without embed codes → load OK, tenant branding applied
    it('AC-04/EC-04: loads successfully when theme.json omits headerEmbedCode and footerEmbedCode', async () => {
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
        },
      };

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/dome/theme.json');
      req.flush(partialTheme);

      await expect(loadPromise).resolves.toBeUndefined();
      expect(service.snapshot?.tenantDomain).not.toBe('EUDISTACK');
    });

    // ES-05 — ThemeService uses TenantService value for URL construction (never raw hostname)
    it('ES-05: uses tenant from TenantService signal for URL, not raw hostname', async () => {
      // TenantService resolved path-traversal hostname to FALLBACK_TENANT ('eudistack')
      tenantSignal.set('eudistack');

      const loadPromise = service.load();

      const req = httpMock.expectOne('/assets/tenants/eudistack/theme.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      await expect(loadPromise).resolves.toBeUndefined();
      expect(req.request.url).toBe('/assets/tenants/eudistack/theme.json');
      expect(service.snapshot?.tenantDomain).toBe('EUDISTACK');
    });
  });

  // --- sanitizedFooter getter (EUDISTACK-606 / ADR-arch-002 + ADR-arch-003 + AD-1) ---

  describe('sanitizedFooter', () => {
    // EC-04 — no theme loaded → snapshot is null → footerEmbedCode is undefined → returns null
    it('EC-04: returns null when theme is not loaded (snapshot is null)', () => {
      expect(service.sanitizedFooter).toBeNull();
    });

    // EC-04 — theme loaded but footerEmbedCode is null → returns null
    it('EC-04: returns null when theme has footerEmbedCode set to null', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({ ...mockTheme, content: { ...mockTheme.content, footerEmbedCode: null } });
      await loadPromise;

      expect(service.sanitizedFooter).toBeNull();
    });

    // EC-04 — theme loaded but footerEmbedCode is undefined → returns null
    it('EC-04: returns null when footerEmbedCode is absent (undefined)', async () => {
      const themeWithoutFooter = {
        ...mockTheme,
        content: { links: [], footer: null, onboardingUrl: null, supportUrl: null, walletUrl: null, knowledgeBaseUrl: null },
      };
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush(themeWithoutFooter);
      await loadPromise;

      expect(service.sanitizedFooter).toBeNull();
    });

    // AC-01 — valid allowed footer HTML → non-null SafeHtml
    it('AC-01: returns non-null SafeHtml for valid allowed footer HTML', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<div class="footer"><span>Register</span></div>' },
      });
      await loadPromise;

      expect(service.sanitizedFooter).not.toBeNull();
    });

    // AC-03 — allow-list: permitted tags and attributes preserved in footer
    it('AC-03: preserves allowed footer tags (footer, nav, a) and attributes (class, href, target)', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: {
          ...mockTheme.content,
          footerEmbedCode: '<footer><a href="https://example.com" target="_blank" rel="noopener">Sign Up</a></footer>',
        },
      });
      await loadPromise;

      const result = service.sanitizedFooter;
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).toContain('<footer>');
      expect(html).toContain('https://example.com');
      expect(html).toContain('Sign Up');
    });

    // EC-01 — only prohibited tags → DOMPurify strips everything → empty → null
    it('EC-01: returns null when all footer content is stripped (only prohibited tags)', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<script>alert("xss")</script>' },
      });
      await loadPromise;

      expect(service.sanitizedFooter).toBeNull();
    });

    // EC-02 — mixed allowed + prohibited → prohibited stripped, allowed retained
    it('EC-02: strips prohibited footer content while preserving allowed content in mixed input', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<footer>safe footer</footer><script>stolen()</script>' },
      });
      await loadPromise;

      const result = service.sanitizedFooter;
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).toContain('safe footer');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('stolen');
    });

    // EC-03 — deep nesting of allowed tags → preserved
    it('EC-03: handles deeply nested allowed footer tags without stripping valid content', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: {
          ...mockTheme.content,
          footerEmbedCode: '<footer><nav><ul><li><div><span>deep</span></div></li></ul></nav></footer>',
        },
      });
      await loadPromise;

      const result = service.sanitizedFooter;
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).toContain('deep');
    });

    // ES-01 — <script> injection → stripped → null
    it('ES-01: strips <script> footer injection — result is null when no allowed content remains', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<script>document.cookie="stolen"</script>' },
      });
      await loadPromise;

      expect(service.sanitizedFooter).toBeNull();
    });

    // ES-02 — javascript: href → stripped, tag retained with text
    it('ES-02: strips javascript: href in footer — SafeHtml is non-null but href is absent', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<a href="javascript:alert(1)">click me</a>' },
      });
      await loadPromise;

      const result = service.sanitizedFooter;
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).not.toContain('javascript:');
      expect(html).toContain('click me');
    });

    // ES-03 — on* event handler → stripped, element retained
    it('ES-03: strips on* event handlers from footer element — element kept but handler absent', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<div onclick="alert(1)">safe text</div>' },
      });
      await loadPromise;

      const result = service.sanitizedFooter;
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).not.toContain('onclick');
      expect(html).toContain('safe text');
    });

    // ES-04 — <style> injection → stripped → null
    it('ES-04: strips <style> injection from footer — result is null when no allowed content remains', async () => {
      const loadPromise = service.load();
      const req = httpMock.expectOne('/assets/tenants/localhost/theme.json');
      req.flush({
        ...mockTheme,
        content: { ...mockTheme.content, footerEmbedCode: '<style>body { display: none !important; }</style>' },
      });
      await loadPromise;

      expect(service.sanitizedFooter).toBeNull();
    });
  });

  // --- sanitizeEmbedHtml (EUDISTACK-605 / ADR-arch-002 + ADR-arch-003) ---

  describe('sanitizeEmbedHtml', () => {
    // EC-04 — null / undefined / empty → null (no sanitization attempted)
    it('EC-04: returns null for null input', () => {
      expect(service.sanitizeEmbedHtml(null)).toBeNull();
    });

    it('EC-04: returns null for undefined input', () => {
      expect(service.sanitizeEmbedHtml(undefined)).toBeNull();
    });

    it('EC-04: returns null for empty string', () => {
      expect(service.sanitizeEmbedHtml('')).toBeNull();
    });

    // AC-01 — valid allowed HTML → non-null SafeHtml with content intact
    it('AC-01: returns non-null SafeHtml for valid allowed HTML', () => {
      const result = service.sanitizeEmbedHtml('<div class="header"><span>Tenant Nav</span></div>');
      expect(result).not.toBeNull();
    });

    // AC-03 — allow-list: permitted tags and attributes are preserved
    it('AC-03: preserves allowed tags (nav, div, span) and allowed attributes (class, href)', () => {
      const result = service.sanitizeEmbedHtml(
        '<nav><div class="menu"><a href="https://example.com" target="_blank">Home</a></div></nav>'
      );
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).toContain('<nav>');
      expect(html).toContain('<div');
      expect(html).toContain('https://example.com');
      expect(html).toContain('Home');
    });

    // AC-03 — allow-list: img tag with allowed attributes preserved
    it('AC-03: preserves <img> with allowed src/alt attributes', () => {
      const result = service.sanitizeEmbedHtml('<img src="https://cdn.example.com/logo.png" alt="Logo" />');
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).toContain('https://cdn.example.com/logo.png');
    });

    // EC-01 — only prohibited content → DOMPurify strips everything → empty → null
    it('EC-01: returns null when all content is stripped (only prohibited tags remain)', () => {
      expect(service.sanitizeEmbedHtml('<script>alert("xss")</script>')).toBeNull();
    });

    // EC-02 — mixed: allowed + prohibited → prohibited stripped, allowed content retained
    it('EC-02: strips prohibited tags while preserving allowed content in mixed input', () => {
      const result = service.sanitizeEmbedHtml('<div>safe content</div><script>stolen()</script>');
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).toContain('safe content');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('stolen');
    });

    // EC-03 — deep nesting of allowed tags → preserved
    it('EC-03: handles deeply nested allowed tags without stripping valid content', () => {
      const input = '<nav><ul><li><div><span>deep</span></div></li></ul></nav>';
      const result = service.sanitizeEmbedHtml(input);
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).toContain('deep');
    });

    // ES-01 — <script> injection → stripped → null (only tag, no residual text)
    it('ES-01: strips <script> injection — result is null when no allowed content remains', () => {
      expect(service.sanitizeEmbedHtml('<script>document.cookie="stolen"</script>')).toBeNull();
    });

    // ES-02 — javascript: href → stripped by ALLOWED_URI_REGEXP, tag retained with text
    it('ES-02: strips javascript: href — SafeHtml is non-null but href is absent', () => {
      const result = service.sanitizeEmbedHtml('<a href="javascript:alert(1)">click me</a>');
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).not.toContain('javascript:');
      expect(html).toContain('click me');
    });

    // ES-03 — on* event handler → stripped by allow-list, element retained
    it('ES-03: strips on* event handlers — element is kept but handler attribute is absent', () => {
      const result = service.sanitizeEmbedHtml('<div onclick="alert(1)">safe text</div>');
      expect(result).not.toBeNull();
      const html = htmlOf(result);
      expect(html).not.toContain('onclick');
      expect(html).toContain('safe text');
    });

    // ES-04 — <style> injection → stripped → null
    it('ES-04: strips <style> injection — result is null when no allowed content remains', () => {
      expect(service.sanitizeEmbedHtml('<style>body { display: none !important; }</style>')).toBeNull();
    });

    // SVG — inline SVG with allowed tags passes through (proves SVG allow-list extension works)
    it('SVG-01: preserves inline SVG with allowed tags and attributes', () => {
      const input = '<svg width="100%" height="104" viewBox="0 0 1440 104" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="1440" height="104" fill="#0B1529" fill-opacity="0.75"/><path d="M0 0H1440V104H0Z" fill="white"/></svg>';
      const result = service.sanitizeEmbedHtml(input);
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).toContain('<svg');
      expect(html).toContain('<rect');
      expect(html).toContain('<path');
    });

    // SVG — <script> inside SVG is stripped, outer SVG structure retained
    it('SVG-02: strips <script> injected inside SVG while retaining SVG structure', () => {
      const input = '<svg width="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="100" height="100" fill="red"/></svg>';
      const result = service.sanitizeEmbedHtml(input);
      expect(result).not.toBeNull();
      const html = (result as any).changingThisBreaksApplicationSecurity as string;
      expect(html).not.toContain('<script');
      expect(html).toContain('<rect');
    });
  });
});
