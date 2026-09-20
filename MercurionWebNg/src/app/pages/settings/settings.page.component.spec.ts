import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { SettingsPageComponent } from './settings.page.component'
import { SettingsAccountFacade } from './settings-account.facade'

describe('SettingsPageComponent', () => {
  let component: SettingsPageComponent;
  let fixture: ComponentFixture<SettingsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: SettingsAccountFacade,
          useValue: {
            loading: () => false,
            profile: () => null,
            version: () => null,
            authProvider: () => null,
            isSso: () => false,
            load: () => undefined,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SettingsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps panel loading deferred until a section is expanded', () => {
    expect(component.expandedIndex()).toBeNull()
    expect(fixture.nativeElement.querySelector('m-settings-security-panel')).toBeNull()
  })
});
