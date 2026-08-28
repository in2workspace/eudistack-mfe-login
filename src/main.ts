import { bootstrapApplication } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { defineCustomElements } from 'ionicons/loader';
import {
  walletOutline,
  qrCodeOutline,
  personOutline,
  mailOutline,
  openOutline,
  copyOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Register the <ion-icon> web component (this MFE is not an Ionic app, so we
// define the element manually instead of via IonicModule) and inline the icon
// SVGs we use so they render without a runtime fetch — same Ionicons set the
// Wallet PWA uses.
defineCustomElements(window);
addIcons({
  'wallet-outline': walletOutline,
  'qr-code-outline': qrCodeOutline,
  'person-outline': personOutline,
  'mail-outline': mailOutline,
  'open-outline': openOutline,
  'copy-outline': copyOutline,
  'checkmark-outline': checkmarkOutline,
});

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
