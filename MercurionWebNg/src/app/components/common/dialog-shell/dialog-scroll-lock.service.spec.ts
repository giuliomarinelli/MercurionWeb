import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { DialogScrollLockService } from './dialog-scroll-lock.service';

describe('DialogScrollLockService', () => {
  it('keeps nested overlays locked and restores scroll and existing styles on the last close', () => {
    const doc = document.implementation.createHTMLDocument();
    const scrollTo = jasmine.createSpy('scrollTo');
    Object.defineProperty(doc, 'defaultView', { value: { scrollX: 12, scrollY: 240, scrollTo } });
    doc.body.style.setProperty('position', 'relative', 'important');
    doc.body.style.setProperty('width', '90%');
    TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: doc }] });
    const lock = TestBed.inject(DialogScrollLockService);
    lock.lock();
    lock.lock();
    expect(doc.body.style.position).toBe('fixed');
    expect(doc.body.style.top).toBe('-240px');
    expect(doc.documentElement.classList.contains('m-dialog-open')).toBeTrue();
    doc.body.style.color = 'red';
    lock.unlock();
    expect(doc.body.style.position).toBe('fixed');
    expect(scrollTo).not.toHaveBeenCalled();
    lock.unlock();
    expect(doc.body.style.position).toBe('relative');
    expect(doc.body.style.getPropertyPriority('position')).toBe('important');
    expect(doc.body.style.width).toBe('90%');
    expect(doc.body.style.top).toBe('');
    expect(doc.body.style.color).toBe('red');
    expect(doc.documentElement.classList.contains('m-dialog-open')).toBeFalse();
    expect(scrollTo).toHaveBeenCalledOnceWith({ left: 12, top: 240, behavior: 'instant' });
    lock.unlock();
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });
});
