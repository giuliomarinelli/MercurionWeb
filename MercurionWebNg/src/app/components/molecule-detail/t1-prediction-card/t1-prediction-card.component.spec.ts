import { ComponentFixture, TestBed } from '@angular/core/testing';
import { T1PredictionDTO } from '../../../Models/notebook/t1-prediction-model';
import { T1PredictionCardComponent, TOX21_ENDPOINTS } from './t1-prediction-card.component';

describe('Tox21 results', () => {
  let fixture: ComponentFixture<T1PredictionCardComponent>;
  const prediction = { probability: 0, threshold: .55, is_positive: false };
  const complete = Object.fromEntries(TOX21_ENDPOINTS.map(label => [label, prediction]));
  const text = () => fixture.nativeElement.textContent as string;
  const set = (name: string, value: unknown) => { fixture.componentRef.setInput(name, value); fixture.detectChanges(); };
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [T1PredictionCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(T1PredictionCardComponent); fixture.detectChanges();
  });
  it('renders zero as a valid probability and formats thresholds consistently', () => {
    set('inference', complete);
    expect(text()).toContain('4 endpoint disponibili');
    expect(text()).toContain('0.00%'); expect(text()).toContain('55.00%');
    expect(fixture.nativeElement.querySelectorAll('.m-tox-outcome').length).toBe(4);
  });
  it('uses the server classification even when displayed values round to the same percentage', () => {
    set('inference', { 'SR-p53': { probability: .3500001, threshold: .35, is_positive: true } });
    const row = fixture.nativeElement.querySelectorAll('.m-tox-row')[3];
    expect(row.querySelector('.m-tox-outcome').textContent).toBe('Positivo');
    expect(row.textContent.match(/35.00%/g)?.length).toBe(2);
  });
  it('does not classify missing or malformed endpoint data as negative', () => {
    set('inference', { 'SR-ATAD5': null, 'NR-AhR': { ...prediction, probability: NaN },
      'SR-MMP': { ...prediction, threshold: 2 }, 'SR-p53': { ...prediction, is_positive: null } } as unknown as T1PredictionDTO);
    expect(text()).toContain('Nessun risultato');
    expect(fixture.nativeElement.querySelectorAll('.m-tox-outcome').length).toBe(0);
  });
  it('reports partial coverage and clears results when the input becomes absent', () => {
    set('inference', { 'SR-p53': prediction }); expect(text()).toContain('1 di 4');
    set('inference', undefined); expect(text()).toContain('Nessun risultato');
    expect(fixture.nativeElement.querySelectorAll('.m-tox-outcome').length).toBe(0);
  });
  it('keeps four placeholder rows during loading and hides stale results', () => {
    set('inference', complete); set('loading', true);
    expect(fixture.nativeElement.querySelector('section').getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.m-tox-row').length).toBe(4);
    expect(fixture.nativeElement.querySelectorAll('.m-tox-outcome').length).toBe(0);
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
  it('exposes a retry action for failures without displaying stale predictions', () => {
    const retry = jasmine.createSpy(); fixture.componentInstance.retry.subscribe(retry);
    set('inference', complete); set('error', true);
    expect(text()).toContain('Predizione non disponibile');
    expect(fixture.nativeElement.querySelectorAll('.m-tox-outcome').length).toBe(0);
    fixture.nativeElement.querySelector('button').click(); expect(retry).toHaveBeenCalledTimes(1);
  });
  it('provides a readable interpretation rather than claiming molecule safety', () => {
    expect(text()).not.toContain('NON Tossico');
    expect(text()).toContain('non dimostra');
    expect(fixture.nativeElement.querySelector('a').rel).toBe('noopener noreferrer');
  });
  for (const width of [320, 375, 640, 1024]) {
    it(`keeps loading and loaded row geometry aligned at ${width}px`, async () => {
      set('loading', true);
      const frame = document.createElement('iframe');
      frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        const styles = doc.createElement('style');
        styles.textContent = Array.from(document.styleSheets).flatMap(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText)).join('\n');
        doc.head.appendChild(styles);
        doc.body.style.cssText = 'margin:0;padding:16px;box-sizing:border-box';
        doc.body.appendChild(fixture.nativeElement);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const rows = () => Array.from(doc.querySelectorAll('.m-tox-row')).map(row => row.getBoundingClientRect());
        const before = rows();
        set('inference', complete); set('loading', false);
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        rows().forEach((rect, index) => {
          expect(Math.abs(rect.height - before[index].height)).toBeLessThanOrEqual(1);
          expect(Math.abs(rect.top - before[index].top)).toBeLessThanOrEqual(1);
          expect(rect.right).toBeLessThanOrEqual(doc.documentElement.clientWidth);
        });
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(doc.documentElement.clientWidth);
      } finally { fixture.destroy(); frame.remove(); }
    });
  }

});
