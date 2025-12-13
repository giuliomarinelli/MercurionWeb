import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { Forbidden403LandingPageComponent } from './forbidden-403-landing.page.component';
import { UserContextService } from '../../services/context/user-context.service';
import { AppContextService } from '../../services/context/app-context.service';

class UserContextStub {
  isLoggedIn(): boolean {
    return false;
  }
}

class AppContextStub {
  notifyAdded(): void {
    // no-op for test
  }
}

class LocationStub {
  back(): void {
    // no-op for test
  }
}

class RouterStub {
  navigateByUrl(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

describe('Forbidden403LandingPageComponent', () => {
  let component: Forbidden403LandingPageComponent;
  let fixture: ComponentFixture<Forbidden403LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, Forbidden403LandingPageComponent],
      providers: [
        { provide: UserContextService, useClass: UserContextStub },
        { provide: AppContextService, useClass: AppContextStub },
        { provide: Location, useClass: LocationStub },
        { provide: Router, useClass: RouterStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Forbidden403LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
