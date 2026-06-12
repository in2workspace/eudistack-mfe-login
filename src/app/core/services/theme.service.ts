import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, Subscription, firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import DOMPurify from 'dompurify';
import { Theme } from '../models/theme.model';
import { resolveTenant } from '../constants/tenants.constants';
import {
  EMBED_ALLOWED_TAGS,
  EMBED_ALLOWED_ATTR,
  EMBED_ALLOWED_URI_REGEXP,
} from '../constants/embed-sanitizer.constants';

/**
 * Built-in EUDIStack fallback theme applied when the per-tenant theme.json
 * cannot be loaded (network error, 404, timeout). Mirrors src/assets/theme.json
 * as a TypeScript constant to avoid a second HTTP round-trip on failure.
 * Fields without tenant embed codes are explicitly null (AC-04 backward-compat).
 */
const DEFAULT_THEME: Theme = {
  tenantDomain: 'EUDISTACK',
  branding: {
    name: 'EUDIStack',
    primaryColor: '#0F2B5B',
    primaryContrastColor: '#ffffff',
    secondaryColor: '#00BFA6',
    secondaryContrastColor: '#ffffff',
    logoUrl: 'assets/logos/logo.svg',
    faviconUrl: 'assets/favicon.svg',
  },
  content: {
    links: [],
    footer: null,
    headerEmbedCode: null,
    footerEmbedCode: null,
    knowledgeBaseUrl: 'https://docs.eudistack.net/',
    onboardingUrl: null,
    supportUrl: null,
    walletUrl: '/wallet',
  },
  i18n: {
    defaultLang: 'es',
    available: ['en', 'es'],
  },
};

/**
 * Semantic design tokens — neutral, brand-independent values for content areas.
 * Brand colors (from theme.json) apply to login chrome and header/footer.
 */
