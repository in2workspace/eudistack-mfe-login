import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LoginMethod } from '../../../core/services/login-methods.service';

const METHOD_ICONS: Record<LoginMethod, string> = {
  x509: 'id-card-outline',
  wallet: 'wallet-outline',
};

@Component({
  selector: 'app-method-selection',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './method-selection.component.html',
  styleUrls: ['./method-selection.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MethodSelectionComponent {
  readonly methods = input.required<LoginMethod[]>();
  readonly levelNoticeKey = input<string | null>(null);
  readonly methodChosen = output<LoginMethod>();
  readonly backToApplication = output<void>();
  readonly methodIcons = METHOD_ICONS;
}
