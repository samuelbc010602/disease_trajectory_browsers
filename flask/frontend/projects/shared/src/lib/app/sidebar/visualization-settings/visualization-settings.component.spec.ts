import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualizationSettingsComponent } from './visualization-settings.component';

describe('VisualizationSettingsComponent', () => {
  let component: VisualizationSettingsComponent;
  let fixture: ComponentFixture<VisualizationSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VisualizationSettingsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(VisualizationSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
