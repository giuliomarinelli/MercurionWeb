import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActionCardComponent } from '../app/components/common/action-card/action-card.component';
import { ActionFooterComponent } from '../app/components/common/action-footer/action-footer.component';
import { ButtonComponent } from '../app/components/common/button/button.component';
import { DialogShellComponent } from '../app/components/common/dialog-shell/dialog-shell.component';
import { DisclosureComponent } from '../app/components/common/disclosure/disclosure.component';
import { IconButtonComponent } from '../app/components/common/icon-button/icon-button.component';
import { PaginationComponent } from '../app/components/common/pagination/pagination.component';
import { ProgressIndicatorComponent } from '../app/components/common/progress-indicator/progress-indicator.component';
import { SearchFieldComponent } from '../app/components/common/search-field/search-field.component';
import { SelectCoreComponent } from '../app/components/common/select-core/select-core.component';
import { SelectionControlComponent } from '../app/components/common/selection-control/selection-control.component';
import { SkeletonComponent } from '../app/components/common/skeleton/skeleton.component';
import { TabsModule } from 'primeng/tabs';
import { TextareaComponent } from '../app/components/common/textarea/textarea.component';
import { TextFieldComponent } from '../app/components/common/text-field/text-field.component';
import { ToastComponent } from '../app/components/common/toast/toast.component';
import { ToastService } from '../app/services/toast.service';
import { PagePaginationState } from '../app/Models/graphql/page.models';

interface CatalogOption {
  id: string;
  label: string;
}

@Component({
  selector: 'm-catalog-root',
  standalone: true,
  imports: [
    ActionCardComponent,
    ActionFooterComponent,
    ButtonComponent,
    DialogShellComponent,
    DisclosureComponent,
    FormsModule,
    IconButtonComponent,
    PaginationComponent,
    ProgressIndicatorComponent,
    SearchFieldComponent,
    SelectCoreComponent,
    SelectionControlComponent,
    SkeletonComponent,
    TabsModule,
    TextareaComponent,
    TextFieldComponent,
    ToastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  private readonly toastService = inject(ToastService);

  readonly darkTheme = signal(false);
  readonly dialogOpen = signal(false);
  readonly activeTab = signal(0);
  readonly selectedOption = signal('one');
  readonly selectedOptions = signal<readonly string[]>(['one']);
  readonly search = signal('');

  readonly options: readonly CatalogOption[] = [
    { id: 'one', label: 'First collection' },
    { id: 'two', label: 'Second collection' },
    { id: 'three', label: 'Archived collection' },
  ];

  readonly paginationState: PagePaginationState = {
    mode: 'page',
    currentPage: 2,
    totalPages: 4,
    pending: false,
  };

  toggleTheme(): void {
    this.darkTheme.update(value => !value);
  }

  selectTab(value: string | number | undefined): void {
    const index = Number(value);
    if (index === 0 || index === 1) this.activeTab.set(index);
  }

  showToast(variant: 'success' | 'warn' | 'error'): void {
    this.toastService.trigger(
      variant === 'success' ? 'Saved deterministically' : 'Catalog state preview',
      variant,
      0,
    );
  }

  displayOption = (option: CatalogOption): string => option.label;
  valueOption = (option: CatalogOption): string => option.id;
}
