export interface Theme {
  tenantDomain: string;
  branding: {
    name: string;
    primaryColor: string;
    primaryContrastColor: string;
    secondaryColor: string;
    secondaryContrastColor: string;
    logoUrl: string | null;
    logoDarkUrl?: string | null;
    faviconUrl: string | null;
    auth?: {
      background?: string;
      gradientEnd?: string;
    };
  };
  content: {
    links: { label: string; url: string }[];
    footer: string | null;
    headerEmbedCode?: string | null;
    footerEmbedCode?: string | null;
    /**
     * @deprecated Use headerEmbedCode / footerEmbedCode instead.
     * Ignored at runtime as of EUDISTACK-545. Kept for backward-compat (ADR-arch-005).
     */
    onboardingUrl: string | null;
    supportUrl: string | null;
    walletUrl: string | null;
    knowledgeBaseUrl: string | null;
  };
  i18n: {
    defaultLang: string;
    available: string[];
  };
}
