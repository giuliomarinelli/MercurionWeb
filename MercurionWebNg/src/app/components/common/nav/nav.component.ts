import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DesignService } from '../../../services/design.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-nav',
  imports: [NgClass],
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

  openSearchOverlay(): void {}

}
