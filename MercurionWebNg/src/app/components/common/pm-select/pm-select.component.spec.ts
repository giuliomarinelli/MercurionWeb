import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PmSelectComponent } from './pm-select.component';

describe('PmSelectComponent', () => {
  let component: PmSelectComponent;
  let fixture: ComponentFixture<PmSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmSelectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PmSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
