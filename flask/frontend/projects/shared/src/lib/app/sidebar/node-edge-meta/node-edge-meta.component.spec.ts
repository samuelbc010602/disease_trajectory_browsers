import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeEdgeMetaComponent } from './node-edge-meta.component';

describe('NodeEdgeMetaComponent', () => {
  let component: NodeEdgeMetaComponent;
  let fixture: ComponentFixture<NodeEdgeMetaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NodeEdgeMetaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeEdgeMetaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
