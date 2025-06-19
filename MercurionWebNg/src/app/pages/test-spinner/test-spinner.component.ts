import { Component } from '@angular/core';
import { LoadingContextService } from '../../services/context/loading-context.service';

@Component({
  selector: 'app-test-spinner',
  imports: [],
  templateUrl: './test-spinner.component.html',
  styleUrl: './test-spinner.component.css'
})
export class TestSpinnerComponent {

  constructor(private loadingContext: LoadingContextService) { }

  load(): void {
    queueMicrotask(() => {
      this.loadingContext.start()
      setTimeout(() =>
        this.loadingContext.stop(),
        5000)
    })
  }

}
