import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

import { NotFound404LandingPageComponent } from './not-found-404-landing.page.component';
import { UserContextService } from '../../services/context/user-context.service';

class UserContextStub {
  isLoggedIn(): boolean {
    return false;
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

describe('NotFound404TemplateComponent', () => {
  let component: NotFound404LandingPageComponent;
  let fixture: ComponentFixture<NotFound404LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, NotFound404LandingPageComponent],
      providers: [
        { provide: UserContextService, useClass: UserContextStub },
        { provide: Location, useClass: LocationStub },
        { provide: Router, useClass: RouterStub }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotFound404LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