const SEMANTIC_DEFAULTS: Record<string, string> = {
  // Surfaces
  '--surface-page': '#F5F7FA',
  '--surface-card': '#FFFFFF',
  '--surface-muted': '#E8ECF1',

  // Text
  '--text-primary': '#1A1A2E',
  '--text-secondary': '#6B7280',
  '--text-disabled': '#9CA3AF',

  // Borders
  '--border-default': '#D1D5DB',
  '--border-strong': '#9CA3AF',

  // Actions — always neutral, NEVER derived from tenant brand
  '--action-primary': '#2563EB',
  '--action-primary-hover': '#1D4ED8',
  '--action-primary-contrast': '#FFFFFF',
  '--action-secondary': '#F3F4F6',
  '--action-secondary-hover': '#E5E7EB',
  '--action-secondary-text': '#374151',

  // Status
  '--status-success': '#059669',
  '--status-warning': '#D97706',
  '--status-error': '#DC2626',
  '--status-info': '#2563EB',
  '--status-neutral': '#6B7280',

  // Radii
  '--radius-sm': '4px',
  '--radius-md': '8px',
  '--radius-lg': '16px',
  '--radius-full': '9999px',

  // Shadows
  '--shadow-sm': '0 1px 2px rgba(0,0,0,0.05)',
  '--shadow-md': '0 4px 6px rgba(0,0,0,0.07)',
  '--shadow-lg': '0 10px 15px rgba(0,0,0,0.1)',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme$ = new BehaviorSubject<Theme | null>(null);
  private langChangeSub?: Subscription;

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private domSanitizer: DomSanitizer
  ) {}

  async load(): Promise<void> {
    const tenant = resolveTenant(window.location.hostname);
    const assetsBase = `/assets/tenants/${tenant}`;
    try {
      const theme = await firstValueFrom(
        this.http.get<Theme>(`${assetsBase}/theme.json`).pipe(timeout(800))
      );
      this.rewriteAssetPaths(theme, assetsBase);
      this.theme$.next(theme);
      this.applyTheme(theme);

      if (theme.i18n) {
        this.translate.addLangs(theme.i18n.available);
        this.translate.setDefaultLang(theme.i18n.defaultLang);
        this.translate.use(theme.i18n.defaultLang);
        // WCAG 3.1.1 — keep HTML lang attribute in sync with active language
        document.documentElement.lang = theme.i18n.defaultLang;
        this.langChangeSub?.unsubscribe();
        this.langChangeSub = this.translate.onLangChange.subscribe(event => {
          document.documentElement.lang = event.lang;
        });
      }
    } catch (error) {
      console.error('ThemeService: failed to load theme configuration', error);
      this.applyDefault();
    }
  }

  observeTheme(): Observable<Theme | null> {
    return this.theme$.asObservable();
  }

  get snapshot(): Theme | null {
    return this.theme$.value;
  }

  /**
   * Sanitizes tenant-provided embed HTML (header or footer) using DOMPurify with
   * the canonical allow-list from architecture.md §6.
   *
   * Returns null when: input is falsy, or all content is stripped by DOMPurify
   * (EC-01 — only prohibited tags → empty result treated as absent).
   *
   * The returned SafeHtml is safe for `[innerHTML]` binding (ADR-arch-003):
   * DOMPurify cleans first; bypassSecurityTrustHtml wraps the clean result only.
   */
  sanitizeEmbedHtml(raw: string | null | undefined): SafeHtml | null {
    if (!raw) return null;
    const clean = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: EMBED_ALLOWED_TAGS,
      ALLOWED_ATTR: EMBED_ALLOWED_ATTR,
      ALLOWED_URI_REGEXP: EMBED_ALLOWED_URI_REGEXP,
    });
    if (!clean.trim()) return null;
    return this.domSanitizer.bypassSecurityTrustHtml(clean);
  }

  get tenantDomain(): string {
    const theme = this.theme$.value;
    if (!theme) {
      throw new Error('ThemeService: theme not loaded yet. Call load() before accessing tenantDomain.');
    }
    return theme.tenantDomain;
  }

  private rewriteAssetPaths(theme: Theme, assetsBase: string): void {
    const rewrite = (path: string | null | undefined): string | null => {
      if (!path) return null;
      if (path.startsWith('/assets/tenants/')) return path;
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      if (normalized.startsWith('assets/tenant/')) {
        return `${assetsBase}/${normalized.slice('assets/tenant/'.length)}`;
      }
      return path;
    };
    if (theme.branding) {
      theme.branding.logoUrl = rewrite(theme.branding.logoUrl) as string;
      theme.branding.faviconUrl = rewrite(theme.branding.faviconUrl) as string;
    }
  }

  private applyDefault(): void {
    this.applyTheme(DEFAULT_THEME);
    this.theme$.next(DEFAULT_THEME);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement.style;

    // Layer 1: Brand tokens (login chrome, header/footer)
    root.setProperty('--primary-color', theme.branding.primaryColor);
    root.setProperty('--primary-contrast-color', theme.branding.primaryContrastColor);
    root.setProperty('--secondary-color', theme.branding.secondaryColor);
    root.setProperty('--secondary-contrast-color', theme.branding.secondaryContrastColor);

    // Layer 2: Semantic tokens (content area)
    const actionPrimary = this.computeActionPrimary(theme.branding.primaryColor);

    for (const [token, value] of Object.entries(SEMANTIC_DEFAULTS)) {
      root.setProperty(token, value);
    }

    root.setProperty('--action-primary', actionPrimary);
    root.setProperty('--action-primary-rgb', this.hexToRgbChannels(actionPrimary));

    // RGB channels for status tokens
    const rgbTokens = ['--status-error', '--status-success', '--status-warning'];
    for (const token of rgbTokens) {
      const value = SEMANTIC_DEFAULTS[token];
      if (value) {
        root.setProperty(`${token}-rgb`, this.hexToRgbChannels(value));
      }
    }

    // Title & favicon
    if (theme.branding.name) {
      document.title = theme.branding.name;
    }

    if (theme.branding.faviconUrl) {
      this.setFavicon(theme.branding.faviconUrl);
    }
  }

  /**
   * If the tenant's primaryColor hue falls in a "safe" blue range (200–280)
   * AND has sufficient lightness (35–65%), use it as action-primary.
   * Otherwise keep the neutral default (#2563EB).
   */
  private computeActionPrimary(brandHex: string): string {
    const hsl = this.hexToHsl(brandHex);
    if (!hsl) return SEMANTIC_DEFAULTS['--action-primary'];

    const hueOk = hsl.h >= 200 && hsl.h <= 280;
    const lightnessOk = hsl.l >= 0.35 && hsl.l <= 0.65;

    return hueOk && lightnessOk ? brandHex : SEMANTIC_DEFAULTS['--action-primary'];
  }

  private hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const raw = hex.replace('#', '').trim();
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const value = Number.parseInt(full, 16);
    if (Number.isNaN(value)) return null;

    const r = ((value >> 16) & 255) / 255;
    const g = ((value >> 8) & 255) / 255;
    const b = (value & 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;

    if (d === 0) return { h: 0, s: 0, l };

    const s = d / (1 - Math.abs(2 * l - 1));

    let h = 0;
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;

    return { h, s, l };
  }

  private hexToRgbChannels(hex: string): string {
    const raw = hex.replace('#', '').trim();
    const full = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
    const value = Number.parseInt(full, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  private setFavicon(url: string): void {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;

    let appleLink = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleLink) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      document.head.appendChild(appleLink);
    }
    appleLink.href = url;
  }
}
