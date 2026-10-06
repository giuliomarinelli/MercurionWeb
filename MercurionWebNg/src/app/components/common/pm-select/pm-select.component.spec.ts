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

  it('consumes Escape only while its menu is open so the containing dialog stays open', () => {
    component.opened = true;
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stop = spyOn(event, 'stopPropagation').and.callThrough();
    component.onKey(event);
    expect(component.opened).toBeFalse();
    expect(event.defaultPrevented).toBeTrue();
    expect(stop).toHaveBeenCalledTimes(1);

    component.onKey(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
