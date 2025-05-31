import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KetcherFrameComponent } from './ketcher-frame.component';

describe('KetcherFrameComponent', () => {
  let component: KetcherFrameComponent;
  let fixture: ComponentFixture<KetcherFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KetcherFrameComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KetcherFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
