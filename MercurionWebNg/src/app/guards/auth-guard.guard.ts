import { inject, Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  private readonly router = inject(Router)

  canActivate(): boolean | UrlTree {

    const login = localStorage.getItem('login')

    const isValid = login && (login.length === 1 || login.length === 2)

    if (isValid) {
      return true
    }

    return this.router.parseUrl('/login')

  }

}
