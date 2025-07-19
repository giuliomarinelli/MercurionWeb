import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { LoadingContextService } from '../../services/context/loading-context.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { UserContextService } from '../../services/context/user-context.service';
import { SessionSyncService } from '../../services/session-sync.service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements AfterViewInit, OnDestroy {

  protected loggingOut = signal(false)
  private logoutSub: Subscription | undefined

  constructor(
    private readonly loadingContext: LoadingContextService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly userContext: UserContextService,
    private readonly sessionSync: SessionSyncService
  ) { }

  ngAfterViewInit(): void {
    this.loadingContext.stop()
  }

  logout(): void {
    this.logoutSub = this.authService.logout().subscribe({
      next: () => {
        sessionStorage?.removeItem('RouteError')
        sessionStorage?.setItem('logout', 'success')
        localStorage?.removeItem('login')
        this.sessionSync.logout()
        this.router.navigate(['/login'])
      },
      error: () => {
        sessionStorage?.removeItem('RouteError')
        sessionStorage?.setItem('logout', 'success')
        this.sessionSync.logout()
        this.router.navigate(['/login'])
      }
    })
  }

  ngOnDestroy(): void {
    this.logoutSub?.unsubscribe()
  }

}
