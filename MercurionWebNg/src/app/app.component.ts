import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/common/header/header.component';
import { RDKitLoaderService } from './services/rd-kit-loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'MercurionWebNg'

  constructor(private readonly rdkitLoaderService: RDKitLoaderService) { }

  ngOnInit(): void {
    this.rdkitLoaderService.instance$.subscribe(rdkit => console.log('RDKit v:', rdkit.version()))
  }



}
