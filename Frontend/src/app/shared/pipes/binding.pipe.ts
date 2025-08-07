import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'map'
})
export class MapPipe implements PipeTransform {
  transform(array: any[], property: string): any[] {
    return array.map(item => item[property]);
  }
}

@Pipe({
  name: 'join'
})
export class JoinPipe implements PipeTransform {
  transform(array: any[], separator: string = ', '): string {
    return array.join(separator);
  }
}