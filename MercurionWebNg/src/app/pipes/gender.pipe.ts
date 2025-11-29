import { Pipe, PipeTransform } from '@angular/core';
import { UserGender } from '../Models/auth/user.models';

@Pipe({
  name: 'gender',
  standalone: true
})
export class GenderPipe implements PipeTransform {

  transform(val: UserGender | null | undefined): string {
    switch (val) {
      case 'M':
        return 'Maschile'
      case 'F':
        return 'Femminile'
      case 'Undefined':
      default:
        return 'Non specificato'
    }
  }


}
