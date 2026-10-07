import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CollectionCardComponent } from '../../molecule-detail/collection-card/collection-card.component';
import { SkeletonCollectionCardComponent } from './skeleton-card-loader.component';

@Component({ imports: [CollectionCardComponent, SkeletonCollectionCardComponent], template: `
  <m-skeleton-collection-card [isReadonly]="readonly" />
  <m-collection-card [isReadonly]="readonly" [collection]="{ id: 'one', name: 'A very long collection name to preserve a stable row', itemsCount: 12, createdAt: '2026-01-01', updatedAt: '2026-01-01' }" />
` })
class GeometryHost { readonly = false; }

describe('Collection skeleton geometry', () => {
  for (const width of [360, 390, 768, 1366]) {
    for (const readonly of [false, true]) {
      it(`matches the card at ${width}px, readonly=${readonly}`, async () => {
        await TestBed.configureTestingModule({ imports: [GeometryHost], providers: [provideRouter([])] }).compileComponents();
        const fixture = TestBed.createComponent(GeometryHost);
        fixture.componentInstance.readonly = readonly; fixture.detectChanges();
        const frame = document.createElement('iframe');
        frame.style.cssText = `width:${width}px;height:700px;border:0`; document.body.appendChild(frame);
        try {
          const doc = frame.contentDocument!;
          const style = doc.createElement('style');
          style.textContent = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
          doc.head.appendChild(style); doc.body.style.cssText = 'margin:0;padding:16px'; doc.body.appendChild(fixture.nativeElement);
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const skeleton = doc.querySelector('m-skeleton-collection-card > div')!.getBoundingClientRect();
          const card = doc.querySelector('m-collection-card .grid')!.getBoundingClientRect();
          expect(Math.abs(skeleton.height - card.height)).withContext('height shift').toBeLessThan(1);
          expect(skeleton.width).toBeCloseTo(card.width, 0);
          const skeletonRows = doc.querySelector('m-skeleton-collection-card > div')!.children;
          const cardRows = doc.querySelector('m-collection-card .grid')!.children;
          for (let i = 0; i < 3; i++) {
            const loadingRow = skeletonRows[i].getBoundingClientRect();
            const finalRow = cardRows[i].getBoundingClientRect();
            expect(loadingRow.top - skeleton.top).withContext(`row ${i} position`).toBeCloseTo(finalRow.top - card.top, 0);
            expect(loadingRow.height).withContext(`row ${i} height`).toBeCloseTo(finalRow.height, 0);
          }
        } finally { fixture.destroy(); frame.remove(); }
      });
    }
  }
});
