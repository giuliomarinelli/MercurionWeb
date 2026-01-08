import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminExchangePageComponent } from './admin-exchange.page.component';

describe('AdminExchangePageComponent', () => {
  let component: AdminExchangePageComponent;
  let fixture: ComponentFixture<AdminExchangePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminExchangePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminExchangePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
