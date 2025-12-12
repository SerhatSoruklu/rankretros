import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { finalize, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OverviewComponent } from './overview/overview.component';
import { AddServerComponent } from './add-server/add-server.component';
import { MyServersComponent } from './my-servers/my-servers.component';
import { SettingsComponent } from './settings/settings.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialogComponent,
    MatSnackBarModule,
    OverviewComponent,
    AddServerComponent,
    MyServersComponent,
    SettingsComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  hotels: any[] = [];
  selectedHotel: any | null = null;
  loading = false;
  error = '';
  activeTab: 'dashboard' | 'add' | 'list' | 'settings' = 'dashboard';
  pool: 'pick' | 'habbo' | 'runescape' | 'minecraft' = 'pick';
  editingId: string | null = null;
  editingModel: any = {};
  showDeleteDialog = false;
  profile = {
    username: '',
    email: ''
  };
  passwordForm = {
    currentPassword: '',
    newPassword: ''
  };
  showCurrent = false;
  showNew = false;
  passwordLoading = false;
  profileMessage = '';
  profileError = '';
  passwordMessage = '';
  passwordError = '';
  showDeleteServerDialog = false;
  deleteTarget: any | null = null;
  deleteLoading = false;
  private deleteTimer: any;
  private nowTimer: any;
  private nowMs = Date.now();

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadHotels();
    this.profile.username = this.auth.user?.username || '';
    this.profile.email = this.auth.user?.email || '';
    this.nowTimer = setInterval(() => {
      this.nowMs = Date.now();
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.nowTimer) {
      clearInterval(this.nowTimer);
      this.nowTimer = null;
    }
  }

  getRelativeTime(dateValue: string | Date | undefined) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const diffMsRaw = this.nowMs - date.getTime();
    const diffMs = Math.max(0, diffMsRaw);
    const sec = Math.floor(diffMs / 1000);
    const min = Math.floor(sec / 60);
    const hrs = Math.floor(min / 60);
    const days = Math.floor(hrs / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 30) return `${days}d ago`;
    if (months < 12) return `${months}mo ago`;
    return `${years}y ago`;
  }

  loadHotels() {
    this.loading = true;
    this.error = '';
    this.api
      .getHotels()
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (hotels: any[]) => {
          this.hotels = [...hotels].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          this.selectedHotel = this.hotels.length ? this.hotels[0] : null;
          console.log('[Dashboard] hotels loaded', { count: this.hotels.length, selected: this.selectedHotel });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load hotels.';
          console.error('[Dashboard] failed to load hotels', err);
        }
      });
  }

  onHotelCreated(hotel: any) {
    this.hotels = [hotel, ...this.hotels].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    this.selectedHotel = hotel;
    this.activeTab = 'list';
    this.cdr.markForCheck();
  }

  selectHotel(hotel: any) {
    this.selectedHotel = hotel;
    this.cdr.markForCheck();
  }

  onSidebarSelect(hotel: any) {
    this.selectHotel(hotel);
    Promise.resolve().then(() => this.setTab('dashboard'));
  }

  setTab(tab: 'dashboard' | 'add' | 'list' | 'settings') {
    this.activeTab = tab;
    if (tab === 'add') {
      this.pool = 'pick';
    }
  }

  selectPool(pool: 'pick' | 'habbo' | 'runescape' | 'minecraft') {
    this.pool = pool;
  }

  startEdit(hotel: any) {
    this.editingId = hotel._id || hotel.id;
    this.editingModel = {
      name: hotel.name || '',
      slug: hotel.slug || '',
      description: hotel.description || '',
      bannerUrl: hotel.bannerUrl || '',
      callbackUrl: hotel.callbackUrl || '',
      rewards: {
        credits: hotel.rewards?.credits || 0,
        diamonds: hotel.rewards?.diamonds || 0,
        duckets: hotel.rewards?.duckets || 0
      },
      views: hotel.views || 0
    };
  }

  cancelEdit() {
    this.editingId = null;
    this.editingModel = {};
  }

  saveEdit(payload: any) {
    const hotel = payload?.hotel || payload;
    const id = hotel._id || hotel.id;
    const previousBanner = payload?.previousBanner;
    const newBannerKey = payload?.newBannerKey;

    this.api.updateHotel(id, this.editingModel).subscribe({
      next: (updated) => {
        this.hotels = this.hotels.map((h) => (h._id === id || h.id === id ? updated : h));
        if (this.selectedHotel && (this.selectedHotel._id === id || this.selectedHotel.id === id)) {
          this.selectedHotel = updated;
        }
        if (newBannerKey && previousBanner && previousBanner !== this.editingModel.bannerUrl) {
          this.api.deleteHabboBanner(previousBanner).subscribe({
            error: () => {}
          });
        }
        this.snackBar.open('Server updated successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar']
        });
        this.cancelEdit();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to update server.';
        this.snackBar.open(this.error, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['custom-snackbar']
        });
      }
    });
  }

  confirmDeleteHotel(hotel: any) {
    if (this.deleteTimer) {
      clearTimeout(this.deleteTimer);
      this.deleteTimer = null;
    }
    this.deleteTarget = hotel;
    this.showDeleteServerDialog = true;
  }

  cancelDeleteHotel() {
    if (this.deleteTimer) {
      clearTimeout(this.deleteTimer);
      this.deleteTimer = null;
    }
    this.showDeleteServerDialog = false;
    this.deleteTarget = null;
  }

  deleteHotel(hotel: any) {
    const target = hotel || this.deleteTarget;
    if (!target) return;

    this.deleteTarget = target;
    this.deleteLoading = true;
    if (this.deleteTimer) {
      clearTimeout(this.deleteTimer);
    }
    this.deleteTimer = setTimeout(() => {
      this.deleteLoading = false;
      this.showDeleteServerDialog = false;
      this.deleteTimer = null;
    }, 3000);

    const id = target._id || target.id;
    this.api
      .deleteHotel(id)
      .pipe(
        finalize(() => {
          this.deleteLoading = false;
          this.showDeleteServerDialog = false;
          if (this.deleteTimer) {
            clearTimeout(this.deleteTimer);
            this.deleteTimer = null;
          }
        })
      )
      .subscribe({
        next: () => {
          this.hotels = this.hotels.filter((h) => h._id !== id && h.id !== id);
          if (this.selectedHotel && (this.selectedHotel._id === id || this.selectedHotel.id === id)) {
            this.selectedHotel = this.hotels[0] || null;
          }
          if (target.bannerUrl) {
            this.api.deleteHabboBanner(target.bannerUrl).subscribe({ next: () => {}, error: () => {} });
          }
          this.snackBar.open('Server deleted successfully!', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          this.cancelEdit();
          this.deleteTarget = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to delete server.';
          this.snackBar.open(this.error, 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: ['custom-snackbar']
          });
          this.showDeleteServerDialog = false;
          this.deleteTarget = null;
        }
      });
  }

  saveProfile() {
    this.profileMessage = '';
    this.profileError = '';
    this.api.updateProfile(this.profile).subscribe({
      next: (user) => {
        this.auth.updateUser(user);
        this.profileMessage = 'Profile updated.';
      },
      error: (err) => {
        this.profileError = err?.error?.message || 'Failed to update profile.';
      }
    });
  }

  updatePassword() {
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.passwordError = 'Enter your current password and a new password.';
      this.passwordMessage = '';
      return;
    }
    this.passwordMessage = '';
    this.passwordError = '';
    this.passwordLoading = true;
    this.api
      .updatePassword(this.passwordForm)
      .pipe(
        catchError((err) => {
          this.passwordError = err?.error?.message || 'Failed to update password.';
          return EMPTY;
        }),
        finalize(() => {
          this.passwordLoading = false;
        })
      )
      .subscribe(() => {
        this.passwordForm = { currentPassword: '', newPassword: '' };
        this.passwordMessage = 'Password updated.';
      });
  }

  confirmDeleteAccount() {
    this.showDeleteDialog = true;
  }

  cancelDelete() {
    this.showDeleteDialog = false;
  }

  deleteAccount() {
    this.api.deleteAccount().subscribe({
      next: () => {
        this.showDeleteDialog = false;
        this.auth.logout();
        window.location.href = '/';
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to delete account.';
      }
    });
  }

  logout() {
    this.auth.logout();
    window.location.href = '/';
  }

  getServerType(hotel: any): 'habbo' | 'runescape' | 'minecraft' | 'unknown' {
    const rawType =
      (hotel?.type ||
        hotel?.pool ||
        hotel?.game ||
        hotel?.category ||
        hotel?.kind ||
        '').toString().toLowerCase();

    if (rawType.includes('runescape')) return 'runescape';
    if (rawType.includes('minecraft')) return 'minecraft';
    if (rawType.includes('habbo')) return 'habbo';

    // Legacy default: current collection is "habboservers"
    if (hotel?.collection === 'habboservers') return 'habbo';

    // Default to Habbo for existing data until other pools go live
    return 'habbo';
  }

  getServerIcon(hotel: any) {
    const type = this.getServerType(hotel);
    if (type === 'runescape') return '/game-icons/runescape-icon.png';
    if (type === 'minecraft') return '/game-icons/minecraft-icon.png';
    // default to habbo icon until other server types are live
    return '/game-icons/habbo-icon.png';
  }

  getServerLabel(hotel: any) {
    const type = this.getServerType(hotel);
    if (type === 'runescape') return 'RuneScape Server';
    if (type === 'minecraft') return 'Minecraft Server';
    if (type === 'habbo') return 'Habbo Server';
    return 'Server';
  }

  getServerTypeClass(hotel: any) {
    const type = this.getServerType(hotel);
    return {
      habbo: type === 'habbo' || type === 'unknown',
      runescape: type === 'runescape',
      minecraft: type === 'minecraft'
    };
  }
}
