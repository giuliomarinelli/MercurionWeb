import { Component, inject } from '@angular/core';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { UserContextService } from '../../services/context/user-context.service';

@Component({
  selector: 'm-go-page',
  imports: [ClassicSpinnerComponent],
  template: `

    <section class="main-container h-full flex justify-center items-center">
      <m-classic-spinner [size]="60" />
    </section>

  `
})
export class GoPageComponent {

  private readonly userContext = inject(UserContextService)

}
