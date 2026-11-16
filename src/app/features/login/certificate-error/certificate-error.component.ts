import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CertificateLoginReason } from '../../../core/services/certificate-login.service';

@Component({
  selector: 'app-certificate-error',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  host: { role: 'alert' },
  templateUrl: './certificate-error.component.html',
  styleUrls: ['./certificate-error.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CertificateErrorComponent {
  readonly reason = input.required<CertificateLoginReason>();
  readonly canChangeMethod = input(false);
  readonly changeMethod = output<void>();
  readonly backToApplication = output<void>();
}
