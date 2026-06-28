import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'search',
  imports: [ReactiveFormsModule],
  templateUrl: './search.html',
  styleUrl: './search.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search {
  protected readonly searchControl = new FormControl('', { nonNullable: true });

  readonly getFision = output<string>();

  protected onSubmit(): void {
    const value = this.searchControl.value.trim();
    if (!value) {
      return;
    }
    this.getFision.emit(value);
  }

  protected onEnter(event: Event): void {
    // Stop the browser's implicit form submission on Enter, which would
    // otherwise refresh the page (the form has no submit button, but some
    // browsers still submit on Enter and the default action reloads the
    // current URL).
    event.preventDefault();
    this.onSubmit();
  }

  protected useExample(name: string): void {
    this.searchControl.setValue(name);
    this.onSubmit();
  }
}
