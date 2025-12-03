import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketComposerComponent } from './ticket-composer.component';

describe('TicketComposerComponent', () => {
  let component: TicketComposerComponent;
  let fixture: ComponentFixture<TicketComposerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketComposerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketComposerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
