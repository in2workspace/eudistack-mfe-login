import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

      eventSource.onerror = () => {
        subscriber.error(new Error('SSE connection failed'));
        eventSource.close();
      };

      return () => eventSource.close();
    });
  }
}