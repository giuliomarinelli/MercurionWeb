import { Subject, of, throwError } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDetailsComponent } from './custom-details.component';

describe('MyMoleculeCustomDetailsComponent', () => {
  let component: CustomDetailsComponent;
  let fixture: ComponentFixture<CustomDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDetailsComponent);
    fixture.componentRef.setInput('type', 'name');
    fixture.componentRef.setInput('value', 'Test molecule');
    fixture.componentRef.setInput('itemId', 'molecule-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps a failed draft editable and retries without duplicate requests', () => {
    const response = new Subject<boolean>();
    const save = jasmine.createSpy().and.returnValue(response);
    fixture.componentRef.setInput('saveRequest', save); fixture.detectChanges();
    component.doEdit(); fixture.detectChanges();
    component.valueRef().nativeElement.innerText = 'Nuovo nome';
    component.doSave(); component.doSave(); fixture.detectChanges();
    expect(save).toHaveBeenCalledTimes(1);
    expect(component.mode()).toBe('edit'); expect(component.pending()).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('button:disabled').length).toBe(2);
    response.next(false); response.complete(); fixture.detectChanges();
    expect(component.mode()).toBe('edit'); expect(component.pending()).toBeFalse();
    expect(component.valueRef().nativeElement.innerText).toBe('Nuovo nome');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    save.and.returnValue(of(true)); component.doSave(); fixture.detectChanges();
    expect(component.mode()).toBe('view'); expect(component._value()).toBe('Nuovo nome');
    expect(component.saveError()).toBe('');
  });

  it('preserves a draft on transport errors and cancel restores the saved value', () => {
    fixture.componentRef.setInput('saveRequest', () => throwError(() => new Error('offline')));
    fixture.detectChanges(); component.doEdit(); fixture.detectChanges();
    component.valueRef().nativeElement.innerText = 'Bozza'; component.doSave(); fixture.detectChanges();
    expect(component.mode()).toBe('edit'); expect(component.saveError()).toBeTruthy();
    component.doCancel(); fixture.detectChanges(); expect(component._value()).toBe('Test molecule');
  });

  it('rejects an empty molecule name without submitting', () => {
    const save = jasmine.createSpy(); fixture.componentRef.setInput('saveRequest', save);
    fixture.detectChanges(); component.doEdit(); fixture.detectChanges();
    component.valueRef().nativeElement.innerText = '  '; component.doSave();
    expect(save).not.toHaveBeenCalled(); expect(component.mode()).toBe('edit');
    expect(component.saveError()).toContain('Inserisci un nome');
  });

  it('does not overwrite an in-progress draft during a server refresh', () => {
    component.doEdit(); fixture.detectChanges(); component.valueRef().nativeElement.innerText = 'Bozza locale';
    fixture.componentRef.setInput('value', 'Aggiornamento remoto'); fixture.detectChanges();
    expect(component.valueRef().nativeElement.innerText).toBe('Bozza locale');
  });

  it('returns keyboard focus to the edit trigger after Escape', async () => {
    component.doEdit(); fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    component.onKeydown(new KeyboardEvent('keydown', { key: 'Escape' })); fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('button'));
    expect(component.mode()).toBe('view');
  });

  it('cancels pending editing when a different molecule is displayed', () => {
    const response = new Subject<boolean>();
    fixture.componentRef.setInput('saveRequest', () => response); fixture.detectChanges();
    component.doEdit(); fixture.detectChanges(); component.valueRef().nativeElement.innerText = 'Bozza precedente';
    component.doSave(); expect(response.observed).toBeTrue();
    fixture.componentRef.setInput('itemId', 'molecule-2'); fixture.componentRef.setInput('value', 'Seconda molecola');
    fixture.detectChanges();
    expect(response.observed).toBeFalse(); expect(component.pending()).toBeFalse();
    expect(component.mode()).toBe('view'); expect(component._value()).toBe('Seconda molecola');
    response.next(true); expect(component._value()).toBe('Seconda molecola');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the Personal badge when cardName receives no explicit badge input', () => {
    fixture.componentRef.setInput('type', 'cardName');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('m-molecule-badge')?.textContent)
      .toContain('Personal');
  });
});
