import { Component, Input, Output, EventEmitter, forwardRef, HostListener, HostBinding } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  templateUrl: './custom-select.component.html',
  styleUrls: ['./custom-select.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder: string = 'Select an option';
  @Input() disabled: boolean = false;
  @HostBinding('class') className = '';

  isDropdownOpen = false;
  selectedOption: SelectOption | null = null;

  // ControlValueAccessor implementation
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  // Method to toggle dropdown
  toggleDropdown(): void {
    if (!this.disabled) {
      this.isDropdownOpen = !this.isDropdownOpen;
    }
  }

  // Method to select an option
  selectOption(option: SelectOption): void {
    if (!this.disabled) {
      this.selectedOption = option;
      this.isDropdownOpen = false;
      
      // Notify form control of the change
      this.onChange(option.value);
      this.onTouched();
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent): void {
    const clickedInside = (event.target as HTMLElement).closest('.custom-select-wrapper');
    if (!clickedInside) {
      this.isDropdownOpen = false;
    }
  }

  // ControlValueAccessor methods
  writeValue(value: string): void {
    // Find and set the selected option based on the value
    this.selectedOption = this.options.find(option => option.value === value) || null;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
} 