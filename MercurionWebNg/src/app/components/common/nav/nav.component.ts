import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DesignService } from '../../../services/design.service';
import { NgClass } from '@angular/common';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'm-nav',
  imports: [NgClass],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  @Output() onCloseOffCanvasMenu = new EventEmitter<boolean>()
  @Input() header: boolean = false

  constructor(
    protected readonly designService: DesignService,
    protected readonly searchContextService: SearchContextService
  ) { }

  closeOffCanvasMenu(): void {
    this.onCloseOffCanvasMenu.emit(false)
  }

  openSearchOverlay(): void {
    this.searchContextService.isOpenedSearchOverlay.set(true)
  }

}
