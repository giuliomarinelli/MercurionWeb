import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ProfileDTO } from '../../Models/account/account.models';
import { AccountService } from '../../services/account.service';
import { DashboardPageComponent } from './dashboard.page.component';

describe('ProfileComponent', () => {
  let component: DashboardPageComponent;
  let fixture: ComponentFixture<DashboardPageComponent>;
  let profileResult: Subject<ProfileDTO>;

  beforeEach(async () => {
    profileResult = new Subject<ProfileDTO>();
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [{
        provide: AccountService,
        useValue: { getProfileRegistry: () => profileResult }
      }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('stops loading and renders the error state when the profile request fails', () => {
    profileResult.error(new Error('profile unavailable'));
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(component.serverError()).toBeTrue();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('errore nel caricamento della dashboard');
  });
});
