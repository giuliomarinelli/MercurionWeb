import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeCollectionItemSelectCardComponent } from './molecule-collection-item-select-card.component';

describe('MoleculeCollectionItemSelectCardComponent', () => {
  let component: MoleculeCollectionItemSelectCardComponent;
  let fixture: ComponentFixture<MoleculeCollectionItemSelectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeCollectionItemSelectCardComponent]
    })
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

  it('uses a native button for select-all keyboard activation', () => {
    const button = fixture.nativeElement.querySelector('button');

    expect(button).toBeTruthy();
    expect(button.getAttribute('type')).toBe('button');

    button.click();

    expect(component.control.value).toBeTrue();
  });
});
