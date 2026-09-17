import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AxeResults } from 'axe-core';

import { ActionCardComponent } from '../components/common/action-card/action-card.component';
import { ButtonComponent } from '../components/common/button/button.component';
import { DialogShellComponent } from '../components/common/dialog-shell/dialog-shell.component';
import { DisclosureComponent } from '../components/common/disclosure/disclosure.component';
import { IconButtonComponent } from '../components/common/icon-button/icon-button.component';
import { PaginationComponent } from '../components/common/pagination/pagination.component';
import { ProgressIndicatorComponent } from '../components/common/progress-indicator/progress-indicator.component';
import { SearchFieldComponent } from '../components/common/search-field/search-field.component';
import { SelectionControlComponent } from '../components/common/selection-control/selection-control.component';
import { SelectCoreComponent } from '../components/common/select-core/select-core.component';
import { TabsComponent } from '../components/common/tabs/tabs.component';
import { TextFieldComponent } from '../components/common/text-field/text-field.component';
import { TextareaComponent } from '../components/common/textarea/textarea.component';
import { ToastComponent } from '../components/common/toast/toast.component';
import { ToastService } from '../services/toast.service';
import {
  blockingViolations,
  formatAxeViolations,
  runAxe,
} from './accessibility-test.helpers';

interface SelectItem {
  id: string;
  label: string;
}

@Component({
  standalone: true,
  imports: [
    ActionCardComponent,
    ButtonComponent,
    DialogShellComponent,
    DisclosureComponent,
    FormsModule,
    IconButtonComponent,
    PaginationComponent,
    ProgressIndicatorComponent,
    SearchFieldComponent,
    SelectionControlComponent,
    SelectCoreComponent,
    TabsComponent,
    TextFieldComponent,
    TextareaComponent,
    ToastComponent,
  ],
  template: `
    <main
      aria-label="Canonical UI accessibility fixture"
      style="--color-control-primary: #4338ca; --color-on-surface-main: #ffffff; --color-control-primary-hover: #3730a3"
    >
      <h1>Canonical controls</h1>
      <form (submit)="$event.preventDefault()">
        <m-button ariaLabel="Save changes" (pressed)="submitted = true">Save</m-button>
        <m-icon-button ariaLabel="Close fixture" icon="close" />
        <m-text-field
          [(ngModel)]="text"
          name="name"
          label="Name"
          hint="Use your preferred name"
          [error]="fieldError"
          required />
        <m-textarea
          [(ngModel)]="description"
          name="description"
          label="Description"
          [maxLength]="100"
          showCount />
        <m-search-field label="Search molecules" />
        <m-selection-control
          label="Remember this device"
          description="Keep this browser signed in"
          mode="switch" />
        <m-select-core
          [items]="items"
          [displayFn]="displayItem"
          [valueFn]="valueItem"
          label="Collection"
          hint="Choose a collection"
          [selected]="items[0]" />
        <m-tabs
          [tabs]="['Overview', 'History']"
          [activeIndex]="activeTab"
          ariaLabel="Molecule sections"
          (tabChange)="activeTab = $event" />
        <div id="m-tabs-tab-0-tabpanel" role="tabpanel" aria-labelledby="m-tabs-tab-0-tab">
          Overview content
        </div>
        <div id="m-tabs-tab-1-tabpanel" role="tabpanel" aria-labelledby="m-tabs-tab-1-tab">
          History content
        </div>
        <m-disclosure
          label="Advanced options"
          id="advanced-options"
          [expanded]="disclosureExpanded"
          (toggled)="disclosureExpanded = $event">
          <p>Additional settings</p>
        </m-disclosure>
        <m-button type="submit">Submit</m-button>
      </form>
      <m-action-card labelledBy="action-title" closeLabel="Close action">
        <h2 id="action-title" action-card-title>Action</h2>
        <p action-card-body>Review the action before continuing.</p>
      </m-action-card>
      <m-pagination [state]="paginationState" />
      <m-progress-indicator />
      <m-toast />
      @if (dialogOpen) {
        <m-dialog-shell
          [mounted]="true"
          [open]="true"
          label="Confirm action"
          (dismissed)="dialogOpen = false">
          <h2>Confirm action</h2>
          <button type="button" (click)="dialogOpen = false">Confirm</button>
        </m-dialog-shell>
      }
    </main>
  `,
})
class CanonicalUiFixtureComponent {
  text = '';
  description = '';
  submitted = false;
  fieldError = '';
  dialogOpen = false;
  activeTab = 0;
  disclosureExpanded = false;
  items: SelectItem[] = [
    { id: 'one', label: 'First collection' },
    { id: 'two', label: 'Second collection' },
  ];
  paginationState = {
    mode: 'page' as const,
    currentPage: 1,
    totalPages: 2,
    pending: false,
  };
  displayItem = (item: SelectItem): string => item.label;
  valueItem = (item: SelectItem): string => item.id;
}

