import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculesHeadingComponent } from './my-molecules-heading.component';
import { MoleculeCollectionDetailToolbarComponent } from '../../../pages/molecule-collection-detail/molecule-collection-detail-toolbar.component';

describe('MyMoleculesHeadingComponent', () => {
  let component: MyMoleculesHeadingComponent;
  let fixture: ComponentFixture<MyMoleculesHeadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculesHeadingComponent, MoleculeCollectionDetailToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculesHeadingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the heading left-aligned', () => {
    expect(getComputedStyle(fixture.nativeElement.querySelector('h1')).textAlign).toBe('left');
  });

  it('renders the add button at text-xs with a 16px square plus', () => {
    const toolbar = TestBed.createComponent(MoleculeCollectionDetailToolbarComponent);
    toolbar.detectChanges();
    const button = toolbar.nativeElement.querySelector('button[aria-label="Aggiungi nuove molecole alla collezione"]') as HTMLButtonElement;
    expect(getComputedStyle(button).fontSize).toBe('12px');
    expect(getComputedStyle(button.querySelector('span')!).fontSize).toBe('12px');
    const svg = button.querySelector('svg')!;
    expect(getComputedStyle(svg).width).toBe('16px');
    expect(getComputedStyle(svg).height).toBe('16px');
    toolbar.destroy();
  });
});
