import { Routes } from '@angular/router';

export const content: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('../../../components/components.module').then(
        (m) => m.ComponentsModule
      ),
  },
  
];
