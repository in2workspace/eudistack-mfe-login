import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-certificate-step',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './certificate-step.component.html',
  styleUrls: ['./certificate-step.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CertificateStepComponent {
  readonly canChangeMethod = input(false);
  readonly confirmed = output<void>();
  readonly changeMethod = output<void>();
  readonly backToApplication = output<void>();
}
