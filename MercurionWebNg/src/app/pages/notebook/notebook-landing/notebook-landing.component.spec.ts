import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { NotebookLandingComponent } from './notebook-landing.component';
import { NotebookService } from '../../../services/graphql/notebook.service';
import { NotebookTree } from '../../../Models/graphql/notebook/notebook.models';

describe('NotebookLandingComponent', () => {
  let component: NotebookLandingComponent;
  let fixture: ComponentFixture<NotebookLandingComponent>;
  let notebooks$: Subject<NotebookTree[]>;

  beforeEach(async () => {
    notebooks$ = new Subject<NotebookTree[]>();
    await TestBed.configureTestingModule({
      imports: [NotebookLandingComponent],
      providers: [{
        provide: NotebookService,
        useValue: { getAllNotebooks: () => notebooks$.asObservable() }
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotebookLandingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('releases the notebook query stream when destroyed', () => {
    expect(notebooks$.observed).toBeTrue();

    fixture.destroy();
    expect(notebooks$.observed).toBeFalse();
  });
});
