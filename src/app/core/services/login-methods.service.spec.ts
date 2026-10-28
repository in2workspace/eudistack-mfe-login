import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginMethods, LoginMethodsService } from './login-methods.service';

describe('LoginMethodsService', () => {
  let service: LoginMethodsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(LoginMethodsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getMethods', () => {
    it('should GET the methods of the login identified by state', () => {
      let result: LoginMethods | undefined;
      service.getMethods('s 1&x').subscribe(methods => result = methods);

      const req = httpMock.expectOne(r => r.url === 'http://localhost:8082/api/login/methods');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('state')).toBe('s 1&x');
      req.flush({ methods: ['x509', 'wallet'], essential_level: 'http://eidas.europa.eu/LoA/high' });

      expect(result).toEqual({ methods: ['x509', 'wallet'], essential_level: 'http://eidas.europa.eu/LoA/high' });
    });

    it('should propagate the error when the Verifier does not know the login (404)', () => {
      let status: number | undefined;
      service.getMethods('unknown').subscribe({ error: err => status = err.status });

      httpMock.expectOne(r => r.url.endsWith('/api/login/methods'))
        .flush({ reason: 'LoginNotFound' }, { status: 404, statusText: 'Not Found' });

      expect(status).toBe(404);
    });
  });
});
