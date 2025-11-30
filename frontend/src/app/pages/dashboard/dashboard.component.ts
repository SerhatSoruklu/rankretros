import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef
} from '@angular/core';
import { CreateHotelComponent } from '../create-hotel/create-hotel.component';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import ApexCharts from 'apexcharts';
import { finalize, catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CreateHotelComponent,
    ConfirmDialogComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
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

  @ViewChild('votesChart') votesChartRef!: ElementRef;
  @ViewChild('viewsChart') viewsChartRef!: ElementRef;
  @ViewChild('rewardsChart') rewardsChartRef!: ElementRef;

  private votesChart?: ApexCharts;
  private viewsChart?: ApexCharts;
  private rewardsChart?: ApexCharts;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadHotels();
    this.profile.username = this.auth.user?.username || '';
    this.profile.email = this.auth.user?.email || '';
  }

  ngAfterViewInit(): void {
    this.renderChartsDeferred();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
          this.hotels = hotels;
          this.selectedHotel = this.hotels.length ? this.hotels[0] : null;
          this.cdr.detectChanges();
          console.log('[Dashboard] hotels loaded', { count: this.hotels.length, selected: this.selectedHotel });
          this.renderChartsDeferred();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load hotels.';
          console.error('[Dashboard] failed to load hotels', err);
        }
      });
  }

  onHotelCreated(hotel: any) {
    this.hotels = [hotel, ...this.hotels];
    this.selectedHotel = hotel;
    this.activeTab = 'list';
    this.renderChartsDeferred();
  }

  selectHotel(hotel: any) {
    this.selectedHotel = hotel;
    this.renderChartsDeferred();
  }

  setTab(tab: 'dashboard' | 'add' | 'list' | 'settings') {
    this.activeTab = tab;
    if (tab === 'add') {
      this.pool = 'pick';
    }
    this.renderChartsDeferred();
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

  saveEdit(hotel: any) {
    const id = hotel._id || hotel.id;
    this.api.updateHotel(id, this.editingModel).subscribe({
      next: (updated) => {
        this.hotels = this.hotels.map((h) => (h._id === id || h.id === id ? updated : h));
        if (this.selectedHotel && (this.selectedHotel._id === id || this.selectedHotel.id === id)) {
          this.selectedHotel = updated;
        }
        this.cancelEdit();
        this.renderCharts();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to update server.';
      }
    });
  }

  deleteHotel(hotel: any) {
    const id = hotel._id || hotel.id;
    this.api.deleteHotel(id).subscribe({
      next: () => {
        this.hotels = this.hotels.filter((h) => h._id !== id && h.id !== id);
        if (this.selectedHotel && (this.selectedHotel._id === id || this.selectedHotel.id === id)) {
          this.selectedHotel = this.hotels[0] || null;
        }
        this.cancelEdit();
        this.renderCharts();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to delete server.';
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

  private destroyCharts() {
    this.votesChart?.destroy();
    this.viewsChart?.destroy();
    this.rewardsChart?.destroy();
    this.votesChart = undefined;
    this.viewsChart = undefined;
    this.rewardsChart = undefined;
  }

  private renderChartsDeferred() {
    setTimeout(() => this.renderChartsIfReady(), 0);
  }

  private renderChartsIfReady(attempt = 0) {
    if (!this.selectedHotel && this.hotels.length) {
      this.selectedHotel = this.hotels[0];
      this.cdr.detectChanges();
    }

    if (this.activeTab !== 'dashboard' || !this.selectedHotel) {
      return;
    }

    const votesEl = this.votesChartRef?.nativeElement;
    const viewsEl = this.viewsChartRef?.nativeElement;
    const rewardsEl = this.rewardsChartRef?.nativeElement;

    if (!votesEl || !viewsEl || !rewardsEl) {
      if (attempt < 20) {
        setTimeout(() => this.renderChartsIfReady(attempt + 1), 100);
      }
      return;
    }

    this.renderCharts();
  }

  private renderCharts() {
    this.destroyCharts();

    const votesSeries = this.buildDailySeries('votes', this.selectedHotel.totalVotes || 0);
    const viewsSeries = this.buildDailySeries('views', this.selectedHotel.views || 0);
    const rewardsSeries = this.buildRewardsSeries();

    this.votesChart = new ApexCharts(this.votesChartRef.nativeElement, {
      chart: { type: 'area', height: 260, toolbar: { show: false }, sparkline: { enabled: false } },
      colors: ['#8ea2ff'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 3 },
      series: [{ name: 'Votes', data: votesSeries }],
      xaxis: { type: 'datetime' },
      yaxis: { labels: { formatter: (val: number) => `${Math.round(val)}` } },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] }
      },
      tooltip: { theme: 'dark' }
    });
    this.votesChart.render();

    this.viewsChart = new ApexCharts(this.viewsChartRef.nativeElement, {
      chart: { type: 'bar', height: 260, toolbar: { show: false } },
      colors: ['#2dd4bf'],
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 6 } },
      series: [{ name: 'Views', data: viewsSeries }],
      xaxis: { type: 'datetime' },
      yaxis: { labels: { formatter: (val: number) => `${Math.round(val)}` } },
      tooltip: { theme: 'dark' }
    });
    this.viewsChart.render();

    this.rewardsChart = new ApexCharts(this.rewardsChartRef.nativeElement, {
      chart: { type: 'donut', height: 260 },
      labels: rewardsSeries.labels,
      series: rewardsSeries.values,
      colors: ['#f6c177', '#2dd4bf', '#a78bfa'],
      legend: { position: 'bottom' },
      stroke: { width: 0 },
      dataLabels: { enabled: true }
    });
    this.rewardsChart.render();
  }

  private buildDailySeries(seedKey: string, baseTotal: number) {
    const days = 31;
    const data: { x: number; y: number }[] = [];
    const seed = this.hashSeed(seedKey + (this.selectedHotel?.slug || 'seed'));
    let remaining = Math.max(baseTotal, 25);

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = ((seed + i * 13) % 7) - 3;
      const value = Math.max(0, Math.round(remaining / (i + 1) + variance * 2));
      data.push({ x: date.getTime(), y: value });
    }

    return data;
  }

  private buildRewardsSeries() {
    const rewards = this.selectedHotel?.rewards || {};
    const values = [
      Number(rewards.credits) || 0,
      Number(rewards.diamonds) || 0,
      Number(rewards.duckets) || 0
    ];
    const labels = ['Credits', 'Diamonds', 'Duckets'];
    const allZero = values.every((v) => v === 0);
    return {
      labels,
      values: allZero ? [1, 1, 1] : values
    };
  }

  private hashSeed(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
