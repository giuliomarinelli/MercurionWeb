import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-nav',
  imports: [],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  @Output() onCloseOffCanvasMenu = new EventEmitter<boolean>()

  closeOffCanvasMenu(): void {
    this.onCloseOffCanvasMenu.emit(false)
  }

}
