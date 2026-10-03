import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemSelectCardComponent } from './molecule-collection-item-select-card.component';
import { MoleculeCollectionItemCardComponent } from '../molecule-collection-item-card/molecule-collection-item-card.component';

describe('MoleculeCollectionItemSelectCardComponent', () => {
  let component: MoleculeCollectionItemSelectCardComponent;
  let fixture: ComponentFixture<MoleculeCollectionItemSelectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionItemSelectCardComponent]
    })
    .overrideComponent(MoleculeCollectionItemCardComponent, { set: { imports: [], template: '<article>Example molecule</article>' } })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeCollectionItemSelectCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isSelectAll', true);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses one native checkbox and its label for select-all activation', () => {
    const emitted = jasmine.createSpy('selectedAll');
    component.selectedAll.subscribe(emitted);
    const control = fixture.nativeElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(control).toBeTruthy();
    control.closest('label')!.click();
    expect(component.value()).toBeTrue();
    expect(emitted).toHaveBeenCalledOnceWith(true);
  });

  it('uses the whole card label and emits one change for each click', () => {
    fixture.componentRef.setInput('isSelectAll', false);
    fixture.componentRef.setInput('molecule', { id: 'molecule-1', name: 'Example molecule' });
    const emitted = jasmine.createSpy('valueChange');
    component.value.subscribe(emitted);
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.classList).toContain('m-selection-control--card');
    expect(label.querySelector('.m-selection-control__content')?.classList).toContain('sr-only');
    label.click();
    expect(emitted).toHaveBeenCalledOnceWith(true);
  });
});
