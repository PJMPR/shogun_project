import { Routes } from '@angular/router';
export const routes: Routes = [{path:'faculty',loadComponent:()=>import('./faculty/faculty.component').then(m=>m.FacultyComponent)},{path:'',redirectTo:'faculty',pathMatch:'full'}];
