import { Component, HostListener, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

const BREAKPOINT = 900;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  sidebarVisible = signal(window.innerWidth >= BREAKPOINT);
  isMobile = signal(window.innerWidth < BREAKPOINT);

  ngOnInit(): void {
    this.updateState(window.innerWidth);
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateState(window.innerWidth);
  }

  private updateState(width: number): void {
    const mobile = width < BREAKPOINT;
    this.isMobile.set(mobile);
    if (!mobile) {
      this.sidebarVisible.set(true);
    } else {
      this.sidebarVisible.set(false);
    }
  }

  toggleSidebar(): void {
    this.sidebarVisible.set(!this.sidebarVisible());
  }
}
