import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { DesignService } from '../../../services/design.service';
import { NgClass } from '@angular/common';
import { SearchContextService } from '../../../services/context/search-context.service';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'm-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {
  protected readonly designService = inject(DesignService);
  protected readonly searchContextService = inject(SearchContextService);


  readonly onCloseOffCanvasMenu = output<boolean>();
  readonly header = input<boolean>(false);
  readonly ariaLabel = input('Navigazione principale');

  closeOffCanvasMenu(): void {
    this.onCloseOffCanvasMenu.emit(false)
  }

  openSearchOverlay(): void {
    this.searchContextService.open()
  }

}
