import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';
import { LoadingContextService } from '../../services/stores/loading-context.service';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { UserContextService } from '../../services/stores/user-context.service';

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
    private readonly userContext: UserContextService
  ) {}

  ngAfterViewInit(): void {
    this.loadingContext.stop()
  }

  logout(): void {
    this.loggingOut.set(true)
    this.logoutSub = this.authService.logout().subscribe({
      next: () => {
        this.loggingOut.set(false)
        sessionStorage?.setItem('logout', 'success')
        sessionStorage?.removeItem('login')
        this.userContext.logout()
        this.router.navigate(['/login'])
      },
      error: (err) => {
        this.loggingOut.set(false)
        sessionStorage?.setItem('logout', 'success')
        this.userContext.logout()
        !!sessionStorage?.getItem('login') && sessionStorage?.removeItem('login')
        this.router.navigate(['/login'])
      }
    })
  }

  ngOnDestroy(): void {
    this.logoutSub?.unsubscribe()
  }

}
