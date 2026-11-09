import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CertificateLoginService } from './certificate-login.service';
import { TenantService } from './tenant.service';
import { environment } from '../../../environments/environment';

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

describe('CertificateLoginService', () => {
  let service: CertificateLoginService;
  let fetchMock: jest.Mock;
  const originalBaseUrl = environment.cert_base_url;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
    TestBed.configureTestingModule({
      providers: [{ provide: TenantService, useValue: { tenant: () => 'cgcom' } }]
    });
    service = TestBed.inject(CertificateLoginService);
  });

  afterEach(() => {
    environment.cert_base_url = originalBaseUrl;
  });

  it('should POST the state to the certificate address of the tenant with CORS and credentials', async () => {
    environment.cert_base_url = 'https://{tenant}-cert.stg.eudistack.net/verifier/';
    fetchMock.mockResolvedValue(jsonResponse(200, { redirect_uri: 'https://portal.example.com/cb?code=c1&state=s1' }));

    await firstValueFrom(service.login('s1'));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://cgcom-cert.stg.eudistack.net/verifier/api/login/certificate');
    expect(init).toEqual(expect.objectContaining({
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 's1' }),
    }));
  });

  it('should emit the redirect URI when the login is completed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { redirect_uri: 'https://portal.example.com/cb?code=c1&state=s1' }));

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ redirectUri: 'https://portal.example.com/cb?code=c1&state=s1' });
  });

  it.each([
    [403, 'certificate_not_natural_person'],
    [403, 'certificate_revoked'],
    [403, 'level_not_met'],
    [404, 'login_not_found'],
    [503, 'trust_validation_unavailable'],
  ])('should emit the code of a %i response (%s)', async (status, reason) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { type: reason }));

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ reason });
  });

  it('should treat a network error as certificate_missing, which is what a cancelled certificate picker produces', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ reason: 'certificate_missing' });
  });

  it('should treat an unknown code as trust_validation_unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { type: 'something_new' }));

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ reason: 'trust_validation_unavailable' });
  });

  it('should treat an error response without a JSON body as trust_validation_unavailable', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError('not json')) });

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ reason: 'trust_validation_unavailable' });
  });

  it('should treat a success response without redirect_uri as trust_validation_unavailable', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    const result = await firstValueFrom(service.login('s1'));

    expect(result).toEqual({ reason: 'trust_validation_unavailable' });
  });

  it('should not call the certificate address when it is not configured', async () => {
    environment.cert_base_url = '';

    const result = await firstValueFrom(service.login('s1'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ reason: 'trust_validation_unavailable' });
  });

  it('should abort the call when the subscription is cancelled', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));

    service.login('s1').subscribe().unsubscribe();

    const signal: AbortSignal = fetchMock.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(true);
  });

  it('should remove every trailing slash of the certificate address', async () => {
    environment.cert_base_url = 'https://{tenant}-cert.stg.eudistack.net/verifier///';
    fetchMock.mockResolvedValue(jsonResponse(200, { redirect_uri: 'https://portal.example.com/cb' }));

    await firstValueFrom(service.login('s1'));

    expect(fetchMock.mock.calls[0][0]).toBe('https://cgcom-cert.stg.eudistack.net/verifier/api/login/certificate');
  });

  it('should emit the error when the call cannot be prepared', async () => {
    environment.cert_base_url = 'https://{tenant}-cert.stg.eudistack.net/verifier';
    const failure = new Error('no tenant');
    jest.spyOn(TestBed.inject(TenantService), 'tenant').mockImplementation(() => { throw failure; });

    await expect(firstValueFrom(service.login('s1'))).rejects.toBe(failure);
  });
});
