import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
  Input,
  ElementRef
} from '@angular/core';
import { Title } from "@angular/platform-browser";
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
import { TgtUxlibComponent } from 'angular-uxlib';
//import { TgtUxlibComponent } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/projects/angular-uxlib/src/public-api';
//import { TgtUxlibComponent } from 'C:/Users/tgtesoro/source/repos/AngWorkspace/dist/angular-uxlib';
import { isNgTemplate, ThrowStmt } from '@angular/compiler';
//import { TgtUxlibComponent } from 'angular-uxlib';
import * as config from '../../../privatedata/config.json';

/** Valid options interface for sorting */
interface SortOptions {
  propname: 'createdDateTime' | 'lastModifiedDateTime' | 'displayName' | 'publisher',
  proptype: 'number' | 'string',
  direction?: 'ASC' | 'DESC'
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements
  OnInit,
  OnDestroy {
  title = 'Sentara Applications';
  isIframe = false;
  loginDisplay = false;
  isLoggedIn: boolean = false;
  username: string = "";
  fullname: string = "";
  isFilterEmpty: boolean = true;
  private readonly _destroying$ = new Subject<void>();

  public intuneData: any[] = [];
  public intuneViewData: any[] = [];

  @ViewChild('uxtable') uxtable: TgtUxlibComponent;
  @ViewChild('filter') filter: ElementRef;
  @ViewChild('loginlink') loginlink: ElementRef;
  @ViewChild('profilepic') profilepic: ElementRef;
  @ViewChild('profilepic2') profilepic2: ElementRef;


  public sortoptions: SortOptions = {
    propname: "createdDateTime",
    proptype: "number",
    direction: "ASC"
  };

  constructor
    (
      private titleService: Title,
      private wapi: WapiService,
      @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
      private authService: MsalService,
      private msalBroadcastService: MsalBroadcastService
    ) {
    this.titleService.setTitle(this.title);

    // Set default sort
    this.sortoptions.propname = "displayName";
    this.sortoptions.proptype = "string";
    this.sortoptions.direction = "ASC";
  }

  public tableloaded(isready: any): void {
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
      //console.log(firstaccount);
      //if(confirm(`There is an active session available for ${firstaccount.username}.\nYou may continue this session, or click login to start a new one.\nClick OK to continue this session or cancel to start a new one.\nAs a reminder, please logout before leaving this site.`)) {
      this.getAccessToken(firstaccount);
      //}
    }
    this.msalBroadcastService.msalSubject$
      .pipe(
        //filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS || msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS),
        takeUntil(this._destroying$)
      )
      .subscribe((result) => {
        //console.log("broadcast results:");
        //console.log(result);
        if (result.eventType == "msal:acquireTokenSuccess") {
          this.isLoggedIn = true;
          this.setLoginDisplay();
        }
      }, (err) => {
        //console.log("Got error broadcast");
        this.isLoggedIn = true;
        this.setLoginDisplay();
        //console.log(err);
      });

    // let bssub = this.msalBroadcastService.msalSubject$
    // .pipe(
    //   filter((evm: EventMessage) => {
    //     return (
    //       evm.eventType == EventType.LOGIN_SUCCESS ||
    //       evm.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
    //     );
    //   }),
    //   takeUntil(this._destroying$)
    // )
    // .subscribe(
    //   (message) => {
    //     //console.log("**Broadcast service event received**");
    //     //console.log(message);
    //     //this.checkAccount();
    //   },
    //   (err) => {
    //     console.log('**Broadcast service error received**');
    //     console.log(err);
    //   },
    //   function complete() {
    //     //console.log("**Broadcast service finished**");
    //   }
    // );
  }

  private setLoginDisplay() {
    this.loginDisplay = this.authService.instance.getAllAccounts().length > 0;
  }

