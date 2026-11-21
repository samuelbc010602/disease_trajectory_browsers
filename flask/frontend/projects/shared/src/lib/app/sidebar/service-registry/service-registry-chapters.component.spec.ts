import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceRegistryChaptersComponent } from './service-registry-chapters.component';

describe('ServiceRegistryChaptersComponent', () => {
  let component: ServiceRegistryChaptersComponent;
  let fixture: ComponentFixture<ServiceRegistryChaptersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ServiceRegistryChaptersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ServiceRegistryChaptersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
