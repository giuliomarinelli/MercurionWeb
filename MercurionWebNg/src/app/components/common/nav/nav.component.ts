import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DesignService } from '../../../services/design.service';

@Component({
  selector: 'app-nav',
  imports: [],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  @Output() onCloseOffCanvasMenu = new EventEmitter<boolean>()
  @Input() header: boolean = false

  constructor(protected readonly designService: DesignService) { }

  closeOffCanvasMenu(): void {
    this.onCloseOffCanvasMenu.emit(false)
  }

}
