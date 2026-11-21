import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IcdChaptersComponent } from './icd-chapters.component';

describe('IcdChaptersComponent', () => {
  let component: IcdChaptersComponent;
  let fixture: ComponentFixture<IcdChaptersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IcdChaptersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IcdChaptersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
