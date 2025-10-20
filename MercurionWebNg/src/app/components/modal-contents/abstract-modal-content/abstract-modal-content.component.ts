// abstract-modal-content.ts
import { inject } from '@angular/core';
import { MODAL_DATA, MODAL_REF, ModalRef } from '../../../modal.tokens';



export abstract class AbstractModalContent<TData = unknown, TResult = unknown> {

  protected readonly data = inject<TData>(MODAL_DATA);
  protected readonly ref  = inject<ModalRef<TResult>>(MODAL_REF);

  protected close(result?: TResult) {
    this.ref.close(result);
  }

}
