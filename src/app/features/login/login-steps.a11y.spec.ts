import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { axe, toHaveNoViolations } from 'jest-axe';
import { of } from 'rxjs';
import es from '../../../assets/i18n/es.json';
import { CertificateErrorComponent } from './certificate-error/certificate-error.component';
import { CertificateStepComponent } from './certificate-step/certificate-step.component';
import { CertificateValidatingComponent } from './certificate-validating/certificate-validating.component';
import { MethodSelectionComponent } from './method-selection/method-selection.component';

expect.extend(toHaveNoViolations);

const COMPONENT_RULES = { rules: { region: { enabled: false } } };

describe('Accessibility of the login steps', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useValue: { getTranslation: () => of(es) } },
        }),
      ],
    }).compileComponents();
    TestBed.inject(TranslateService).use('es');
  });

  async function render<T>(component: Type<T>, inputs: Record<string, unknown> = {}): Promise<ComponentFixture<T>> {
    const fixture = TestBed.createComponent(component);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('method selection, with both methods and the level notice', async () => {
    const fixture = await render(MethodSelectionComponent, {
      methods: ['x509', 'wallet'],
      levelNoticeKey: 'login.methods.levelNotice.high',
    });

    expect(await axe(fixture.nativeElement, COMPONENT_RULES)).toHaveNoViolations();
  });

  it('certificate step, with the change of method', async () => {
    const fixture = await render(CertificateStepComponent, { canChangeMethod: true });

    expect(await axe(fixture.nativeElement, COMPONENT_RULES)).toHaveNoViolations();
  });

  it('certificate validation in progress', async () => {
    const fixture = await render(CertificateValidatingComponent);

    expect(await axe(fixture.nativeElement, COMPONENT_RULES)).toHaveNoViolations();
  });

  it.each(['certificate_revoked', 'level_not_met', 'trust_validation_unavailable'])(
    'certificate error %s, with the change of method',
    async (reason) => {
      const fixture = await render(CertificateErrorComponent, { reason, canChangeMethod: true });

      expect(await axe(fixture.nativeElement, COMPONENT_RULES)).toHaveNoViolations();
    },
  );
});
