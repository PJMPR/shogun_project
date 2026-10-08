import { Routes } from '@angular/router';
export default [{path:'',loadComponent:()=>import('../faculty/faculty.component').then(m=>m.FacultyComponent)}] as Routes;
