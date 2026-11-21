import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SrbChaptersComponent } from './srb-chapters.component';

describe('SrbChaptersComponent', () => {
  let component: SrbChaptersComponent;
  let fixture: ComponentFixture<SrbChaptersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SrbChaptersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SrbChaptersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
