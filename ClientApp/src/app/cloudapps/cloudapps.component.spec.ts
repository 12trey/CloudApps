import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CloudappsComponent } from './cloudapps.component';

describe('CloudappsComponent', () => {
  let component: CloudappsComponent;
  let fixture: ComponentFixture<CloudappsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CloudappsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CloudappsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
