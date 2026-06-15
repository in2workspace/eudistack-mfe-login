export const KNOWN_TENANTS: readonly string[] = [
  'dome',
  'kpmg',
  'sandbox',
  'platform',
  'eudistack',
  'localhost',
];

/**
 * Fallback tenant used when no valid tenant can be resolved from the hostname.
 * 'eudistack' is the canonical fallback for the Login MFE; the 'sandbox' alias
 * is resolved at the nginx / CloudFront level before requests reach this code.
 */
export const FALLBACK_TENANT = 'eudistack';
