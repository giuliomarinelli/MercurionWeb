import { Component, Input } from '@angular/core';
import { MfaStrategy } from '../../../Models/account/account.models';

@Component({
  selector: 'm-mfa-strategy-card',
  imports: [],
  template: `

    <div
      class="
        w-full rounded-md border p-4 mb-3
        bg-slate-100 dark:bg-slate-800
        border-slate-300 dark:border-slate-600
        transition-all max-h-fit duration-150 ease-linear
        opacity-100 flex gap-6 items-center flex-wrap
        text-sm font-semibold cursor-default gap-y-4
      "
    >

      @switch (strategy) {
          @case ('EMAIL_OTP') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M80 128L64 128L64 512L576 512L576 128L80 128zM544 184L544 199.9L320 364.2L96 199.9L96 160L544 160L544 184zM544 239.6L544 480L96 480L96 239.6L310.5 396.9L320 403.8L329.5 396.9L544 239.6z"/>
            </svg>
            <span>Invia un codice monouso via e-mail.</span>
          }
          @case ('SMS_OTP') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M256 96L256 160L384 160L384 96L464 96L464 544L176 544L176 96L256 96zM256 64L144 64L144 576L496 576L496 64L256 64zM288 96L352 96L352 128L288 128L288 96zM272 464L272 496L368 496L368 464L272 464z"/>
            </svg>
            <span>Invia un codice monouso via sms.</span>
          }
          @case ('APP_TOTP') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-7 w-auto">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path d="M256 128L256 256L128 256L128 128L256 128zM128 96L96 96L96 288L288 288L288 96L128 96zM256 384L256 512L128 512L128 384L256 384zM128 352L96 352L96 544L288 544L288 352L128 352zM384 128L512 128L512 256L384 256L384 128zM352 96L352 288L544 288L544 96L352 96zM472 424L424 424L424 472L472 472L472 424zM216 168L168 168L168 216L216 216L216 168zM168 424L168 472L216 472L216 424L168 424zM472 168L424 168L424 216L472 216L472 168zM360 360L360 408L408 408L408 360L360 360zM360 488L360 536L408 536L408 488L360 488zM536 488L488 488L488 536L536 536L536 488zM488 360L488 408L536 408L536 360L488 360z"/>
            </svg>
            <span>Utilizza un'app di autenticazione come Google Authenticator, Microsoft Authenticator o Authy.</span>
          }
      }

    </div>


  `
})
export class MfaStrategyCardComponent {

  @Input({ required: true })
  strategy!: MfaStrategy

}
