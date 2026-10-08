import { Component, computed, inject, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
import { QRCodeComponent } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, fromEvent, Observable, Subscription, timer } from 'rxjs';
import { debounceTime, map, switchMap, tap } from 'rxjs/operators';
import { SseService, SseValidationError } from '../../core/services/sse.service';
import { LoginSessionService } from '../../core/services/login-session.service';
import { ThemeService } from '../../core/services/theme.service';
import { TenantService } from '../../core/services/tenant.service';
import { Theme } from '../../core/models/theme.model';

const LOGIN_TIMEOUT_MS = 120_000;
const LOGIN_TIMEOUT_SECONDS = LOGIN_TIMEOUT_MS / 1000;
const TIMEOUT_REDIRECT_DELAY_MS = 3000;

const CONTENT_MIN_WIDTH_PX = 760;
const CONTENT_MAX_WIDTH_PX = 1180;
const CONTENT_WIDTH_VW_RATIO = 0.396;
const CONTENT_WIDTH_VH_RATIO = 0.85;
const QR_MIN_SIZE_PX = 240;
const QR_MAX_SIZE_PX = 300;
const QR_FRAME_ALLOWANCE_PX = 36;
const RESIZE_DEBOUNCE_MS = 120;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, QRCodeComponent, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LoginComponent implements OnInit, OnDestroy {
  authRequest = '';
  state = '';
  theme: Theme | null = null;
  headerHtml: SafeHtml | null = null;
  footerHtml: SafeHtml | null = null;
  timedOut = false;
  errorMessage = '';
  copied = false;
  waitingForVerification = false;
  showSuccess = false;
  remainingSeconds: number = LOGIN_TIMEOUT_SECONDS;
  countdownPercentage: number = 100;

  private readonly viewport = toSignal(
    fromEvent(window, 'resize').pipe(
      debounceTime(RESIZE_DEBOUNCE_MS),
      map(() => ({ width: window.innerWidth, height: window.innerHeight }))
    ),
    { initialValue: { width: window.innerWidth, height: window.innerHeight } }
  );

  readonly contentWidth = computed(() => {
    const { width, height } = this.viewport();
    const fluidWidth = Math.min(width * CONTENT_WIDTH_VW_RATIO, height * CONTENT_WIDTH_VH_RATIO);
    return Math.min(Math.max(fluidWidth, CONTENT_MIN_WIDTH_PX), CONTENT_MAX_WIDTH_PX);
  });

  readonly qrSize = computed(() => {
    const growth = (this.contentWidth() - CONTENT_MIN_WIDTH_PX) / (CONTENT_MAX_WIDTH_PX - CONTENT_MIN_WIDTH_PX);
    return Math.round(QR_MIN_SIZE_PX + growth * (QR_MAX_SIZE_PX - QR_MIN_SIZE_PX));
  });

  readonly accessColumnMinWidth = computed(() => this.qrSize() + QR_FRAME_ALLOWANCE_PX);

  private sseSub?: Subscription;
  private timerSub?: Subscription;
  private themeSub?: Subscription;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private countdownDeadline = 0;
  private readonly onVisibilityChange = (): void => this.tickCountdown();

  private readonly tenantService = inject(TenantService);
  private readonly loginSessionService = inject(LoginSessionService);

  constructor(
    private route: ActivatedRoute,
    private sseService: SseService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authRequest = this.route.snapshot.queryParamMap.get('authRequest') ?? '';
    this.state = this.route.snapshot.queryParamMap.get('state') ?? '';

    this.themeSub = this.themeService.observeTheme().subscribe(t => {
      this.theme = t;
      this.headerHtml = this.themeService.sanitizeEmbedHtml(t?.content?.headerEmbedCode);
      this.footerHtml = this.themeService.sanitizeEmbedHtml(t?.content?.footerEmbedCode);
    });

    if (this.state) {
      this.waitingForVerification = true;

      this.sseSub = this.sseService.connect(this.state).subscribe({
        next: redirectUrl => {
          // A completed login always wins, even one that lands after the countdown
          // ended: cancel the pending abort/error redirect.
          this.timerSub?.unsubscribe();
          this.timedOut = false;
          this.waitingForVerification = false;
          this.showSuccess = true;
          this.clearCountdown();
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 800);
        },
        error: (err: unknown) => {
          // After the timeout the stream closing is expected: stay on the expired screen.
          if (this.timedOut) return;
          this.waitingForVerification = false;
          this.errorMessage = err instanceof SseValidationError && err.code === 'CREDENTIAL_REVOKED'
            ? 'login.errorCredentialRevoked'
            : 'login.error';
          this.clearCountdown();
        }
      });

      this.startCountdown();

      this.timerSub = timer(LOGIN_TIMEOUT_MS).pipe(
        tap(() => this.markTimedOut()),
        switchMap(() => this.resolveReturnUrl())
      ).subscribe(returnUrl => {
        if (returnUrl) {
          this.sseSub?.unsubscribe();
          window.location.href = returnUrl;
        }
      });
    }
  }

  get walletUrl(): string | null {
    if (this.tenantService.isCanonical()) {
      return '/wallet';
    }
    return this.tenantService.resolvedEnv()?.wallet ?? null;
  }

  get walletRedirectUrl(): string {
    const walletUrl = this.walletUrl;
    if (!this.authRequest || !walletUrl) return '';
    const base = walletUrl.replace(/\/+$/, '');
    return `${base}/protocol/callback?authorization_request=${encodeURIComponent(this.authRequest)}`;
  }

  copyAuthRequest(): void {
    if (!this.authRequest) return;
    navigator.clipboard.writeText(this.authRequest)
      .then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      })
      .catch(err => console.warn('Could not copy the access code to the clipboard.', err));
  }

  openWallet(): void {
    if (!this.walletRedirectUrl) return;
    const opened = window.open(this.walletRedirectUrl, '_blank');
    if (!opened) {
      window.location.href = this.walletRedirectUrl;
    }
  }

  private markTimedOut(): void {
    this.waitingForVerification = false;
    this.timedOut = true;
    this.clearCountdown();
  }

  /**
   * Only the Verifier knows which application started the login, so the return
   * URL comes from aborting the login there. Emits `null` when it is unknown:
   * the user then stays on the expired screen instead of being sent elsewhere.
   * Never emits before the expired message has been shown for a moment.
   *
   * The SSE stream stays open meanwhile: abort and completion are mutually
   * exclusive at the Verifier, so if the abort finds nothing (`null`) a wallet
   * presentation may be completing the login right now, and its redirect still
   * wins. The Verifier closes the stream itself shortly after the timeout.
   */
  private resolveReturnUrl(): Observable<string | null> {
    return forkJoin([
      this.loginSessionService.abort(this.state),
      timer(TIMEOUT_REDIRECT_DELAY_MS)
    ]).pipe(map(([returnUrl]) => returnUrl));
  }

  /**
   * Drives the countdown from wall-clock time (a fixed deadline) rather than
   * counting `setInterval` firings. A tick-counting countdown silently drifts
   * (or appears frozen) whenever the browser throttles or delays timers in a
   * backgrounded/hidden tab — exactly what happens while the user looks away
   * from this device to scan the QR with their wallet. Recomputing from
   * `Date.now()` on every tick, and immediately on `visibilitychange`, makes
   * the displayed value self-correct instead of slowly catching up.
   */
  private startCountdown(): void {
    this.countdownDeadline = Date.now() + LOGIN_TIMEOUT_MS;
    this.tickCountdown();
    this.countdownInterval = setInterval(() => this.tickCountdown(), 1000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private tickCountdown(): void {
    const remainingMs = Math.max(0, this.countdownDeadline - Date.now());
    this.remainingSeconds = Math.ceil(remainingMs / 1000);
    this.countdownPercentage = (remainingMs / LOGIN_TIMEOUT_MS) * 100;
    if (remainingMs <= 0) {
      this.clearCountdown();
    }
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
    this.timerSub?.unsubscribe();
    this.themeSub?.unsubscribe();
    this.clearCountdown();
  }
}
