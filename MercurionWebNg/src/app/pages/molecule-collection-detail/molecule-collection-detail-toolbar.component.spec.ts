import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MoleculeCollectionDetailToolbarComponent } from './molecule-collection-detail-toolbar.component';

describe('Collection detail toolbar', () => {
  function setup() {
    const fixture = TestBed.createComponent(MoleculeCollectionDetailToolbarComponent);
    fixture.componentRef.setInput('name', 'Aromatici'); fixture.detectChanges();
    return fixture;
  }
  it('preserves the draft after server failure and closes only after success', () => {
    const fixture = setup(); const component = fixture.componentInstance;
    component.edit(); component.draft.set('New name'); fixture.detectChanges();
    const rename = jasmine.createSpy(); component.rename.subscribe(rename);
    component.save(new Event('submit'));
    expect(rename).toHaveBeenCalledWith('New name'); expect(component.editing()).toBeTrue();
    fixture.componentRef.setInput('renameError', 'Conflict'); fixture.detectChanges();
    expect(component.draft()).toBe('New name'); expect(fixture.nativeElement.textContent).toContain('Conflict');
    fixture.componentRef.setInput('renameRevision', 1); fixture.detectChanges();
    expect(component.editing()).toBeFalse();
  });
  it('never submits an empty name or cancels an in-flight save', () => {
    const fixture = setup(); const component = fixture.componentInstance;
    const rename = jasmine.createSpy(); component.rename.subscribe(rename);
    component.edit(); component.draft.set('   '); component.save(new Event('submit'));
    expect(rename).not.toHaveBeenCalled();
    fixture.componentRef.setInput('renamePending', true); fixture.detectChanges();
    component.cancel(); expect(component.editing()).toBeTrue();
  });
  it('debounces typing and Enter cancels the scheduled duplicate request', fakeAsync(() => {
    const fixture = setup(); const component = fixture.componentInstance;
    const search = jasmine.createSpy(); component.searchChange.subscribe(search);
    component.changeSearch('ar'); tick(100); component.changeSearch('aro'); tick(100);
    expect(search).not.toHaveBeenCalled(); component.submitSearch('aro'); tick(300);
    expect(search).toHaveBeenCalledOnceWith('aro');
  }));
  it('cancels the debounce when destroyed', fakeAsync(() => {
    const fixture = setup(); const search = jasmine.createSpy(); fixture.componentInstance.searchChange.subscribe(search);
    fixture.componentInstance.changeSearch('ar'); fixture.destroy(); tick(300);
    expect(search).not.toHaveBeenCalled();
  }));
  for (const width of [318, 348, 726, 1000]) {
    it(`keeps a long collection name and every action inside ${width}px`, () => {
      const fixture = setup(); const host = fixture.nativeElement as HTMLElement;
      host.style.width = `${width}px`;
      fixture.componentRef.setInput('name', 'VeryLongCollectionNameWithoutSpaces'.repeat(8)); fixture.detectChanges();
      const bounds = host.getBoundingClientRect();
      for (const element of host.querySelectorAll('h2, button, input')) {
        const rect = element.getBoundingClientRect();
        expect(rect.right).toBeLessThanOrEqual(bounds.right + 1);
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1);
      }
      for (const button of host.querySelectorAll('button')) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    });
  }

});
