import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-certificate-validating',
  standalone: true,
  imports: [TranslateModule],
  host: { role: 'status', 'aria-live': 'polite' },
  template: `
    <div class="spinner" aria-hidden="true"></div>
    <p class="step-text">{{ 'login.certificate.validating' | translate }}</p>
  `,
  styleUrls: ['./certificate-validating.component.scss']
})
export class CertificateValidatingComponent {}
