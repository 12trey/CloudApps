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
}
