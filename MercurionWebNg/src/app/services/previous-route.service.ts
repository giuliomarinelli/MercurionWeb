import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, pairwise } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class PreviousRouteService {
  private previousUrl: string | null = null
  private currentUrl: string | null = null

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        pairwise()
      )
      .subscribe(([prev, curr]: [NavigationEnd, NavigationEnd]) => {
        this.previousUrl = prev.urlAfterRedirects
        this.currentUrl = curr.urlAfterRedirects
      })
  }

  public getPreviousUrl(): string | null {
    return this.previousUrl
  }

  public getCurrentUrl(): string | null {
    return this.currentUrl
  }
}
