import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WapiService {

  constructor(private http:HttpClient) { }

  getintuneapps(): Observable<any> {
    return this.http.get('/api/intuneapps');
  }

  getprofilepicmeta(): Observable<any> {
    return this.http.get("https://graph.microsoft.com/beta/me/photo", { responseType: "json"});
  }

  getprofilepic(): Observable<any> {
    return this.http.get("https://graph.microsoft.com/beta/me/photo/$value", { responseType: "arraybuffer"});
  }
}
