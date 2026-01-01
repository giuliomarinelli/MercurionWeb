import { MfaStrategyDTO } from './../../../Models/account/account.models';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { MfaStrategy } from '../../../Models/account/account.models';
import { NgClass } from '@angular/common';
import { DesignService } from '../../../services/design.service';

@Component({
  selector: 'm-mfa-strategy-card',
  imports: [NgClass],
  template: `

  @if (_strategy() && !(_strategy()!.strategy === 'BACKUP_CODE' && !_strategy()!.enabled)) {
    <div
      class="
        w-full rounded-md border p-4 mb-3
        bg-slate-100 dark:bg-slate-800
        border-slate-300 dark:border-slate-600
        max-h-fit opacity-100 flex gap-6 items-center flex-wrap
        text-xs font-semibold gap-y-4 justify-between
        transition-all duration-150 ease-linear
      "
      [ngClass]="{
        'cursor-pointer hover:-translate-y-1 hover:shadow-md': choose,
        'cursor-default': !choose
    }"
      role="group"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-live]="choose ? 'polite' : 'off'"
    >


      <div class="flex items-center gap-6">
          @switch (_strategy()!.strategy) {
              @case ('EMAIL_OTP') {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto shrink-0">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M80 128L64 128L64 512L576 512L576 128L80 128zM544 184L544 199.9L320 364.2L96 199.9L96 160L544 160L544 184zM544 239.6L544 480L96 480L96 239.6L310.5 396.9L320 403.8L329.5 396.9L544 239.6z"/>
                </svg>
                <span>Invia un codice monouso via e-mail.</span>
              }
              @case ('SMS_OTP') {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto shrink-0">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M256 96L256 160L384 160L384 96L464 96L464 544L176 544L176 96L256 96zM256 64L144 64L144 576L496 576L496 64L256 64zM288 96L352 96L352 128L288 128L288 96zM272 464L272 496L368 496L368 464L272 464z"/>
                </svg>
                <span>Invia un codice monouso via sms.</span>
              }
              @case ('APP_TOTP') {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto shrink-0">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M256 128L256 256L128 256L128 128L256 128zM128 96L96 96L96 288L288 288L288 96L128 96zM256 384L256 512L128 512L128 384L256 384zM128 352L96 352L96 544L288 544L288 352L128 352zM384 128L512 128L512 256L384 256L384 128zM352 96L352 288L544 288L544 96L352 96zM472 424L424 424L424 472L472 472L472 424zM216 168L168 168L168 216L216 216L216 168zM168 424L168 472L216 472L216 424L168 424zM472 168L424 168L424 216L472 216L472 168zM360 360L360 408L408 408L408 360L360 360zM360 488L360 536L408 536L408 488L360 488zM536 488L488 488L488 536L536 536L536 488zM488 360L488 408L536 408L536 360L488 360z"/>
                </svg>
                  @if (choose || design.maxBk('sm')()) {
                    <span>Utilizza l'app di autenticazione.</span>
                  } @else {
                    <span>Utilizza un'app di autenticazione come Google Authenticator, Microsoft Authenticator o Authy.</span>
                  }
              }
              @case ('BACKUP_CODE') {
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto shrink-0">
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path d="M112.6 178.9L320 98.3L527.6 178.9C532.9 270 498.8 463.8 320 541.1C141.3 463.8 107.2 270 112.6 178.9zM559.6 177L558.3 156.5L539.1 149L331.6 68.5L320 64L308.5 68.5L101 149L81.8 156.5L80.6 177C77.7 226.9 85.5 303.3 117.9 377.9C150.6 453.2 208.9 527.9 307.3 570.5L320 576L332.7 570.5C431.1 527.9 489.4 453.2 522.1 377.9C554.5 303.2 562.3 226.9 559.4 177zM320 248C333.3 248 344 258.7 344 272C344 285.3 333.3 296 320 296C306.7 296 296 285.3 296 272C296 258.7 306.7 248 320 248zM376 272C376 241.1 350.9 216 320 216C289.1 216 264 241.1 264 272C264 297.4 280.9 318.8 304 325.7L304 416L336 416L336 325.7C359.1 318.8 376 297.4 376 272z"/>
                </svg>
                  @if (choose) {
                    <span>Utilizza un codice di backup.</span>
                  } @else {
                    <p class="flex flex-col gap-y-2 sm:gap-y-[2px]">
                      <span>Utilizza un codice di backup.</span>
                      <span class="font-extralight text-[0.7rem]">I codici di backup restano validi finché non disattivi tutti gli altri metodi di autenticazione a più fattori.<br /> Ogni codice di backup è monouso.</span>
                    </p>
                  }
                }
          }

        @if (choose || config) {
          <span
            class="px-2 py-[2px] rounded text-xs font-semibold"
            [class.bg-emerald-200]="_strategy()!.enabled"
            [class.text-emerald-800]="_strategy()!.enabled"
            [class.bg-amber-200]="!_strategy()!.enabled"
            [class.text-amber-800]="!_strategy()!.enabled"
          >
            {{ _strategy()!.enabled ? 'Attiva' : 'Non attiva' }}
          </span>
          @if (_strategy()!.strategy === 'SMS_OTP' && noPhone) {
              <div class="flex items-center gap-4 flex-wrap text-sm">
                <span >Per attivare questa strategia</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
                    <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                    <path d="M571.4 331.3L582.7 320L571.4 308.7L395.4 132.7L384.1 121.4L361.5 144L372.8 155.3L521.5 304L64.1 304L64.1 336L521.5 336L372.8 484.7L361.5 496L384.1 518.6L571.4 331.3z"/>
                </svg>
                <button class="a" (click)="doAddNewPhone()">Aggiungi un numero di telefono</button>
              </div>
            }
        }
      </div>
      @if (showActions && !(noPhone && _strategy()!.strategy === 'SMS_OTP') && _strategy()!.strategy !== 'BACKUP_CODE') {
        <button
          type="button"
          [class.green-btn]="!_strategy()!.enabled || _strategy()!.strategy === 'BACKUP_CODE'"
          [class.red-btn]="_strategy()!.enabled && _strategy()!.strategy !== 'BACKUP_CODE'"
          class="
            flex items-center gap-1 px-3 py-2 rounded-md
            font-semibold text-sm
            transition-colors duration-150
          "
          (click)="handleActionClick()"
          [attr.aria-pressed]="_strategy()!.enabled"
          [attr.aria-label]="actionLabel()"
        >
          @if (!_strategy()!.enabled) {
              <svg xmlns="http://www.w3.org/2000/svg"
                   viewBox="0 0 640 640"
                   class="fill-current h-6 w-6 relative -left-1">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 64C356.1 64 388 82.1 407.1 109.6C440.1 103.6 475.5 113.4 501 138.9C526.5 164.4 536.3 199.8 530.3 232.8C557.9 252 576 283.9 576 320C576 356.1 557.9 388 530.4 407.1C536.4 440.1 526.6 475.5 501.1 501C475.6 526.5 440.2 536.3 407.2 530.3C388 557.9 356.1 576 320 576C283.9 576 252 557.9 232.9 530.4C199.9 536.4 164.5 526.6 139 501.1C113.5 475.6 103.7 440.2 109.7 407.2C82.1 388 64 356.1 64 320C64 283.9 82.1 252 109.6 232.9C103.6 199.9 113.4 164.5 138.9 139C164.4 113.5 199.8 103.7 232.8 109.7C252 82.1 283.9 64 320 64zM320 96C291.7 96 267 111.9 254.6 135.4L248.4 147.1L235.8 143.2C210.4 135.4 181.7 141.6 161.6 161.6C141.5 181.6 135.4 210.4 143.2 235.8L147.1 248.4L135.4 254.6C111.9 267 96 291.7 96 320C96 348.3 111.9 373 135.4 385.4L147.1 391.6L143.2 404.2C135.4 429.6 141.6 458.3 161.6 478.4C181.6 498.5 210.4 504.6 235.8 496.8L248.4 492.9L254.6 504.6C267 528.1 291.7 544 320 544C348.3 544 373 528.1 385.4 504.6L391.6 492.9L404.2 496.8C429.6 504.6 458.3 498.4 478.4 478.4C498.5 458.4 504.6 429.7 496.8 404.3L492.9 391.6L504.6 385.4C528.1 373 544 348.3 544 320C544 291.7 528.1 267 504.6 254.6L492.9 248.4L496.8 235.7C504.6 210.3 498.4 181.6 478.4 161.6C458.4 141.6 429.6 135.4 404.2 143.2L391.6 147.1L385.4 135.4C373 111.9 348.3 96 320 96zM422.3 240.1L412.9 253L307.3 398.2L296.1 413.6L282.9 399.9L228.5 343.6L217.4 332.1L240.4 309.9C242.8 312.4 260.2 330.4 292.7 364L387.1 234.2L396.5 221.3L422.4 240.1z"/>
              </svg>
              <span>Attiva</span>
          } @else {
              <svg xmlns="http://www.w3.org/2000/svg"
                   viewBox="0 0 640 640"
                   class="fill-current h-6 w-6 relative -left-1">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M160 240C160 178.1 210.1 128 272 128C311.3 128 345.8 148.2 365.8 178.8L373.5 190.5L386.1 184.5C397.5 179 410.4 176 424 176C472.6 176 512 215.4 512 264L512 324.9L521.1 329.2C553.6 344.7 576 377.7 576 416L576 512L64 512L64 400C64 347.8 99.7 304 148 291.5L160 288.4L160 240zM272 96C192.5 96 128 160.5 128 240L128 264.2C72.1 284 32 337.3 32 400L32 544L608 544L608 416C608 368.6 582.2 327.2 544 305.1L544 264C544 197.7 490.3 144 424 144C410.3 144 397.1 146.3 384.8 150.5C358.4 117.3 317.7 96 272 96zM241.4 296C243.4 298 262.1 316.7 297.4 352C262 387.4 243.4 406 241.4 408L264 430.6C266 428.6 284.7 410 320 374.6L376 430.6L398.6 408C396.6 406 377.9 387.3 342.6 352C378 316.6 396.6 298 398.6 296L376 273.4C374 275.4 355.3 294.1 320 329.4C284.6 294 266 275.4 264 273.4L241.4 296z"/>
              </svg>
              <span>Disattiva</span>
            }

        </button>
      } @else if (_remainingBackupCodes() >= 0 && _strategy()!.strategy !== 'SMS_OTP') {
        <p class="text-sm">
          Rimanenti:&nbsp;
          @if (!_remainingBackupCodes()) {
            <span class="text-red-600 dark:text-red-300">Nessuno</span>
          } @else {
            <span class="text-emerald-600 dark:text-dark-accent-secondary-hc">{{_remainingBackupCodes()}}</span>
          }
        </p>
      }
    </div>
  }


  `
})
export class MfaStrategyCardComponent {

