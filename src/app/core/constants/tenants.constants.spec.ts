import { FALLBACK_TENANT, KNOWN_TENANTS } from './tenants.constants';

describe('KNOWN_TENANTS', () => {
  it('should include dome, sandbox, and eudistack', () => {
    expect(KNOWN_TENANTS).toContain('dome');
    expect(KNOWN_TENANTS).toContain('sandbox');
    expect(KNOWN_TENANTS).toContain('eudistack');
  });

  it('should include localhost', () => {
    expect(KNOWN_TENANTS).toContain('localhost');
  });
});

describe('FALLBACK_TENANT', () => {
  it('should be eudistack', () => {
    expect(FALLBACK_TENANT).toBe('eudistack');
  });

  it('should be a member of KNOWN_TENANTS', () => {
    expect(KNOWN_TENANTS).toContain(FALLBACK_TENANT);
  });
});
