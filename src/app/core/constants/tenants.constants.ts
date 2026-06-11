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

const ENV_SUFFIXES = ['-stg', '-dev', '-pre'] as const;

/** Valid tenant slug: lowercase alphanumerics and hyphens only (ES-05 path-traversal guard). */
const TENANT_SLUG_RE = /^[a-z0-9-]+$/;

function stripEnvSuffix(tenant: string): { base: string; suffix: string } {
  const match = ENV_SUFFIXES.find((s) => tenant.endsWith(s));
  return match
    ? { base: tenant.slice(0, -match.length), suffix: match }
    : { base: tenant, suffix: '' };
}

/**
 * Resolves the tenant slug from a hostname string.
 *
 * 1. Takes the first label of the hostname and lower-cases it.
 * 2. Strips a recognised environment suffix (-stg / -dev / -pre).
 * 3. Validates the result against `^[a-z0-9-]+$` (ES-05).
 *    Returns FALLBACK_TENANT if the label is empty or contains invalid characters.
 */
export function resolveTenant(hostname: string): string {
  const first = hostname.split('.')[0].toLowerCase();
  const { base } = stripEnvSuffix(first);
  if (!base || !TENANT_SLUG_RE.test(base)) {
    return FALLBACK_TENANT;
  }
  return base;
}
