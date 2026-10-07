import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../core/services/theme.service';
import { Theme } from '../../core/models/theme.model';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './error.component.html',
  styleUrls: ['./error.component.scss']
})
export class ErrorComponent implements OnInit {
  errorCode = '';
  errorMessage = '';
  clientUrl = '';
  originalRequestURL = '';
  theme: Theme | null = null;
  copied = false;

  constructor(
    private route: ActivatedRoute,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.errorCode = params.get('errorCode') ?? '';
    this.errorMessage = params.get('errorMessage') ?? '';
    this.clientUrl = params.get('clientUrl') ?? '';
    this.originalRequestURL = params.get('originalRequestURL') ?? '';
    this.theme = this.themeService.snapshot;
  }

  copyDetails(): void {
    const text = [
      `Error Code: ${this.errorCode}`,
      `Message: ${this.errorMessage}`,
      `Client URL: ${this.clientUrl}`,
      `Request URL: ${this.originalRequestURL}`
    ].join('\n');

    navigator.clipboard.writeText(text)
      .then(() => {
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
      })
      .catch(err => console.warn('Could not copy the error details to the clipboard.', err));
  }
}
