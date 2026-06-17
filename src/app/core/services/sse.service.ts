import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class SseService {
  private readonly tenantService = inject(TenantService);

  connect(state: string): Observable<string> {
    return new Observable<string>(subscriber => {
      const prefix = this.tenantService.isCanonical() ? environment.api_base_url : '';
      const url = `${prefix}/api/login/events?state=${encodeURIComponent(state)}`;
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
