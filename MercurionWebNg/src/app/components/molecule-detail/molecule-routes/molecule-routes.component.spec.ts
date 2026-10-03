import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeRoutesComponent } from './molecule-routes.component';

describe('MoleculeRoutesComponent', () => {
  let component: MoleculeRoutesComponent;
  let fixture: ComponentFixture<MoleculeRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeRoutesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the empty state when all routes are false, including GraphQL metadata', () => {
    fixture.componentRef.setInput('adminRoutesInput', {
      __typename: 'AdministrationRoutes',
      oral: false,
      parenteral: false,
      topical: false
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p')?.textContent)
      .toContain('Nessuna via di somministrazione disponibile.');
    expect(fixture.nativeElement.querySelectorAll('span').length).toBe(0);
  });

  for (const [route, label] of [
    ['oral', 'Orale'],
    ['parenteral', 'Parenterale'],
    ['topical', 'Topica']
  ] as const) {
    it(`updates the empty state when the ${route} route changes`, () => {
      const routes = {
        __typename: 'AdministrationRoutes',
        oral: false,
        parenteral: false,
        topical: false
      };
      fixture.componentRef.setInput('adminRoutesInput', { ...routes, [route]: true });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('p')).toBeNull();
      expect(fixture.nativeElement.querySelector('span')?.textContent).toBe(label);

      fixture.componentRef.setInput('adminRoutesInput', routes);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('p')?.textContent)
        .toContain('Nessuna via di somministrazione disponibile.');
      expect(fixture.nativeElement.querySelectorAll('span').length).toBe(0);
    });
  }
});
