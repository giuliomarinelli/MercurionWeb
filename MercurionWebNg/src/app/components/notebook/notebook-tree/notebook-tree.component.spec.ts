import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotebookTreeComponent } from './notebook-tree.component';
import { NotebookService } from '../../../services/graphql/notebook.service';

describe('NotebookTreeComponent', () => {
  let fixture: ComponentFixture<NotebookTreeComponent>;
  let component: NotebookTreeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookTreeComponent],
      providers: [
        provideRouter([]),
        {
          provide: NotebookService,
          useValue: {},
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(NotebookTreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the new scientific-domain empty state without legacy chapters', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('nav[aria-label="Indice dei quaderni di laboratorio"]')).not.toBeNull();
  });

  it('starts a section creation using an inline draft rather than a browser prompt', () => {
    component.startCreate('section', 'notebook-id');
    fixture.detectChanges();
    expect(component.draft()?.kind).toBe('section');
    expect(fixture.nativeElement.querySelector('input[name="title"]')).not.toBeNull();
  });
});
