import { provideRouter } from '@angular/router';
import { MoleculeCollection } from '../../../Models/graphql/molecule-collection/molecule-collection.types';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMoleculeJoinComponent } from './my-molecule-join.component';

describe('MyMoleculeJoinComponent', () => {
  let component: MyMoleculeJoinComponent;
  let fixture: ComponentFixture<MyMoleculeJoinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMoleculeJoinComponent], providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyMoleculeJoinComponent);
    fixture.componentRef.setInput('joins', null);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows an empty result immediately without a fake loading timer', () => {
    fixture.componentRef.setInput('joins', []); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('m-skeleton-collection-card')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('non appartiene ancora');
  });

  it('clears old collections when a new request is loading', () => {
    fixture.componentRef.setInput('joins', [{ id: 'join', collection: {
      id: 'collection', name: 'Ricerca', itemsCount: 1, createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), touchedAt: new Date().toISOString()
    } as MoleculeCollection }]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[role="listitem"]').length).toBe(1);
    fixture.componentRef.setInput('joins', null); fixture.detectChanges();
    expect(component.collections()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="list"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('m-skeleton-collection-card').length).toBe(2);
  });

  it('should create' , () => {
    expect(component).toBeTruthy();
  });
});
