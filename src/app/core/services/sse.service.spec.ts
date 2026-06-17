import { TestBed } from '@angular/core/testing';
import { SseService } from './sse.service';
import { TenantService } from './tenant.service';
import { environment } from '../../../environments/environment';

describe('SseService', () => {
  let service: SseService;

  let tenantServiceMock: {
    isCanonical: jest.Mock<boolean, []>;
  };

  let mockEventSource: {
    addEventListener: jest.Mock;
    onerror: ((event: Event) => void) | null;
    close: jest.Mock;
  };

  beforeEach(() => {
    tenantServiceMock = {
      isCanonical: jest.fn().mockReturnValue(true)
    };

    mockEventSource = {
      addEventListener: jest.fn(),
      onerror: null,
      close: jest.fn()
    };

    (globalThis as any).EventSource = jest
      .fn()
      .mockImplementation(() => mockEventSource);

    TestBed.configureTestingModule({
      providers: [
        SseService,
        {
          provide: TenantService,
          useValue: tenantServiceMock
        }
      ]
    });

    service = TestBed.inject(SseService);
  });

  afterEach(() => {
    delete (globalThis as any).EventSource;
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('connect', () => {
    it('should create EventSource with correct URL when tenant is canonical', () => {
      service.connect('test-state').subscribe();

      expect(globalThis.EventSource).toHaveBeenCalledWith(
        `${environment.api_base_url}/api/login/events?state=test-state`
      );
    });

    it('should create EventSource with relative URL when tenant is not canonical', () => {
      tenantServiceMock.isCanonical.mockReturnValue(false);

      service.connect('test-state').subscribe();

      expect(globalThis.EventSource).toHaveBeenCalledWith(
        '/api/login/events?state=test-state'
      );
    });

    it('should encode special characters in state parameter', () => {
      service.connect('state with spaces&special=chars').subscribe();

      expect(globalThis.EventSource).toHaveBeenCalledWith(
        `${environment.api_base_url}/api/login/events?state=state%20with%20spaces%26special%3Dchars`
      );
    });

    it('should listen for redirect events', () => {
      service.connect('s1').subscribe();

      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'redirect',
        expect.any(Function)
      );
    });

    it('should emit redirect URL, complete and close on redirect event', () => {
      const values: string[] = [];
      let completed = false;

      service.connect('s1').subscribe({
        next: value => values.push(value),
        complete: () => {
          completed = true;
        }
      });

      const redirectHandler = mockEventSource.addEventListener.mock.calls[0][1];

      redirectHandler({
        data: 'https://client.example.com/callback?code=abc'
      } as MessageEvent);

      expect(values).toEqual(['https://client.example.com/callback?code=abc']);
      expect(completed).toBe(true);
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should emit error and close on EventSource error', () => {
      let receivedError: Error | null = null;

      service.connect('s1').subscribe({
        error: error => {
          receivedError = error;
        }
      });

      mockEventSource.onerror?.({} as Event);

      expect(receivedError).toBeInstanceOf(Error);
      expect(receivedError?.message).toBe('SSE connection failed');
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should close EventSource on unsubscribe', () => {
      const subscription = service.connect('s1').subscribe();

      subscription.unsubscribe();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should return an Observable', () => {
      const result = service.connect('s1');

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });
});