import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomDetailsComponent } from './custom-details.component';

describe('MyMoleculeCustomDetailsComponent', () => {
  let component: CustomDetailsComponent;
  let fixture: ComponentFixture<CustomDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomDetailsComponent);
    fixture.componentRef.setInput('type', 'name');
    fixture.componentRef.setInput('value', 'Test molecule');
    fixture.componentRef.setInput('itemId', 'molecule-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps the Personal badge when cardName receives no explicit badge input', () => {
    fixture.componentRef.setInput('type', 'cardName');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('m-molecule-badge')?.textContent)
      .toContain('Personal');
  });
});
