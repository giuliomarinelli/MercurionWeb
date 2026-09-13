import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TabsComponent } from './tabs.component';

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders WAI-ARIA relationships and roving tabindex', () => {
    fixture.componentRef.setInput('tabs', ['One', 'Two', 'Three']);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(buttons[0].nativeElement.getAttribute('aria-controls')).toBe('m-tabs-tab-0-tabpanel');
    expect(buttons[0].nativeElement.getAttribute('aria-selected')).toBe('true');
    expect(buttons[1].nativeElement.tabIndex).toBe(-1);
  });

  it('moves selection with Arrow, Home and End keys', () => {
    fixture.componentRef.setInput('tabs', ['One', 'Two', 'Three']);
    fixture.detectChanges();
    const changed = spyOn(component.tabChange, 'emit');
    const tablist = fixture.debugElement.query(By.css('[role="tablist"]')).nativeElement;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(changed).toHaveBeenCalledWith(1);
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(changed).toHaveBeenCalledWith(2);
  });
});
