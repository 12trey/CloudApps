import { isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CloudappsComponent } from './cloudapps/cloudapps.component';

import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { IPublicClientApplication, PublicClientApplication, InteractionType, BrowserCacheLocation, LogLevel } from '@azure/msal-browser';
import { MsalGuard, MsalInterceptor, MsalBroadcastService, MsalInterceptorConfiguration, MsalModule, MsalService, MSAL_GUARD_CONFIG, MSAL_INSTANCE, MSAL_INTERCEPTOR_CONFIG, MsalGuardConfiguration } from '@azure/msal-angular';
import { WapiService } from './wapi.service';
//import { TgtUxlibModule, TgtUxlibComponent, TgtUxlibService } from 'angular-uxlib'
//import { TgtUxlibModule, TgtUxlibComponent, TgtUxlibService } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/projects/angular-uxlib/src/public-api';
//import { TgtUxlibModule, TgtUxlibComponent, TgtUxlibService } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/dist/angular-uxlib';
import { TgtUxlibModule, TgtUxlibComponent, TgtUxlibService } from 'angular-uxlib';
import * as config from '../../../privatedata/config.json';
const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1;

export function loggerCallback(logLevel: LogLevel, message: string) {
  if(isDevMode()) console.log(message);
}

export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      authority: `https://login.microsoftonline.com/${config.credentials.tenantID}`,
      navigateToLoginRequestUrl: true,
      clientId: config.credentials.spaclientid,
      redirectUri: isDevMode()?'https://localhost:4200':'https://localhost:4000',
      postLogoutRedirectUri: isDevMode()?'https://localhost:4200':'https://localhost:4000'
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
      storeAuthStateInCookie: isIE, // set to true for IE 11
    },
    system: {
      loggerOptions: {
        loggerCallback,
        logLevel: LogLevel.Info,
        piiLoggingEnabled: false
      }
    }
  });
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  //protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read']);
  protectedResourceMap.set('https://graph.microsoft.com/v1.0/me', ['user.read', 'email', 'profile']);
  protectedResourceMap.set('/api/*', [ `api://${config.credentials.clientID}/apiaccess` ]);
  protectedResourceMap.set('https://graph.microsoft.com/beta/me/photo', [ 'profile', 'user.read']);

  return {
    interactionType: InteractionType.Popup,
    protectedResourceMap
  };
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return { interactionType: InteractionType.Popup };
}

@NgModule({
  declarations: [
    AppComponent,
    CloudappsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    MsalModule,
    FormsModule,
    TgtUxlibModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: MSAL_INSTANCE,
      useFactory: MSALInstanceFactory
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: MSALGuardConfigFactory
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: MSALInterceptorConfigFactory
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    WapiService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
