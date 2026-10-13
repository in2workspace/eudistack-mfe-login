import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Codes of the verifier's `validation_failed` SSE event that the login reacts to specifically. */
export const SSE_VALIDATION_CODE = {
  CREDENTIAL_REVOKED: 'CREDENTIAL_REVOKED',
} as const;

export class SseValidationError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'SseValidationError';
  }
}

@Injectable({ providedIn: 'root' })
export class SseService {

  connect(state: string): Observable<string> {
    return new Observable<string>(subscriber => {
      const url = `${environment.api_base_url}/api/login/events?state=${encodeURIComponent(state)}`;
      const eventSource = new EventSource(url);

      eventSource.addEventListener('redirect', (event: MessageEvent) => {
        subscriber.next(event.data);
        subscriber.complete();
        eventSource.close();
      });

      eventSource.addEventListener('validation_failed', (event: MessageEvent) => {
        let code = '';
        let message = 'Validation failed';
        try {
          const payload = JSON.parse(event.data);
          code = payload.code ?? '';
          message = payload.message ?? message;
        } catch {
          // Malformed payload: treated as a generic validation failure
        }
        // Close before emitting: stops the emitter closing from triggering onerror.
        eventSource.close();
        subscriber.error(new SseValidationError(code, message));
      });

      eventSource.onerror = () => {
        subscriber.error(new Error('SSE connection failed'));
        eventSource.close();
      };

      return () => eventSource.close();
    });
  }
}