import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  template: `
    <section class="access-denied-page">
      <h1>Brak dostepu</h1>
      <p>Nie masz uprawnien do tej sekcji aplikacji.</p>
      <a pButton routerLink="/" label="Wroc do strony glownej"></a>
    </section>
  `,
  styles: [
    `
      .access-denied-page {
        max-width: 720px;
        margin: 3rem auto;
        padding: 2rem;
        background: #fff;
        border: 1px solid #f1f1f1;
        border-radius: 16px;
      }

      .access-denied-page h1 {
        margin-top: 0;
        color: #dc2626;
      }

      .access-denied-page p {
        margin-bottom: 1.2rem;
      }
    `,
  ],
})
export class AccessDeniedComponent {}
