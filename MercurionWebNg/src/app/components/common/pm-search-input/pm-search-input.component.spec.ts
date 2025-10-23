import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PmSearchInputComponent } from './pm-search-input.component';

describe('PmSearchInputComponent', () => {
  let component: PmSearchInputComponent;
  let fixture: ComponentFixture<PmSearchInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PmSearchInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PmSearchInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
