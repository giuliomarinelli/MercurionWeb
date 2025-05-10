import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoleculeSynonymsComponent } from './molecule-synonyms.component';

describe('MoleculeSynonymsComponent', () => {
  let component: MoleculeSynonymsComponent;
  let fixture: ComponentFixture<MoleculeSynonymsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoleculeSynonymsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoleculeSynonymsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
