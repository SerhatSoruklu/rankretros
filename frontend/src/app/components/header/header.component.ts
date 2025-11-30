import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(
    public readonly auth: AuthService,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    // Hard navigation to ensure cookies/state are fully cleared
    window.location.href = '/';
  }
}