describe('canonical UI accessibility coverage', () => {
  let fixture: ComponentFixture<CanonicalUiFixtureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanonicalUiFixtureComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CanonicalUiFixtureComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  async function expectNoBlockingViolations(): Promise<AxeResults> {
    const results = await runAxe(fixture.nativeElement);
    const violations = blockingViolations(results);
    expect(formatAxeViolations(violations)).toBe('');
    return results;
  }

  function nativeElement(selector: string): HTMLElement {
    return fixture.nativeElement.querySelector(selector) as HTMLElement;
  }

  it('runs axe against the stabilized canonical primitive composition', async () => {
    await expectNoBlockingViolations();
  });

  it('keeps every interactive primitive keyboard reachable in deterministic order', () => {
    const controls = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll(
        'button, input, textarea, [role="combobox"]',
      ),
    ) as HTMLElement[];

    expect(controls.map(control => (
      control.getAttribute('aria-label')
      ?? control.textContent?.replace('⌄', '').trim()
      ?? ''
    ))).toEqual([
      'Save changes',
      'Close fixture',
      '',
      '',
      'Search molecules',
      '',
      '',
      'Overview',
      'History',
      'Advanced options',
      'Submit',
      'Close action',
      'Previous page',
      'Page 1',
      'Page 2',
      'Next page',
    ]);
    const rovingTabs = controls.filter(control => control.getAttribute('role') === 'tab');
    const otherControls = controls.filter(control => control.getAttribute('role') !== 'tab');
    expect(rovingTabs.map(tab => tab.tabIndex)).toEqual([0, -1]);
    expect(otherControls.every(control => control.tabIndex >= 0)).toBeTrue();
  });

  it('asserts dialog Escape dismissal and focus restoration', async () => {
    const opener = nativeElement('form > m-button button') as HTMLButtonElement;
    opener.focus();
    fixture.componentInstance.dialogOpen = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = nativeElement('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(dialog.querySelector('button'));

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.dialogOpen).toBeFalse();
    expect(document.activeElement).toBe(opener);
  });

  it('tests tabs, disclosure and combobox keyboard activation', async () => {
    const tablist = nativeElement('[role="tablist"]');
    const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    tabs[0].focus();
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(document.activeElement?.id).toBe('m-tabs-tab-1-tab');

    const disclosure = nativeElement('#advanced-options-trigger') as HTMLButtonElement;
    disclosure.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(nativeElement('[role="region"]').getAttribute('aria-labelledby')).toBe(disclosure.id);

    const combobox = nativeElement('[role="combobox"]') as HTMLInputElement;
    combobox.focus();
    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(combobox.getAttribute('aria-expanded')).toBe('true');
    expect(combobox.getAttribute('aria-activedescendant')).toContain('-option-0');

    combobox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(combobox.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(combobox);
  });

  it('exposes live validation, progress, pagination and toast status semantics', () => {
    fixture.componentInstance.fieldError = 'Name is required';
    fixture.detectChanges();

    const input = nativeElement('m-text-field input');
    const error = nativeElement('m-text-field [role="alert"]');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(error.getAttribute('aria-live')).toBe('polite');

    expect(nativeElement('m-progress-indicator [role="status"]').getAttribute('aria-label'))
      .toBe('Loading…');
    expect(nativeElement('m-pagination nav').getAttribute('aria-label')).toBe('Pagination');

    const toastService = TestBed.inject(ToastService);
    toastService.trigger('Saved successfully', 'success', 0);
    fixture.detectChanges();
    expect(nativeElement('m-toast [aria-live="polite"]').getAttribute('aria-relevant')).toBe('additions');
    expect(nativeElement('m-toast .toast__close').getAttribute('aria-label')).toBe('Chiudi notifica');
  });

  it('detects a known bad accessible-name fixture instead of suppressing it', async () => {
    const badFixture = document.createElement('div');
    badFixture.innerHTML = '<button></button>';
    document.body.appendChild(badFixture);

    try {
      const results = await runAxe(badFixture);
      const violations = blockingViolations(results);
      expect(violations.some(({ id }) => id === 'button-name')).toBeTrue();
    } finally {
      badFixture.remove();
    }
  });
});
