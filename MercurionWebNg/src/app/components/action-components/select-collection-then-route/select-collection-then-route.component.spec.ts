import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectCollectionThenRouteComponent } from './select-collection-then-route.component';

describe('SelectCollectionThenRouteComponent', () => {
  let component: SelectCollectionThenRouteComponent;
  let fixture: ComponentFixture<SelectCollectionThenRouteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectCollectionThenRouteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectCollectionThenRouteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