  public login() {
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

  /** Only call this after we verify we have a valid authenticated account */
  private getAccessToken(account: AccountInfo): void {
    let sr: SilentRequest = {
      scopes: [`api://${config.credentials.clientID}/apiaccess`],
      account: account
    };
    this.authService.acquireTokenSilent(sr).subscribe(r => {
      // if we have an access token, we can initialize anything that depends on it here:
      if (r) {
        if (r.hasOwnProperty('accessToken')) {
          this.initializeUserView(account);
        }
      }
    }, (err) => {
      console.log("Error getting accessToken");
      this.logout();
    });
  }

  /** This should not be called until after an access token has been acquired */
  private initializeUserView(account: AccountInfo): void {
    this.wapi.getprofilepicmeta().subscribe((meta) => {
      this.wapi.getprofilepic().subscribe((arraybuffer) => {
        var base64String = btoa(
          Array.from(new Uint8Array(arraybuffer))
            .map((b) => String.fromCharCode(b))
            .join('')
        );
        this.profilepic.nativeElement.src =
          'data:' +
          meta['@odata.mediaContentType'] +
          ';base64, ' +
          base64String;

        this.profilepic2.nativeElement.src =
          'data:' +
          meta['@odata.mediaContentType'] +
          ';base64, ' +
          base64String;
      });
    });
    this.username = account.username;
    this.fullname = account.name;
    this.getIntuneApps();
  }

  public logout() {
    this.authService.logout();
  }

  private getIntuneApps() {
    this.wapi.getintuneapps().subscribe(r => {
      //console.log(r);
      if (r.status == "OK") {
        this.intuneData = r.data.value;
        this.intuneViewData = JSON.parse(JSON.stringify(this.intuneData));

        this.addDateString();
        this.sortBy(this.intuneViewData, this.sortoptions);

        let timestamp = parseInt(r.lastupdate);
        let dataDate = new Date(timestamp);
        console.log(`Data was last retrieved on ${dataDate.toString()}`)
        //console.log(this.sortoptions);
      }
    });
  }

  private addDateString(): void {
    this.intuneViewData.forEach(item => {
      //console.log((Date.parse(item.createdDateTime)));
      let dateString = new Date(Date.parse(item.createdDateTime));
      item.createdDateString = dateString.toLocaleString();

      let updateDateString = new Date(Date.parse(item.lastModifiedDateTime));
      item.lastModifiedDateString = updateDateString.toLocaleString();
    });
  }

  public setSortOptions(propname: any, proptype: any) {
    if (this.sortoptions.propname != propname) {
      this.sortoptions.direction = "ASC";
    }
    else {
      this.sortoptions.direction = this.sortoptions.direction == "ASC" ? "DESC" : "ASC";
    }
    this.sortoptions.propname = propname;
    this.sortoptions.proptype = proptype;
    this.sortBy(this.intuneViewData);
  }

  // private intuneViewDataComparer(a, b): number {
  //   console.log(parseInt(a.createdDateTime));
  //   let result = Date.parse(a.createdDateTime) - Date.parse(b.createdDateTime);
  //   return result;
  // }

  private sortBy(targetArray: any[], sortoptions: SortOptions = this.sortoptions): void {
    targetArray.sort((a, b) => {
      switch (sortoptions.proptype.toUpperCase()) {
        case "NUMBER":
          if (sortoptions.direction.toUpperCase() == 'ASC') {
            return parseInt(a[sortoptions.propname]) - parseInt(b[sortoptions.propname]);
          }
          else if (sortoptions.direction.toUpperCase() == 'DESC') {
            return parseInt(b[sortoptions.propname]) - parseInt(a[sortoptions.propname]);
          }
          else {
            return parseInt(a[sortoptions.propname]) - parseInt(b[sortoptions.propname]); // default to ASC if direction invalid
          }
          break;
        case "STRING":
          if (sortoptions.direction.toUpperCase() == 'ASC') {
            return a[sortoptions.propname].localeCompare(b[sortoptions.propname]);
          }
          else if (sortoptions.direction.toUpperCase() == 'DESC') {
            return b[sortoptions.propname].localeCompare(a[sortoptions.propname]);
          }
          else {
            return a[sortoptions.propname].localeCompare(b[sortoptions.propname]); // default to ASC if direction invalid
          }
          break;
        default:
          return null;
      }
    });
  }

  private refreshTableHandles(): void {
    this.uxtable.refreshHandles();
  }

  public expand(target: any, item: any): void {
    this.intuneViewData.forEach(r => {
      if (r != item) r.expanded = false;
    });
    if (item.expanded) {
      item.expanded = false;
    }
    else {
      item.expanded = true;
    }
    this.refreshTableHandles();
  }

  public filtertable(): void {
    let search = this.filter.nativeElement.value;

    if (search.trim() == '') this.isFilterEmpty = true;
    else this.isFilterEmpty = false;

    let regex = new RegExp(`${search}.*`, 'i');
    let tmparray = this.intuneData.filter(r => {
      if (!regex.test(r.displayName)) {
        return false;
      }
      else {
        return true;
      }
    });

    this.intuneViewData = JSON.parse(JSON.stringify(tmparray));
    this.addDateString();
    setTimeout(() => { this.refreshTableHandles(); }, 1000);
  }

  public trackIntuneItem(index: number, item: any) {
    return index;
  }

  ngOnDestroy(): void {
    this.logout();
    this._destroying$.next(null);
    this._destroying$.complete();
  }
}
