import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { By, DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BehaviorSubject, NEVER, Observable } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { QRCodeComponent } from 'angularx-qrcode';

import { LoginComponent } from './login.component';
import { SseService } from '../../core/services/sse.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantService } from '../../core/services/tenant.service';
import { Theme } from '../../core/models/theme.model';
import { CustomDomainEnv } from '../../core/models/custom-domain.model';

@Component({ selector: 'qrcode', template: '', standalone: true })
class MockQRCodeComponent {
  @Input() qrdata = '';
  @Input() width = 0;
  @Input() errorCorrectionLevel = '';
  @Input() margin = 0;
  @Input() elementType = '';
}

function makeTenantService(overrides: { isCanonical?: boolean; resolvedEnv?: CustomDomainEnv | null } = {}) {
  return {
    isCanonical: jest.fn().mockReturnValue(overrides.isCanonical ?? true),
    resolvedEnv: jest.fn().mockReturnValue(overrides.resolvedEnv ?? null),
    tenant: jest.fn().mockReturnValue('dome'),
  };
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let theme$: BehaviorSubject<Theme | null>;

  const baseTheme: Theme = {
    tenantDomain: 'test',
    branding: {
      name: 'Test',
      primaryColor: '#000',
      primaryContrastColor: '#fff',
      secondaryColor: '#111',
      secondaryContrastColor: '#222',
      logoUrl: null,
      faviconUrl: null
    },
    content: {
      links: [],
      footer: null,
      headerEmbedCode: null,
      footerEmbedCode: null,
      onboardingUrl: null,
      supportUrl: null,
      walletUrl: null,
      knowledgeBaseUrl: null,
    },
    i18n: { defaultLang: 'en', available: ['en'] }
  };

  function createComponent(
    queryParams: Record<string, string> = {},
    tenantOverrides: { isCanonical?: boolean; resolvedEnv?: CustomDomainEnv | null } = {}
  ) {
    theme$ = new BehaviorSubject<Theme | null>(baseTheme);

    TestBed.configureTestingModule({
      imports: [LoginComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(queryParams)
            }
          }
        },
        {
          provide: SseService,
          useValue: { connect: jest.fn().mockReturnValue(NEVER) }
        },
        {
          provide: ThemeService,
          useValue: {
            observeTheme: () => theme$.asObservable(),
            sanitizeEmbedHtml: jest.fn().mockReturnValue(null),
          }
        },
        {
          provide: TenantService,
          useValue: makeTenantService(tenantOverrides),
        }
      ]
    }).overrideComponent(LoginComponent, {
      remove: { imports: [QRCodeComponent] },
      add: { imports: [MockQRCodeComponent] }
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  }

  afterEach(() => {
    jest.restoreAllMocks();
    fixture?.destroy();
  });

  // --- Initialization ---

  describe('ngOnInit', () => {
    it('should read authRequest, state and homeUri from query params', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc', state: 's123', homeUri: '/home' });
      fixture.detectChanges();

      expect(component.authRequest).toBe('https://verifier.example.com/oid4vp/auth?nonce=abc');
      expect(component.state).toBe('s123');
      expect(component.homeUri).toBe('/home');
    });

    it('should default to empty strings when query params are missing', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.authRequest).toBe('');
      expect(component.state).toBe('');
      expect(component.homeUri).toBe('');
    });

    it('should subscribe to theme', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.theme).toEqual(baseTheme);
    });

    it('should connect SSE when state is provided', () => {
      createComponent({ state: 's123' });
      fixture.detectChanges();

      const sseService = TestBed.inject(SseService);
      expect(sseService.connect).toHaveBeenCalledWith('s123');
    });

    it('should not connect SSE when state is empty', () => {
      createComponent({});
      fixture.detectChanges();

      const sseService = TestBed.inject(SseService);
      expect(sseService.connect).not.toHaveBeenCalled();
    });
  });

  // --- walletRedirectUrl ---

  describe('walletRedirectUrl', () => {
    it('should return empty string when walletUrl is not configured', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      expect(component.walletRedirectUrl).toBe('');
    });

    it('should return empty string when authRequest is empty', () => {
      createComponent({});
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });

      expect(component.walletRedirectUrl).toBe('');
    });

    it('should build wallet URL with authorization_request query parameter', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc&state=s1' });
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });

      const expected = 'https://wallet.example.com/protocol/callback?authorization_request=' +
        encodeURIComponent('https://verifier.example.com/oid4vp/auth?nonce=abc&state=s1');
      expect(component.walletRedirectUrl).toBe(expected);
    });

    it('should strip trailing slashes from walletUrl', () => {
      createComponent({ authRequest: 'https://verifier.example.com/path?q=1' });
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com/' } });

      const expected = 'https://wallet.example.com/protocol/callback?authorization_request=' +
        encodeURIComponent('https://verifier.example.com/path?q=1');
      expect(component.walletRedirectUrl).toBe(expected);
    });

    it('should encode special characters in authRequest', () => {
      createComponent({ authRequest: 'not-a-url' });
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });

      const expected = 'https://wallet.example.com/protocol/callback?authorization_request=' +
        encodeURIComponent('not-a-url');
      expect(component.walletRedirectUrl).toBe(expected);
    });
  });

  // --- copyAuthRequest ---

  describe('copyAuthRequest', () => {
    beforeEach(() => {
      Object.assign(navigator, {
        clipboard: { writeText: jest.fn().mockResolvedValue(undefined) }
      });
    });

    it('should copy authRequest to clipboard', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      component.copyAuthRequest();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://verifier.example.com/oid4vp/auth?nonce=abc');
    });

    it('should set copied to true then false after 2 seconds', fakeAsync(() => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      component.copyAuthRequest();
      tick();
      expect(component.copied).toBe(true);

      tick(2000);
      expect(component.copied).toBe(false);
    }));

    it('should not call clipboard when authRequest is empty', () => {
      createComponent({});
      fixture.detectChanges();

      component.copyAuthRequest();

      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    });
  });

  // --- toggleSameDevice ---

  describe('toggleSameDevice', () => {
    it('should toggle sameDevice from false to true', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.sameDevice).toBe(false);
      component.toggleSameDevice();
      expect(component.sameDevice).toBe(true);
    });

    it('should toggle sameDevice from true to false', () => {
      createComponent({});
      fixture.detectChanges();

      component.sameDevice = true;
      component.toggleSameDevice();
      expect(component.sameDevice).toBe(false);
    });
  });

  // --- openWallet ---

  describe('openWallet', () => {
    it('should open wallet in new tab when walletRedirectUrl is available', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });

      const mockWindow = {} as Window;
      jest.spyOn(window, 'open').mockReturnValue(mockWindow);

      component.openWallet();

      const expectedUrl = 'https://wallet.example.com/protocol/callback?authorization_request=' +
        encodeURIComponent('https://verifier.example.com/oid4vp/auth?nonce=abc');
      expect(window.open).toHaveBeenCalledWith(expectedUrl, '_blank');
    });

    it('should not throw when popup is blocked (fallback to redirect)', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });

      jest.spyOn(window, 'open').mockReturnValue(null);

      expect(() => component.openWallet()).not.toThrow();
      expect(window.open).toHaveBeenCalled();
    });

    it('should do nothing when walletRedirectUrl is empty', () => {
      createComponent({});
      fixture.detectChanges();

      jest.spyOn(window, 'open');

      component.openWallet();

      expect(window.open).not.toHaveBeenCalled();
    });
  });

  // --- Template rendering ---

  describe('template', () => {
    it('should show QR code when sameDevice is false', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      const qrFrame = fixture.nativeElement.querySelector('.qr-frame');
      const sameDeviceTitle = fixture.nativeElement.querySelector('.same-device-title');

      expect(qrFrame).toBeTruthy();
      expect(sameDeviceTitle).toBeNull();
    });

    it('should render the QR with scanner-friendly settings', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      const mockQr = fixture.debugElement.query(By.directive(MockQRCodeComponent))?.componentInstance as MockQRCodeComponent;

      expect(mockQr.qrdata).toBe('https://verifier.example.com/oid4vp/auth?nonce=abc');
      expect(mockQr.width).toBe(300);
      expect(mockQr.errorCorrectionLevel).toBe('H');
      expect(mockQr.margin).toBe(3);
      expect(mockQr.elementType).toBe('svg');
    });

    it('should show same-device view when sameDevice is true', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      component.sameDevice = true;
      fixture.detectChanges();

      const qrFrame = fixture.nativeElement.querySelector('.qr-frame');
      const sameDeviceTitle = fixture.nativeElement.querySelector('.same-device-title');

      expect(qrFrame).toBeNull();
      expect(sameDeviceTitle).toBeTruthy();
    });

    it('should show copy button when sameDevice is false', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      const copyButton = fixture.nativeElement.querySelector('.copy-button');
      expect(copyButton).toBeTruthy();
    });

    it('should hide copy button when sameDevice is true', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      component.sameDevice = true;
      fixture.detectChanges();

      const copyButton = fixture.nativeElement.querySelector('.copy-button');
      expect(copyButton).toBeNull();
    });

    it('should show toggle-section when walletUrl is configured', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector('.toggle-section');
      expect(toggle).toBeTruthy();
    });

    it('should hide toggle-section when walletUrl is not configured', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      const toggle = fixture.nativeElement.querySelector('.toggle-section');
      expect(toggle).toBeNull();
    });

    it('should show wallet button in same-device mode when walletRedirectUrl exists', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      theme$.next({ ...baseTheme, content: { ...baseTheme.content, walletUrl: 'https://wallet.example.com' } });
      fixture.detectChanges();

      component.sameDevice = true;
      fixture.detectChanges();

      const walletButton = fixture.nativeElement.querySelector('.wallet-button');
      expect(walletButton).toBeTruthy();
    });

    it('should not show QR card when timed out', () => {
      createComponent({ authRequest: 'https://verifier.example.com/oid4vp/auth?nonce=abc' });
      fixture.detectChanges();

      component.timedOut = true;
      fixture.detectChanges();

      const qrCard = fixture.nativeElement.querySelector('.qr-card');
      const timeoutCard = fixture.nativeElement.querySelector('.timeout-card');

      expect(qrCard).toBeNull();
      expect(timeoutCard).toBeTruthy();
    });
  });

  // --- Navigation ---

  describe('navigateHome', () => {
    it('should not throw when homeUri is empty', () => {
      createComponent({});
      fixture.detectChanges();

      expect(() => component.navigateHome()).not.toThrow();
    });
  });

  // --- Countdown ---

  describe('countdown', () => {
    it('should initialize remainingSeconds to 120', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.remainingSeconds).toBe(120);
    });

    it('should initialize countdownPercentage to 100', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.countdownPercentage).toBe(100);
    });

    it('should decrement remainingSeconds when state is provided', fakeAsync(() => {
      createComponent({ state: 's123' });
      fixture.detectChanges();

      tick(3000);
      expect(component.remainingSeconds).toBe(117);
      expect(component.countdownPercentage).toBeCloseTo(97.5, 1);

      component.ngOnDestroy();
    }));
  });

  // --- Timeout redirect ---

  describe('timeout redirect', () => {
    it('should set timedOut to true and stop waiting after 120 seconds', fakeAsync(() => {
      createComponent({ state: 's123' });
      fixture.detectChanges();

      tick(120_000);

      expect(component.timedOut).toBe(true);
      expect(component.waitingForVerification).toBe(false);

      component.ngOnDestroy();
      tick(3000);
    }));

    it('canonical: redirects to /issuer/home 3 seconds after timeout', fakeAsync(() => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });

      createComponent({ state: 's123' }, { isCanonical: true, resolvedEnv: null });
      fixture.detectChanges();

      tick(120_000 + 3000);

      expect(window.location.href).toBe('/issuer/home');

      component.ngOnDestroy();
    }));

    it('non-canonical: redirects to resolvedEnv.issuer/home 3 seconds after timeout', fakeAsync(() => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });

      const envConfig: CustomDomainEnv = {
        issuer: 'https://dome.stg.eudistack.net/issuer',
        verifier: 'https://dome.stg.eudistack.net/verifier',
        wallet: 'https://wallet.dome.eu',
      };
      createComponent({ state: 's123' }, { isCanonical: false, resolvedEnv: envConfig });
      fixture.detectChanges();

      tick(120_000 + 3000);

      expect(window.location.href).toBe('https://dome.stg.eudistack.net/issuer/home');

      component.ngOnDestroy();
    }));

    it('non-canonical without resolvedEnv: falls back to /issuer/home', fakeAsync(() => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });

      createComponent({ state: 's123' }, { isCanonical: false, resolvedEnv: null });
      fixture.detectChanges();

      tick(120_000 + 3000);

      expect(window.location.href).toBe('/issuer/home');

      component.ngOnDestroy();
    }));

    it('should not redirect before timeout elapses', fakeAsync(() => {
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true
      });

      createComponent({ state: 's123' });
      fixture.detectChanges();

      tick(119_999);

      expect(component.timedOut).toBe(false);
      expect(window.location.href).toBe('');

      component.ngOnDestroy();
    }));

    it('should unsubscribe SSE connection on timeout', fakeAsync(() => {
      let sseUnsubscribed = false;
      createComponent({ state: 's123' });

      const sseService = TestBed.inject(SseService);
      (sseService.connect as jest.Mock).mockReturnValue(
        new Observable(() => () => { sseUnsubscribed = true; })
      );

      fixture.detectChanges();

      tick(120_000);

      expect(sseUnsubscribed).toBe(true);

      component.ngOnDestroy();
      tick(3000);
    }));
  });

  // --- Success state ---

  describe('showSuccess', () => {
    it('should default to false', () => {
      createComponent({});
      fixture.detectChanges();

      expect(component.showSuccess).toBe(false);
    });
  });

  // --- Skeleton ---

  describe('skeleton loader', () => {
    it('should show skeleton when theme is null', () => {
      createComponent({});
      // Do not call detectChanges yet so theme stays null
      theme$.next(null);
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('.skeleton-card');
      expect(skeleton).toBeTruthy();
    });

    it('should hide skeleton when theme is loaded', () => {
      createComponent({});
      fixture.detectChanges();

      const skeleton = fixture.nativeElement.querySelector('.skeleton-card');
      expect(skeleton).toBeNull();
    });
  });

  // --- Cleanup ---

  describe('ngOnDestroy', () => {
    it('should not throw when destroying component', () => {
      createComponent({ state: 's123' });
      fixture.detectChanges();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should clear countdown interval on destroy', fakeAsync(() => {
      createComponent({ state: 's123' });
      fixture.detectChanges();

      tick(2000);
      component.ngOnDestroy();

      // After destroy, remainingSeconds should stop changing
      const secondsAtDestroy = component.remainingSeconds;
      tick(3000);
      expect(component.remainingSeconds).toBe(secondsAtDestroy);
    }));
  });

  // --- Embedded footer conditional render (EUDISTACK-606 AC-01 / AC-02 / EC-01 / EC-04) ---

  describe('embedded footer conditional render (EUDISTACK-606)', () => {
    let localTheme$: BehaviorSubject<Theme | null>;
    let localFixture: ComponentFixture<LoginComponent>;

    function buildFooterTestBed(sanitizeEmbedHtmlImpl: jest.Mock) {
      localTheme$ = new BehaviorSubject<Theme | null>(baseTheme);
      TestBed.configureTestingModule({
        imports: [LoginComponent, TranslateModule.forRoot()],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
          },
          { provide: SseService, useValue: { connect: jest.fn().mockReturnValue(NEVER) } },
          {
            provide: ThemeService,
            useValue: { observeTheme: () => localTheme$.asObservable(), sanitizeEmbedHtml: sanitizeEmbedHtmlImpl }
          },
          { provide: TenantService, useValue: makeTenantService() },
        ]
      }).overrideComponent(LoginComponent, {
        remove: { imports: [QRCodeComponent] },
        add: { imports: [MockQRCodeComponent] }
      });
    }

    afterEach(() => {
      jest.restoreAllMocks();
      localFixture?.destroy();
    });

    // AC-02 / EC-04 — null → .embedded-footer NOT rendered (DOM node fully absent)
    it('AC-02/EC-04: .embedded-footer is absent when footerHtml is null', () => {
      buildFooterTestBed(jest.fn().mockReturnValue(null));
      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-footer')).toBeNull();
    });

    // AC-01 — SafeHtml → .embedded-footer IS rendered
    it('AC-01: .embedded-footer is present when footerHtml is a SafeHtml value', () => {
      const mockSanitize = jest.fn();
      buildFooterTestBed(mockSanitize);

      const domSanitizer = TestBed.inject(DomSanitizer);
      const safeHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<footer>Tenant Footer</footer>');
      // sanitizeEmbedHtml is called twice: once for headerEmbedCode, once for footerEmbedCode
      mockSanitize.mockReturnValueOnce(null).mockReturnValueOnce(safeHtml);

      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-footer')).not.toBeNull();
    });

    // AC-02 — *ngIf removes node from DOM (not just hidden) when footerHtml transitions to null
    it('AC-02: .embedded-footer node is removed from DOM when footerHtml becomes null', () => {
      const mockSanitize = jest.fn();
      buildFooterTestBed(mockSanitize);

      const domSanitizer = TestBed.inject(DomSanitizer);
      const safeHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<footer>Footer</footer>');
      // First subscription: header=null, footer=SafeHtml
      mockSanitize.mockReturnValueOnce(null).mockReturnValueOnce(safeHtml);

      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();
      expect(localFixture.nativeElement.querySelector('.embedded-footer')).not.toBeNull();

      // Theme update: footer embed code removed → both calls return null
      mockSanitize.mockReturnValue(null);
      localTheme$.next({ ...baseTheme, content: { ...baseTheme.content, footerEmbedCode: null } });
      localFixture.detectChanges();

      // Node must be fully absent — not just hidden (AC-02 / FR-07)
      expect(localFixture.nativeElement.querySelector('.embedded-footer')).toBeNull();
    });

    // EC-01 — empty after sanitize → null → .embedded-footer NOT rendered
    it('EC-01: .embedded-footer is absent when sanitization strips all footer content (returns null)', () => {
      buildFooterTestBed(jest.fn().mockReturnValue(null));
      localTheme$.next({ ...baseTheme, content: { ...baseTheme.content, footerEmbedCode: '<script>evil()</script>' } });
      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-footer')).toBeNull();
    });

    // Coexistence — header + footer both present simultaneously
    it('both .embedded-header and .embedded-footer are present when both have SafeHtml values', () => {
      const mockSanitize = jest.fn();
      buildFooterTestBed(mockSanitize);

      const domSanitizer = TestBed.inject(DomSanitizer);
      const headerHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<nav>Header</nav>');
      const footerHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<footer>Footer</footer>');
      mockSanitize.mockReturnValueOnce(headerHtml).mockReturnValueOnce(footerHtml);

      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-header')).not.toBeNull();
      expect(localFixture.nativeElement.querySelector('.embedded-footer')).not.toBeNull();
    });
  });

  // --- Embedded header conditional render (EUDISTACK-605 AC-01 / AC-02) ---

  describe('embedded header conditional render (EUDISTACK-605)', () => {
    let localTheme$: BehaviorSubject<Theme | null>;
    let localFixture: ComponentFixture<LoginComponent>;

    function buildTestBed(sanitizeEmbedHtml: jest.Mock) {
      localTheme$ = new BehaviorSubject<Theme | null>(baseTheme);
      TestBed.configureTestingModule({
        imports: [LoginComponent, TranslateModule.forRoot()],
        providers: [
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { queryParamMap: convertToParamMap({}) } }
          },
          { provide: SseService, useValue: { connect: jest.fn().mockReturnValue(NEVER) } },
          {
            provide: ThemeService,
            useValue: { observeTheme: () => localTheme$.asObservable(), sanitizeEmbedHtml }
          },
          { provide: TenantService, useValue: makeTenantService() },
        ]
      }).overrideComponent(LoginComponent, {
        remove: { imports: [QRCodeComponent] },
        add: { imports: [MockQRCodeComponent] }
      });
    }

    afterEach(() => {
      jest.restoreAllMocks();
      localFixture?.destroy();
    });

    // AC-02 / EC-04 — null → .embedded-header NOT rendered (DOM node fully absent)
    it('AC-02/EC-04: .embedded-header is absent when sanitizeEmbedHtml returns null', () => {
      buildTestBed(jest.fn().mockReturnValue(null));
      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-header')).toBeNull();
    });

    // AC-01 — SafeHtml → .embedded-header IS rendered
    it('AC-01: .embedded-header is present when sanitizeEmbedHtml returns a SafeHtml value', () => {
      const mockSanitize = jest.fn();
      buildTestBed(mockSanitize);

      const domSanitizer = TestBed.inject(DomSanitizer);
      const safeHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<nav>Tenant Header</nav>');
      mockSanitize.mockReturnValue(safeHtml);

      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-header')).not.toBeNull();
    });

    // AC-02 — when embedded header present, branding .header is hidden (no double logo)
    it('AC-02: branding .header is absent when embedded header is rendered', () => {
      const mockSanitize = jest.fn();
      buildTestBed(mockSanitize);

      const domSanitizer = TestBed.inject(DomSanitizer);
      const safeHtml: SafeHtml = domSanitizer.bypassSecurityTrustHtml('<nav>Tenant Header</nav>');
      mockSanitize.mockReturnValue(safeHtml);

      localTheme$.next({ ...baseTheme, branding: { ...baseTheme.branding, logoUrl: '/logo.png' } });
      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-header')).not.toBeNull();
      expect(localFixture.nativeElement.querySelector('header.header')).toBeNull();
    });

    // AC-02 — when no embedded header, branding .header IS shown
    it('AC-02: branding .header is present when there is no embedded header', () => {
      buildTestBed(jest.fn().mockReturnValue(null));

      localTheme$.next({ ...baseTheme, branding: { ...baseTheme.branding, logoUrl: '/logo.png' } });
      localFixture = TestBed.createComponent(LoginComponent);
      localFixture.detectChanges();

      expect(localFixture.nativeElement.querySelector('.embedded-header')).toBeNull();
      expect(localFixture.nativeElement.querySelector('header.header')).not.toBeNull();
    });
  });
});
