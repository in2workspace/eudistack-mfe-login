import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginSessionService } from './login-session.service';

describe('LoginSessionService', () => {
  let service: LoginSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(LoginSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('abort', () => {
    it('should POST the state to the Verifier abort endpoint and emit the redirect URL', () => {
      let result: string | null | undefined;
      service.abort('s 1&x').subscribe(url => result = url);

      const req = httpMock.expectOne(r => r.url === 'http://localhost:8082/api/login/abort');
      expect(req.request.method).toBe('POST');
      expect(req.request.params.get('state')).toBe('s 1&x');
      req.flush({ redirectUrl: 'https://rp.example.com/cb?error=access_denied&state=s1' });

      expect(result).toBe('https://rp.example.com/cb?error=access_denied&state=s1');
    });

    it('should emit null when the Verifier does not know the login (404)', () => {
      let result: string | null | undefined;
      service.abort('unknown').subscribe(url => result = url);

      httpMock.expectOne(r => r.url.endsWith('/api/login/abort'))
        .flush(null, { status: 404, statusText: 'Not Found' });

      expect(result).toBeNull();
    });

    it('should emit null on network error', () => {
      let result: string | null | undefined;
      service.abort('s1').subscribe(url => result = url);

      httpMock.expectOne(r => r.url.endsWith('/api/login/abort'))
        .error(new ProgressEvent('error'));

      expect(result).toBeNull();
    });

    it('should emit null when the response has no redirectUrl', () => {
      let result: string | null | undefined;
      service.abort('s1').subscribe(url => result = url);

      httpMock.expectOne(r => r.url.endsWith('/api/login/abort')).flush({});

      expect(result).toBeNull();
    });
  });
});
