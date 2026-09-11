import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionSelectCardComponent } from './collection-select-card.component';

describe('CollectionSelectCardComponent', () => {
  let component: CollectionSelectCardComponent;
  let fixture: ComponentFixture<CollectionSelectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionSelectCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CollectionSelectCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isSelectAll', true)
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
