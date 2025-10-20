import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbstractModalContentComponent } from './abstract-modal-content.component';

describe('AbstractModalContentComponent', () => {
  let component: AbstractModalContentComponent;
  let fixture: ComponentFixture<AbstractModalContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbstractModalContentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbstractModalContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
