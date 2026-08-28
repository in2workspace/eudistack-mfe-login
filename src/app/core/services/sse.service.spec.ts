import { SseService } from './sse.service';

describe('SseService', () => {
  let service: SseService;
  let mockEventSource: {
    addEventListener: jest.Mock;
    onerror: ((event: Event) => void) | null;
    close: jest.Mock;
  };

  beforeEach(() => {
    service = new SseService();

    mockEventSource = {
      addEventListener: jest.fn(),
      onerror: null,
      close: jest.fn()
    };

    (globalThis as any).EventSource = jest.fn().mockImplementation(() => mockEventSource);
  });

  afterEach(() => {
    delete (globalThis as any).EventSource;
  });

  describe('connect', () => {
    it('should create EventSource with correct URL', () => {
      service.connect('test-state').subscribe();

      expect(globalThis.EventSource).toHaveBeenCalledWith(
        'http://localhost:8082/api/login/events?state=test-state'
      );
    });

    it('should encode special characters in state parameter', () => {
      service.connect('state with spaces&special=chars').subscribe();

      expect(globalThis.EventSource).toHaveBeenCalledWith(
        'http://localhost:8082/api/login/events?state=state%20with%20spaces%26special%3Dchars'
      );
    });

    it('should listen for redirect events', () => {
      service.connect('s1').subscribe();

      expect(mockEventSource.addEventListener).toHaveBeenCalledWith(
        'redirect',
        expect.any(Function)
      );
    });

    it('should emit redirect URL and complete on redirect event', () => {
      const values: string[] = [];
      let completed = false;

      service.connect('s1').subscribe({
        next: v => values.push(v),
        complete: () => (completed = true)
      });

      const handler = mockEventSource.addEventListener.mock.calls[0][1];
      handler({ data: 'https://client.example.com/callback?code=abc' } as MessageEvent);

      expect(values).toEqual(['https://client.example.com/callback?code=abc']);
      expect(completed).toBe(true);
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should emit error and close on EventSource error', () => {
      let receivedError: Error | null = null;

      service.connect('s1').subscribe({
        error: err => (receivedError = err)
      });

      mockEventSource.onerror!({} as Event);

      expect(receivedError).toBeTruthy();
      expect(receivedError!.message).toBe('SSE connection failed');
      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should close EventSource on unsubscribe', () => {
      const sub = service.connect('s1').subscribe();

      sub.unsubscribe();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should return an Observable', () => {
      const result = service.connect('s1');

      expect(result).toBeDefined();
      expect(typeof result.subscribe).toBe('function');
    });
  });
});