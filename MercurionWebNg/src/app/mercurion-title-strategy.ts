import { inject, Injectable } from '@angular/core'
import { RouterStateSnapshot, TitleStrategy, ActivatedRouteSnapshot } from '@angular/router'
import { AppTitleService } from './services/app-title.service'


@Injectable({ providedIn: 'root' })
export class MercurionTitleStrategy extends TitleStrategy {

  private readonly appTitle = inject(AppTitleService)

  constructor() {
    super()
  }

  override updateTitle(routerState: RouterStateSnapshot): void {
    const leaf = this.getLeaf(routerState.root)
    const managedByComponent = !!leaf.data?.['titleManagedByComponent']

    if (managedByComponent) {
      return
    }

    const routeTitle = this.buildTitle(routerState)
    this.appTitle.set(routeTitle ?? undefined)
  }

  private getLeaf(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let r = route
    while (r.firstChild) r = r.firstChild
    return r
  }
}
