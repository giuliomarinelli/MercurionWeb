import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtestComponent } from './btest.component';

describe('BtestComponent', () => {
  let component: BtestComponent;
  let fixture: ComponentFixture<BtestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BtestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BtestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
