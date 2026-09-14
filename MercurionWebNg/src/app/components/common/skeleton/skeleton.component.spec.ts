import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  let fixture: ComponentFixture<SkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkeletonComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();
  });

  it('renders deterministic dimensions and no required motion', () => {
    fixture.componentRef.setInput('shape', 'circle');
    fixture.componentRef.setInput('width', '3rem');
    fixture.componentRef.setInput('height', '3rem');
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('.m-skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('3rem');
    expect(skeleton.style.height).toBe('3rem');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
  });
});
