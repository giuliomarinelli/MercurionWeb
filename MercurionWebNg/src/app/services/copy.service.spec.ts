import { CopyService } from './copy.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';

describe('CopyService', () => {
  let service: CopyService;
  let clipboard: jasmine.SpyObj<Clipboard>;

  beforeEach(() => {
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    TestBed.configureTestingModule({
      providers: [CopyService, { provide: Clipboard, useValue: clipboard }],
    });
    service = TestBed.inject(CopyService);
  });

  it('copies scalar values and reports the normalized clipboard text', async () => {
    clipboard.copy.and.returnValue(true);
    const onSuccess = jasmine.createSpy('onSuccess');

    await expectAsync(service.copy(42, { onSuccess })).toBeResolvedTo(true);

    expect(clipboard.copy).toHaveBeenCalledWith('42');
    expect(onSuccess).toHaveBeenCalledWith('42');
  });

  it('rejects empty content when refuseEmpty is requested', async () => {
    const onError = jasmine.createSpy('onError');

    await expectAsync(service.copy('  ', { refuseEmpty: true, onError })).toBeResolvedTo(false);

    expect(clipboard.copy).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('reports clipboard failures without leaking the collaborator error', async () => {
    clipboard.copy.and.returnValue(false);
    const onError = jasmine.createSpy('onError');

    await expectAsync(service.copy('value', { onError })).toBeResolvedTo(false);

    expect(onError).toHaveBeenCalled();
  });
});
