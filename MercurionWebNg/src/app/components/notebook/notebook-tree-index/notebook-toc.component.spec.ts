import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotebookTocComponent } from './notebook-toc.component';

describe('NotebookTocComponent', () => {
  let component: NotebookTocComponent;
  let fixture: ComponentFixture<NotebookTocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookTocComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotebookTocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates an index capable of representing the scientific hierarchy', () => {
    expect(component).toBeTruthy();
    expect(component.isSelected('notebook', 'other')).toBe(false);
    expect(component.notebookUrl('abc')).toBe('/notebook/abc/read');
  });
});
