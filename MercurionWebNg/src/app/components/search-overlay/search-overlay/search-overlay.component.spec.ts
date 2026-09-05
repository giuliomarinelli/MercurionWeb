import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchOverlayComponent } from './search-overlay.component';

describe('SearchOverlayComponent', () => {
  let component: SearchOverlayComponent;
  let fixture: ComponentFixture<SearchOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('disconnects the IntersectionObserver on destroy (no leaked observer)', () => {
    const observer = (component as any).observer as IntersectionObserver | undefined;
    expect(observer).toBeTruthy();

    const disconnectSpy = spyOn(observer as IntersectionObserver, 'disconnect').and.callThrough();

    fixture.destroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes any pending chembl/my-molecules search subscription on destroy', () => {
    const c = component as any;
    c.chemblSub = { unsubscribe: jasmine.createSpy('unsubscribeChembl') };
    c.mySub = { unsubscribe: jasmine.createSpy('unsubscribeMy') };

    fixture.destroy();

    expect(c.chemblSub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(c.mySub.unsubscribe).toHaveBeenCalledTimes(1);
  });
});