  protected readonly design = inject(DesignService)

  _activeStrategies = signal<MfaStrategy[]>([])
  _strategy = signal<MfaStrategyDTO | null>(null)
  _remainingBackupCodes = signal<number>(-1)
  private currentStrategy: MfaStrategy | null = null

  @Input({ required: true })
  set strategy(strategy: MfaStrategy) {
    this.currentStrategy = strategy
    this.updateStrategyState()
  }

  @Input({ required: true })
  set activeStrategies(activeStrategies: MfaStrategy[]) {
    this._activeStrategies.set(activeStrategies ?? [])
    this.updateStrategyState()
  }

  @Input()
  showActions = false

  @Input()
  noPhone = false

  @Input()
  choose = false

  @Input()
  config = false

  @Input()
  set remainingBackupCodes(remainingBackupCodes: number) {
    this._remainingBackupCodes.set(remainingBackupCodes)
  }

  @Output()
  onEnableMfa = new EventEmitter<MfaStrategy>()

  @Output()
  onDisableMfa = new EventEmitter<MfaStrategy>()

  @Output()
  onAddNewPhone = new EventEmitter<void>()

  private updateStrategyState(): void {
    if (!this.currentStrategy) {
      return
    }
    const active = this._activeStrategies()
    this._strategy.set({
      strategy: this.currentStrategy,
      enabled: active.includes(this.currentStrategy)
    })
  }

