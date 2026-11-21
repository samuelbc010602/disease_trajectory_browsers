import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FindNodeComponent } from './find-node.component';

describe('FindNodeComponent', () => {
  let component: FindNodeComponent;
  let fixture: ComponentFixture<FindNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FindNodeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FindNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
