import { Platform } from '@ionic/angular';
import { StorageBackend, Requestor } from '@openid/appauth';
import { AuthService, Browser, ConsoleLogObserver } from 'ionic-appauth';
import { NgZone } from '@angular/core';
import { UserSettingService } from '../../../core/services/user-setting/user-setting.service';
import { settings } from '../../../../settings';
import { AppMode } from '../../../core/models/app-mode.enum';

export let authFactory = (platform: Platform, ngZone: NgZone,
  requestor: Requestor, browser: Browser, storage: StorageBackend, userSettingService: UserSettingService) => {

  const authService = new AuthService(browser, storage, requestor);

  userSettingService.appMode$.subscribe((appMode: AppMode) => {
    authService.authConfig = settings.authConfig[appMode];
  });


  if (!platform.is('cordova')) {
    authService.authConfig.redirect_url = window.location.origin + '/auth/callback';
    authService.authConfig.end_session_redirect_url = window.location.origin + '/auth/endsession';
  }

  if (platform.is('cordova')) {
    (window as any).handleOpenURL = (callbackUrl) => {
      ngZone.run(() => {
        authService.authorizationCallback(callbackUrl);
      });
    };
  }

  authService.addActionObserver(new ConsoleLogObserver());
  return authService;
};
