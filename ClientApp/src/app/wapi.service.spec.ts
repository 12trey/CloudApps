import { TestBed } from '@angular/core/testing';

import { WapiService } from './wapi.service';

describe('WapiService', () => {
  let service: WapiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WapiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
