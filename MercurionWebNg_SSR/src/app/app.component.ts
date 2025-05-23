import { afterNextRender, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment.development';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'MercurionWebNg_SSR';

  base = signal<string>('')
  login = signal<string>('')

  constructor() {
    afterNextRender(() => {
      this.base.set(environment.base)
      this.login.set(`${this.base()}/app/login`)
      const login = localStorage?.getItem('login')
      sessionStorage?.removeItem('RouteError')
      if (login && (login.length === 1 || login.length === 2) && window) {
        location.href = `${this.base()}/app/profile`
      }
    })
  }

}
