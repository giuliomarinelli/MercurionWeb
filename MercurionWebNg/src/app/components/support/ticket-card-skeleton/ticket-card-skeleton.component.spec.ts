import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketCardSkeletonComponent } from './ticket-card-skeleton.component';

describe('TicketCardSkeletonComponent', () => {
  let component: TicketCardSkeletonComponent;
  let fixture: ComponentFixture<TicketCardSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketCardSkeletonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketCardSkeletonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
