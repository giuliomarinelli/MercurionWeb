import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, GuardResult, MaybeAsync, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private readonly router: Router
  ) {}

  canActivate(): boolean | UrlTree {
    const login = localStorage.getItem('login')

    const isValid = login && (login.length === 1 || login.length === 2)

    if (isValid) return true

    sessionStorage?.setItem('RouteError', 'AccessDenied')

    return this.router.parseUrl('/login')
  }

}
