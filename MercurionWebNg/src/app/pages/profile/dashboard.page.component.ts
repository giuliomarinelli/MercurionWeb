import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '../../services/account.service';
import { ProfileDTO } from '../../Models/account/account.models';
import { Subscription } from 'rxjs';
import { JsonPipe } from '@angular/common';


@Component({
  selector: 'app-profile',
  imports: [],
  template: `

    <section class="main-container">
      <h1 class="text-5xl text-center mb-12 tracking-wide">Benvenut{{ ending }} {{profile.firstName}}.</h1>

    </section>

  `
})
export class ProfilePageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly accountService = inject(AccountService)
  // ====================================================

  private prSub?: Subscription

  profile!: ProfileDTO
  ending = 'o'
  initials!: string

  ngOnInit(): void {
    this.prSub = this.accountService.getProfileRegistry().subscribe({
      next: profile => {
        this.profile = profile
        if (profile.gender === 'F') {
          this.ending = 'a'
        }
        this.initials = profile.firstName.slice(0, 1) + profile.lastName.slice(0, 1)
      },
      error: e => console.error(e)
    })
  }

  ngOnDestroy(): void {
    this.prSub?.unsubscribe()
  }

}
