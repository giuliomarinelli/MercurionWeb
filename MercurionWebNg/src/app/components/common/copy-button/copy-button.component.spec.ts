import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CopyUiService } from '../../../services/copy-ui.service';

import { CopyButtonComponent } from './copy-button.component';

describe('CopyButtonComponent', () => {
  let fixture: ComponentFixture<CopyButtonComponent>;
  let copyUiService: jasmine.SpyObj<CopyUiService>;

  beforeEach(async () => {
    copyUiService = jasmine.createSpyObj<CopyUiService>('CopyUiService', ['copy']);
    copyUiService.copy.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [CopyButtonComponent],
      providers: [{ provide: CopyUiService, useValue: copyUiService }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CopyButtonComponent);
    fixture.componentRef.setInput('src', 'codice');
    fixture.detectChanges();
  });

  it('uses the native icon button for hover and focus styling', () => {
    const wrapper = fixture.nativeElement.querySelector('m-icon-button') as HTMLElement;
    const button = wrapper.querySelector('button') as HTMLButtonElement;

    expect(wrapper.classList.length).toBe(0);
    expect(button.classList).toContain('hover:bg-slate-100');
    expect(button.classList).toContain('focus-visible:ring-2');
  });

  it('forwards accessibility inputs to the native button and respects disabled', () => {
    fixture.componentRef.setInput('ariaLabel', 'Copia i codici di backup');
    fixture.componentRef.setInput('ariaLabelledby', 'backup-heading');
    fixture.componentRef.setInput('ariaDescribedby', 'backup-help');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Copia i codici di backup');
    expect(button.getAttribute('aria-labelledby')).toBe('backup-heading');
    expect(button.getAttribute('aria-describedby')).toBe('backup-help');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-disabled')).toBe('true');

    button.click();
    expect(copyUiService.copy).not.toHaveBeenCalled();
  });

  it('copies the current source and announces success', async () => {
    fixture.componentRef.setInput('src', 'codice aggiornato');
    fixture.detectChanges();

    await fixture.componentInstance.copy();
    fixture.detectChanges();

    expect(copyUiService.copy).toHaveBeenCalledOnceWith(
      'codice aggiornato',
      jasmine.objectContaining({ showToast: true }),
    );
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Copiato negli appunti');
  });
});
