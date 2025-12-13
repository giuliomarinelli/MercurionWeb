import { ElementRef, Renderer2 } from '@angular/core';
import { CollapseMaxHeightDirective } from './collapse-max-height.directive';

describe('CollapseMaxHeightDirective', () => {
  it('should create an instance', () => {
    const ref = { nativeElement: document.createElement('div') } as ElementRef<HTMLElement>;
    const renderer = {
      setStyle: () => {},
      removeStyle: () => {}
    } as unknown as Renderer2;
    const directive = new CollapseMaxHeightDirective(ref, renderer);
    expect(directive).toBeTruthy();
  });
});
