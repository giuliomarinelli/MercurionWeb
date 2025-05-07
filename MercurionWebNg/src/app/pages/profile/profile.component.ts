import { AfterViewInit, Component } from '@angular/core';
import { LoadingContextService } from '../../services/stores/loading-context.service';

@Component({
  selector: 'app-profile',
  imports: [],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements AfterViewInit {

  constructor(private readonly loadingContext: LoadingContextService) {}

  ngAfterViewInit(): void {
    this.loadingContext.stop()
  }

}
