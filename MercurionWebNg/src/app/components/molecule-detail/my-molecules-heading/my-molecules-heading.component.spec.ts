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

  it('renders the shared large add action with a 20px square plus', () => {
    const toolbar = TestBed.createComponent(MoleculeCollectionDetailToolbarComponent);
    toolbar.detectChanges();
    const buttons = toolbar.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find(control => control.textContent?.trim() === 'Aggiungi molecole')!;
    expect(button).toBeDefined();
    expect(getComputedStyle(button).fontSize).toBe('16px');
    const svg = button.querySelector('svg')!;
    expect(getComputedStyle(svg).width).toBe('20px');
    expect(getComputedStyle(svg).height).toBe('20px');
    const add = jasmine.createSpy('add');
    toolbar.componentInstance.add.subscribe(add);
    button.click();
    expect(add).toHaveBeenCalledTimes(1);
    toolbar.destroy();
  });
});
