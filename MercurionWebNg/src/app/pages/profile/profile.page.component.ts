import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '../../services/account.service';
import { ProfileDTO } from '../../Models/account/account.models';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-profile',
  imports: [],
  template: `



  `
})
export class ProfilePageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly accountService = inject(AccountService)
  // ====================================================

  private prSub?: Subscription

  private profile!: ProfileDTO

  ngOnInit(): void {
    this.prSub = this.accountService.getProfileRegistry().subscribe({
      next: profile => this.profile = profile,
      error: e => console.error(e)
    })
  }

  ngOnDestroy(): void {
    this.prSub?.unsubscribe()
  }

}