  handleActionClick(): void {
    const state = this._strategy()
    if (!state) {
      return
    }
    if (state.strategy === 'SMS_OTP' && this.noPhone && !state.enabled) {
      return
    }
    if (state.enabled) {
      this.onDisableMfa.emit(state.strategy)
    } else {
      this.onEnableMfa.emit(state.strategy)
    }
  }

  doAddNewPhone(): void {
    this.onAddNewPhone.emit()
  }

  ariaLabel(): string {
    const s = this._strategy()
    if (!s) return 'Strategia MFA'
    const enabled = s.enabled ? 'attiva' : 'non attiva'
    const remaining = this._remainingBackupCodes()
    const suffix = s.strategy === 'BACKUP_CODE' && remaining >= 0 ? `, codici di backup rimanenti ${remaining}` : ''
    return `Strategia ${this.labelForStrategy(s.strategy)}, ${enabled}${suffix}`
  }

  actionLabel(): string {
    const s = this._strategy()
    if (!s) return 'Attiva o disattiva strategia'
    return s.enabled ? `Disattiva ${this.labelForStrategy(s.strategy)}` : `Attiva ${this.labelForStrategy(s.strategy)}`
  }

  private labelForStrategy(strategy: MfaStrategy): string {
    switch (strategy) {
      case 'EMAIL_OTP':
        return 'codice via email'
      case 'SMS_OTP':
        return 'codice via SMS'
      case 'APP_TOTP':
        return 'app di autenticazione'
      case 'BACKUP_CODE':
        return 'codici di backup'
      default:
        return 'strategia MFA'
    }
  }

}
