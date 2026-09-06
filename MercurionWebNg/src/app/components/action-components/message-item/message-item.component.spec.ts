import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageItemComponent } from './message-item.component';

describe('MessageItemComponent', () => {
  let component: MessageItemComponent;
  let fixture: ComponentFixture<MessageItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MessageItemComponent);
    fixture.componentRef.setInput('message', null as never);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
