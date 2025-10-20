// modal.tokens.ts
import { InjectionToken } from '@angular/core';

export type ModalStatus = 'none' | 'info' | 'success' | 'warning' | 'error';

export interface ModalOpenOptions {
  closeOnEsc?: boolean;        // default: true
  closeOnOverlay?: boolean;    // default: true
}

export class ModalRef<TResult = unknown> {
  close!: (result?: TResult) => void; // valorizzato dal service
}

export const MODAL_REF  = new InjectionToken<ModalRef<any>>('MODAL_REF');
export const MODAL_DATA = new InjectionToken<any>('MODAL_DATA');
