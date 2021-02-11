import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  Input,
  ElementRef
} from '@angular/core';
import { WapiService } from './wapi.service';
import {
  MsalService,
  MsalBroadcastService,
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration
} from '@azure/msal-angular';
import {
  AccountInfo,
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionType,
  PopupRequest,
  RedirectRequest,
  SilentRequest
} from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, first, takeUntil } from 'rxjs/operators';
//import { TgtUxlibComponent } from 'angular-uxlib';
//import { TgtUxlibComponent } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/projects/angular-uxlib/src/public-api';
import { TgtUxlibComponent } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/dist/angular-uxlib';
import { isNgTemplate, ThrowStmt } from '@angular/compiler';
//import { TgtUxlibComponent } from 'angular-uxlib';
import * as config from '../../../privatedata/config.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements
  OnInit,
  OnDestroy {
  title = 'ClientApp';
  isIframe = false;
  loginDisplay = false;
  private readonly _destroying$ = new Subject<void>();

  public intuneData: any[] = [];

  @ViewChild('uxtable') uxtable: TgtUxlibComponent;
  @ViewChild('filter') filter: ElementRef;

  constructor
    (
      private wapi: WapiService,
      @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
      private authService: MsalService,
      private msalBroadcastService: MsalBroadcastService
    ) {

  }

  tableloaded(isready: any): void {
    if (this.uxtable.defer) {
      this.uxtable.init();
    }
    else {
      //this.refreshTableHandles();
    }
  }

  ngOnInit(): void {
    this.isIframe = window !== window.parent && !window.opener;
    this.setLoginDisplay();
    if (this.loginDisplay) {
      let firstaccount = this.authService.instance.getAllAccounts()[0];
      console.log(firstaccount);
      //if(confirm(`There is an active session available for ${firstaccount.username}.\nYou may continue this session, or click login to start a new one.\nClick OK to continue this session or cancel to start a new one.\nAs a reminder, please logout before leaving this site.`)) {
      this.getAccessToken(firstaccount);
      //}
    }
    this.msalBroadcastService.msalSubject$
      .pipe(
        filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS || msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS),
        takeUntil(this._destroying$)
      )
      .subscribe((result) => {
        this.setLoginDisplay();
      });
  }

  setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
  }

  login() {
    if (this.msalGuardConfig.interactionType === InteractionType.Popup) {
      if (this.msalGuardConfig.authRequest) {
        this.authService.loginPopup({ ...this.msalGuardConfig.authRequest } as PopupRequest)
          .subscribe((response: AuthenticationResult) => {
            this.authService.instance.setActiveAccount(response.account);
            this.setLoginDisplay();
            this.getAccessToken(response.account);
          });
      } else {
        this.authService.loginPopup()
          .subscribe((response: AuthenticationResult) => {
            this.authService.instance.setActiveAccount(response.account);
            this.setLoginDisplay();
            this.getAccessToken(response.account);
          });
      }
    } else {
      if (this.msalGuardConfig.authRequest) {
        this.authService.loginRedirect({ ...this.msalGuardConfig.authRequest } as RedirectRequest);
      } else {
        this.authService.loginRedirect();
      }
    }
  }

  getAccessToken(account: AccountInfo): void {
    let sr: SilentRequest = {
      scopes: [`api://${config.credentials.clientID}/apiaccess`],
      account: account
    };
    this.authService.acquireTokenSilent(sr).subscribe(r => {
      // if we have an access token, we can initialize anything that depends on it here:
      if (r) {
        if (r.hasOwnProperty('accessToken')) {
          this.initializeUserView();
        }
      }
    });
  }

  /** This should not be called until after an access token has been acquired */
  initializeUserView(): void {
    this.getIntuneApps();
  }

  logout() {
    this.authService.logout();
  }

  getIntuneApps() {
    this.wapi.getintuneapps().subscribe(r => {
      console.log(r);
      if (r.status == "OK") {
        this.intuneData = r.data.value;
        let timestamp = parseInt(r.lastupdate);
        let dataDate = new Date(timestamp);
        console.log(`Data was last retrieved on ${dataDate.toString()}`)
        //setTimeout(this.refreshTableHandles.bind(this), 200);
      }
    });
  }

  refreshTableHandles(): void {
    this.uxtable.refreshHandles();
  }

  expand(target: any, item: any): void {
    //console.dir(target);
    if (item.expanded) {
      item.expanded = false;
      target.textContent = ">";
    }
    else {
      item.expanded = true;
      target.textContent = "˅";
    }
    this.refreshTableHandles();
  }

  filtertable(): void {
    let search = this.filter.nativeElement.value;
    let regex = new RegExp(`${search}.*`, 'i');
    this.intuneData.forEach(r=>{
      if(!regex.test(r.displayName)) {
        r.hidden = true;
      }
      else {
        r.hidden = false;
      }
    });
    setTimeout(()=>{this.refreshTableHandles();},1000);
  }

  trackIntuneItem(index: number, item: any) {
    return index;
  }

  ngOnDestroy(): void {
    this._destroying$.next(null);
    this._destroying$.complete();
  }
}
