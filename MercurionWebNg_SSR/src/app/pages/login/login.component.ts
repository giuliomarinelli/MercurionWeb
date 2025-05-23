import { afterNextRender, Component } from '@angular/core';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor() {
    afterNextRender(() => {
      if (window) {
        location.href = `${environment.base}/app/login`
      }
    })
  }

}
