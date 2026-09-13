import { AppTitleService } from './app-title.service';
import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';

describe('AppTitleService', () => {
  let service: AppTitleService;
  let title: jasmine.SpyObj<Title>;

  beforeEach(() => {
    title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    TestBed.configureTestingModule({
      providers: [AppTitleService, { provide: Title, useValue: title }],
    });
    service = TestBed.inject(AppTitleService);
  });

  it('sets the brand title when no page title is supplied', () => {
    service.set();

    expect(title.setTitle).toHaveBeenCalledWith('Mercurion');
  });

  it('composes a page title with the brand and supports sections', () => {
    service.set('Dashboard');
    service.setSection('Account', 'Security');

    expect(title.setTitle).toHaveBeenCalledWith('Mercurion — Dashboard');
    expect(title.setTitle).toHaveBeenCalledWith('Mercurion — Account · Security');
  });
});
