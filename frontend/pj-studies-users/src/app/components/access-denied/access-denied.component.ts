import { Component } from '@angular/core';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:1rem;">
      <i class="pi pi-lock" style="font-size:3rem;color:var(--p-red-500,#ef4444)"></i>
      <h2>Brak dostępu</h2>
      <p>Ta strona jest dostępna tylko dla administratorów.</p>
    </div>
  `,
})
export class AccessDeniedComponent {}
