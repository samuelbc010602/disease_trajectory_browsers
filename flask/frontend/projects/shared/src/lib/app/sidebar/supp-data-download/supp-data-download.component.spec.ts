import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuppDataDownloadComponent } from './supp-data-download.component';

describe('SuppDataDownloadComponent', () => {
  let component: SuppDataDownloadComponent;
  let fixture: ComponentFixture<SuppDataDownloadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SuppDataDownloadComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuppDataDownloadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
