import { inject, Injectable } from '@angular/core';
import { AlertData, AlertModalComponent } from '../components/modal-contents/alert-modal/alert-modal.component';
import { ModalContextService } from './context/modal-context.service';

@Injectable({
  providedIn: 'root'
})
export class ModalService {

  private readonly modalContext = inject(ModalContextService);

  async confirmDelete() {
    const { whenClosed } = this.modalContext.open<AlertModalComponent, AlertData, boolean>(
      AlertModalComponent,
      {
        status: 'error',
        title: 'Eliminare definitivamente?',
        message: 'Questa azione non può essere annullata.',
        okLabel: 'Elimina',
        cancelLabel: 'Annulla',
      },
      { closeOnOverlay: false, closeOnEsc: true }
    );
    const ok = await whenClosed;
    if (ok) { /* procedi */ }
  }


}
