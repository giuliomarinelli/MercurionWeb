import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculePropertiesComponent } from './molecule-properties.component';

describe('MoleculePropertiesComponent', () => {
  let component: MoleculePropertiesComponent;
  let fixture: ComponentFixture<MoleculePropertiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculePropertiesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculePropertiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps zero and negative scientific values distinct from unavailable fields', () => {
    fixture.componentRef.setInput('properties', { hbd: 0, alogp: -1.25, psa: null, rtb: '' });
    fixture.detectChanges();
    const values = Array.from(fixture.nativeElement.querySelectorAll('dd') as NodeListOf<HTMLElement>).map(el => el.textContent?.trim());
    expect(values).toEqual(['Non disponibile', '-1.25', '0', 'Non disponibile', 'Non disponibile', 'Non disponibile']);
    expect(fixture.nativeElement.querySelectorAll('dt').length).toBe(6);
  });

  it('replaces stale values when properties disappear', () => {
    fixture.componentRef.setInput('properties', { mwFreebase: 12 }); fixture.detectChanges();
    fixture.componentRef.setInput('properties', undefined); fixture.detectChanges();
    expect(component.propertiesList().every(row => row.missing)).toBeTrue();
  });

  it('should create' , () => {
    expect(component).toBeTruthy();
  });
});
