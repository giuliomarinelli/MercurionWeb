import { Component, computed, signal } from '@angular/core';
import { LoadingContextService } from '../../services/context/loading-context.service';

@Component({
  selector: 'app-color-palette',
  standalone: true,
  templateUrl: './color-palette.component.html',
  styleUrls: ['./color-palette.component.css']
})
export class ColorPaletteComponent {

  constructor(private loadingContext: LoadingContextService) {}

  load(): void {
    this.loadingContext.start()
    setTimeout(() => this.loadingContext.stop(), 5000)
  }

}
