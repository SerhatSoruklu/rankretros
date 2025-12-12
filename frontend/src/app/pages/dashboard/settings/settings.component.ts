import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  @Input() profile = { username: '', email: '' };
  @Input() passwordForm = { currentPassword: '', newPassword: '' };
  @Input() showCurrent = false;
  @Input() showNew = false;
  @Input() passwordLoading = false;
  @Input() profileMessage = '';
  @Input() profileError = '';
  @Input() passwordMessage = '';
  @Input() passwordError = '';

  @Output() saveProfileEvent = new EventEmitter<void>();
  @Output() updatePasswordEvent = new EventEmitter<void>();
  @Output() confirmDeleteAccountEvent = new EventEmitter<void>();
  @Output() logoutEvent = new EventEmitter<void>();
  @Output() toggleShowCurrent = new EventEmitter<void>();
  @Output() toggleShowNew = new EventEmitter<void>();

  onSaveProfile() {
    this.saveProfileEvent.emit();
  }

  onUpdatePassword() {
    this.updatePasswordEvent.emit();
  }

  onConfirmDeleteAccount() {
    this.confirmDeleteAccountEvent.emit();
  }

  onLogout() {
    this.logoutEvent.emit();
  }

  onToggleShowCurrent() {
    this.toggleShowCurrent.emit();
  }

  onToggleShowNew() {
    this.toggleShowNew.emit();
  }
}
