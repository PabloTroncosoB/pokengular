import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'search',
  imports: [],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search {
  @Output() getFision = new EventEmitter<string>();
  
  @ViewChild('search', { static: true }) searchInput!: ElementRef<HTMLInputElement>;
  
  getPokiman(): void {
    const searchText = this.searchInput.nativeElement.value;
    this.getFision.emit(searchText);
  }
}
