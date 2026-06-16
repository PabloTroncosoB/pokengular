import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-search',
  imports: [],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search {
  @Output() getFision = new EventEmitter<any>();
  getPokiman(): void {
    this.getPokiman.emit(this.txt);
  }
}
