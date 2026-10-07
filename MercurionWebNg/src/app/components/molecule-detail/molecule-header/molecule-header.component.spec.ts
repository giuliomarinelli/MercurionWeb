import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeHeaderComponent } from './molecule-header.component';

describe('MoleculeHeaderComponent', () => {
  let component: MoleculeHeaderComponent;
  let fixture: ComponentFixture<MoleculeHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeHeaderComponent);
    fixture.componentRef.setInput('smiles', 'C');
    fixture.componentRef.setInput('molId', 'molecule-1');
    fixture.componentRef.setInput('isLoggedIn', false);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('keeps duplicate navigation native and confirms deletion before emitting', () => {
    fixture.componentRef.setInput('isLoggedIn', true); fixture.detectChanges();
    const emitted = jasmine.createSpy(); component.onDelete.subscribe(emitted);
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('mode=duplicate');
    component.doDelete(); fixture.detectChanges(); expect(emitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('da tutte le collezioni');
    component.cancelDelete(); expect(component.confirmingDelete()).toBeFalse();
    component.doDelete(); component.confirmDelete(); expect(emitted).toHaveBeenCalledOnceWith('molecule-1');
  });
  it('keeps a failed deletion retryable and prevents dismissal or resubmission while pending', () => {
    component.doDelete(); fixture.componentRef.setInput('deletePending', true); fixture.detectChanges();
    const emitted = jasmine.createSpy(); component.onDelete.subscribe(emitted);
    component.confirmDelete(); component.cancelDelete();
    expect(emitted).not.toHaveBeenCalled(); expect(component.confirmingDelete()).toBeTrue();
    fixture.componentRef.setInput('deletePending', false); fixture.componentRef.setInput('deleteError', 'Riprova'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Riprova');
    component.confirmDelete(); expect(emitted).toHaveBeenCalledTimes(1);
  });
  it('does not offer deletion for a public molecule or actions to anonymous users', () => {
    fixture.componentRef.setInput('isLoggedIn', true); fixture.componentRef.setInput('isSystemMolecule', true); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[title="Elimina da tutte le collezioni"]')).toBeNull();
    fixture.componentRef.setInput('isLoggedIn', false); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.m-molecule-actions')).toBeNull();
  });

});
