import { FormGroup } from '@angular/forms';
import { AbstractControl, ValidatorFn } from '@angular/forms';

// Validator for matching fields, like password and confirm password
export function MustMatch(controlName: string, matchingControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): { [key: string]: boolean } | null => {
        const control = formGroup.get(controlName);
        const matchingControl = formGroup.get(matchingControlName);

        if (!control || !matchingControl) {
            return null; // If controls are not found, do nothing
        }

        if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
            return null;
        }

        if (control.value !== matchingControl.value) {
            matchingControl.setErrors({ mustMatch: true });
        } else {
            matchingControl.setErrors(null);
        }

        return null;
    };
}

// Validator to check if a name is valid
export function nameValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
        const value = control.value;

        if (!value) {
            return null; // Allow empty values if required
        }

        const regex = /^[a-zA-Z\s]*$/; // Only allow alphabetic characters and spaces
        if (value.length > 100) {
            return { 'maxLength': true };
        }

        if (!regex.test(value)) {
            return { 'invalidName': true };
        }

        return null;
    };
}

// Validator to prevent SQL injection
export function sqlInjectionValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
        const value = control.value;
        
        if (!value) {
            return null; // Allow empty values if required
        }

        // Basic check for SQL injection
        const sqlInjectionRegex =  /['"%;()--]/;
        if (sqlInjectionRegex.test(value)) {
            return { 'sqlInjection': true };
        }

        return null;
    };
}
