import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'noSpecialCharLabel',
    standalone: true
})
export class NoSpecialCharLabelPipe implements PipeTransform {
    // The first argument is the input value; subsequent parameters follow
    transform(value: string, keepDash = false): string {
        if (!value) return '';
        return value.length ? value.replace('_', !keepDash ? ' ' : '-') : value;
    }
}