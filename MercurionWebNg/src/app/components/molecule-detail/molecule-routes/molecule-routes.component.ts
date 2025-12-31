import { Component, computed, Input, signal } from '@angular/core';
import { AdministrationRoutes } from '../../../Models/graphql/molecule.detail.models';


@Component({
  selector: 'm-molecule-routes',
  template: `
    <section class="my-4" aria-labelledby="routes-heading">
      <h2 id="routes-heading" class="font-semibold text-light-accent-primary dark:text-dark-accent-primary mb-6 text-center sm:text-left text-xl">Vie di somministrazione</h2>
      <div class="flex flex-wrap gap-2 text-sm justify-center sm:justify-start">
        @if (adminRoutes().oral) {
          <div class="flex items-center rounded bg-indigo-500 text-blue-100 px-2 py-1 gap-1 cursor-default hover:transform hover:scale-[1.03] transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M265.7 336L96 336L96 464C96 508.2 131.8 544 176 544C209.6 544 238.4 523.3 250.2 493.9C254.5 506.5 260 518.4 266.7 529.7C246.3 557.7 213.3 576 176 576C114.1 576 64 525.9 64 464L64 176C64 114.1 114.1 64 176 64C237.9 64 288 114.1 288 176L288 305C279.6 314.5 272.1 324.9 265.7 336zM256 304L256 176C256 131.8 220.2 96 176 96C131.8 96 96 131.8 96 176L96 304L256 304zM342.3 499.1L499.1 342.3C480.4 328.3 457.2 320 432 320C370.1 320 320 370.1 320 432C320 457.2 328.3 480.4 342.3 499.1zM364.9 521.7C383.6 535.7 406.8 544 432 544C493.9 544 544 493.9 544 432C544 406.8 535.7 383.6 521.7 364.9L364.9 521.7zM432 288C511.5 288 576 352.5 576 432C576 511.5 511.5 576 432 576C352.5 576 288 511.5 288 432C288 352.5 352.5 288 432 288z"/>
              </svg>
            <span>Orale</span>
          </div>
        }
        @if (adminRoutes().parenteral) {
          <div class="flex items-center rounded bg-indigo-500 text-blue-100 px-2 py-1 gap-1 cursor-default hover:transform hover:scale-[1.03] transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M523.4 52.7L512.1 41.4L489.5 64C495.5 70 506.1 80.6 521.5 96L464.1 153.4C349.4 38.7 411.7 101 384.1 73.4L361.5 96C370.1 104.6 375.5 110 377.5 112L132.8 356.7L128.1 361.4L128.1 489.4L68.8 548.7L57.5 560L80.1 582.6L91.4 571.3L150.7 512L278.7 512L283.4 507.3L528.1 262.6C530.1 264.6 535.5 270 544.1 278.6L566.8 256C548.1 237.3 511.5 200.7 486.8 176L544.2 118.6C559.6 134 570.2 144.6 576.2 150.6L598.8 128C588.7 117.9 532.6 61.8 523.5 52.7zM505.5 240L265.5 480L160.1 480L160.1 374.6L208.1 326.6C236.8 355.3 252.8 371.3 256.1 374.6L278.8 352C275.5 348.7 259.5 332.7 230.8 304L304.2 230.6C332.9 259.3 348.9 275.3 352.2 278.6L374.8 256C371.5 252.7 355.5 236.7 326.8 208L400.2 134.6C435.3 169.7 470.4 204.8 505.6 240z"/>
            </svg>
            <span>Parenterale</span>
          </div>
        }
        @if (adminRoutes().topical) {
          <div class="flex items-center rounded bg-indigo-500 text-blue-100 px-2 py-1 gap-1 cursor-default hover:transform hover:scale-[1.03] transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-auto">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M224 96L224 144L192 144L192 64L320 64L320 144L288 144L288 96L224 96zM288 224L192 224C156.7 224 128 252.7 128 288L128 544L384 544L384 288C384 252.7 355.3 224 320 224L288 224zM96 288C96 235 139 192 192 192L320 192C373 192 416 235 416 288L416 576L96 576L96 288zM304 384C304 357.5 282.5 336 256 336C229.5 336 208 357.5 208 384C208 410.5 229.5 432 256 432C282.5 432 304 410.5 304 384zM176 384C176 339.8 211.8 304 256 304C300.2 304 336 339.8 336 384C336 428.2 300.2 464 256 464C211.8 464 176 428.2 176 384zM448 64L448 96L480 96L480 128L448 128L448 160L416 160L416 128L384 128L384 96L416 96L416 64L448 64zM576 80L576 96L608 96L608 128L576 128L576 160L544 160L544 128L512 128L512 96L544 96L544 64L576 64L576 80zM576 272L576 288L608 288L608 320L576 320L576 352L544 352L544 320L512 320L512 288L544 288L544 256L576 256L576 272zM512 176L512 192L544 192L544 224L512 224L512 256L480 256L480 224L448 224L448 192L480 192L480 160L512 160L512 176z"/>
              </svg>
            <span>Topica</span>
          </div>
        }
        @if (noItem()) {
          <p class="text-sm text-gray-500 dark:text-gray-400 relative -top-3">Nessuna via di somministrazione disponibile.</p>
        }
      </div>
    </section>
  `,
})
export class MoleculeRoutesComponent {
  private readonly routeSignal = signal<AdministrationRoutes>({
    oral: false,
    parenteral: false,
    topical: false,
    __typename: ''
  })

  @Input()
  set adminRoutesInput(value: AdministrationRoutes) {
    this.routeSignal.set(value);
  }

  readonly adminRoutes = this.routeSignal.asReadonly()

  protected noItem = computed(() => {
    const { __typename: _omit, ...rest } = this.adminRoutes()
    return Object.values(rest).every(r => !r)
  })

}
