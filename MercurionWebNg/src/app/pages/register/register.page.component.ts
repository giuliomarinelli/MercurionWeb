import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-register.page',
  imports: [],
  templateUrl: './register.page.component.html',
  styleUrl: './register.page.component.css'
})
export class RegisterPageComponent {

  step = signal<1 | 2>(1)

}
