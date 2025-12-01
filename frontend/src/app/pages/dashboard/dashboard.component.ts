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
  showDeleteServerDialog = false;
  deleteTarget: any | null = null;
  deleteLoading = false;
  private deleteTimer: any;
  private nowTimer: any;
  private nowMs = Date.now();

  @ViewChild('votesChart') votesChartRef!: ElementRef;
  @ViewChild('viewsChart') viewsChartRef!: ElementRef;

  private votesChart?: ApexCharts;
  private viewsChart?: ApexCharts;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
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

  ngAfterViewInit(): void {
    this.renderChartsDeferred();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
          this.renderChartsDeferred();
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
    this.renderChartsDeferred();
    this.cdr.markForCheck();
  }

  selectHotel(hotel: any) {
    this.selectedHotel = hotel;
    this.renderChartsDeferred();
    this.cdr.markForCheck();
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
        this.renderChartsDeferred();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to update server.';
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
    this.deleteTarget = hotel;
    this.deleteLoading = true;
    if (this.deleteTimer) {
      clearTimeout(this.deleteTimer);
    }
    this.deleteTimer = setTimeout(() => {
      this.deleteLoading = false;
      this.showDeleteServerDialog = false;
      this.deleteTimer = null;
    }, 3000);

    const id = hotel._id || hotel.id;
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
          this.cancelEdit();
          this.renderChartsDeferred();
          this.deleteTarget = null;
          setTimeout(() => this.loadHotels(), 0);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to delete server.';
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

  private destroyCharts() {
    this.votesChart?.destroy();
    this.viewsChart?.destroy();
    this.votesChart = undefined;
    this.viewsChart = undefined;
  }

  private renderChartsDeferred() {
    setTimeout(() => this.renderChartsIfReady(), 0);
  }

  private renderChartsIfReady(attempt = 0) {
    if (!this.selectedHotel && this.hotels.length) {
      this.selectedHotel = this.hotels[0];
      setTimeout(() => this.renderChartsIfReady(attempt + 1), 0);
      this.cdr.markForCheck();
      return;
    }

    if (this.activeTab !== 'dashboard' || !this.selectedHotel) {
      return;
    }

    const votesEl = this.votesChartRef?.nativeElement;
    const viewsEl = this.viewsChartRef?.nativeElement;

    if (!votesEl || !viewsEl) {
      if (attempt < 50) {
        setTimeout(() => this.renderChartsIfReady(attempt + 1), 100);
      }
      return;
    }

    this.renderCharts();
  }

  private renderCharts() {
    if (!this.selectedHotel) {
      this.destroyCharts();
      return;
    }

    // Clear previous charts and also clear container content to avoid stale SVG hiding the new one
    this.destroyCharts();
    const votesEl = this.votesChartRef?.nativeElement;
    const viewsEl = this.viewsChartRef?.nativeElement;
    if (votesEl) votesEl.innerHTML = '';
    if (viewsEl) viewsEl.innerHTML = '';

    const votesSeries = this.buildActualSeries('votes');
    const viewsSeries = this.buildActualSeries('views');
    const votesBundle = this.buildForecastBundle(votesSeries);
    const viewsBundle = this.buildForecastBundle(viewsSeries);

    const liveMarker = {
      seriesIndex: 0,
      dataPointIndex: votesBundle.liveIndex,
      size: 8,
      fillColor: '#22c55e',
      strokeColor: '#0f172a',
      shape: 'circle',
      className: 'live-marker'
    };

    const baseChartConfig = {
      chart: {
        height: 260,
        toolbar: { show: false },
        sparkline: { enabled: false },
        zoom: { enabled: false },
        selection: { enabled: false },
        pan: { enabled: false },
        animations: { enabled: true }
      }
    };

    const xAxisCommon = {
      type: 'datetime' as const,
      tickPlacement: 'on' as const,
      crosshairs: { show: true, position: 'front' as const },
      labels: {
        datetimeFormatter: {
          day: 'dd MMM'
        }
      }
    };

    this.votesChart = new ApexCharts(this.votesChartRef.nativeElement, {
      chart: { ...baseChartConfig.chart, type: 'line' },
      colors: ['#8ea2ff', '#7ce7a7'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 2], dashArray: [0, 8] },
      series: [
        { name: 'Votes', data: votesBundle.actualPadded },
        { name: 'Forecast', data: votesBundle.forecastSeries }
      ],
      markers: {
        size: 3,
        colors: ['#8ea2ff'],
        strokeColors: '#0f172a',
        strokeWidth: 2,
        discrete: [liveMarker]
      },
      xaxis: {
        ...xAxisCommon,
        min: votesBundle.rangeStart,
        max: votesBundle.rangeEnd,
        tickAmount: votesBundle.tickCount
      },
      yaxis: {
        labels: { formatter: (val: number) => `${Math.round(val)}` },
        crosshairs: { show: true, position: 'front', strokeDashArray: 3 }
      },
      tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd MMM' } },
      legend: { show: false },
      grid: { strokeDashArray: 4 }
    });
    this.votesChart.render();

    this.viewsChart = new ApexCharts(this.viewsChartRef.nativeElement, {
      chart: { ...baseChartConfig.chart, type: 'bar' },
      colors: ['#2dd4bf', '#f59e0b'],
      dataLabels: { enabled: false },
      stroke: { show: false },
      series: [
        { name: 'Views', type: 'column', data: viewsBundle.actualPadded },
        {
          name: 'Forecast',
          type: 'column',
          data: viewsBundle.forecastSeries.map((p, idx) =>
            idx <= viewsBundle.liveIndex ? { ...p, y: null } : p
          )
        }
      ],
      plotOptions: {
        bar: {
          columnWidth: '58%',
          borderRadius: 6,
          rangeBarOverlap: false
        }
      },
      markers: { size: 0 },
      xaxis: {
        ...xAxisCommon,
        min: viewsBundle.rangeStart,
        max: viewsBundle.rangeEnd,
        tickAmount: viewsBundle.tickCount
      },
      yaxis: {
        labels: { formatter: (val: number) => `${Math.round(val)}` },
        crosshairs: { show: true, position: 'front', strokeDashArray: 3 }
      },
      tooltip: { theme: 'dark', shared: true, intersect: false, x: { format: 'dd MMM' } },
      legend: { show: false },
      grid: { strokeDashArray: 4 }
    });
    this.viewsChart.render();
  }

  private buildActualSeries(metric: 'votes' | 'views') {
    const value =
      metric === 'votes'
        ? this.selectedHotel?.totalVotes ?? 0
        : this.selectedHotel?.views ?? 0;
    const dayMs = 24 * 60 * 60 * 1000;
    const todayUtc = this.utcMidnightMs(new Date());
    const days = 28;
    const data: { x: number; y: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      data.push({ x: todayUtc - i * dayMs, y: value });
    }

    return data;
  }

  private buildForecastBundle(series: { x: number; y: number }[]) {
    if (!series.length) {
      const now = Date.now();
      return {
        actualPadded: [],
        forecastSeries: [],
        liveIndex: 0,
        rangeStart: now,
        rangeEnd: now,
        tickCount: 0
      };
    }

    const dayMs = 24 * 60 * 60 * 1000;
    const last = series[series.length - 1];
    const prev = series[Math.max(series.length - 2, 0)];
    const delta = last.y - prev.y;
    const dailyStep = delta === 0 ? 0 : delta * 0.6;

    const futurePoints: { x: number; y: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      futurePoints.push({
        x: last.x + i * dayMs,
        y: Math.max(0, Math.round(last.y + dailyStep * i))
      });
    }

    const actualPadded = [...series];
    const forecastSeries: { x: number; y: number | null }[] = [
      ...series.map((p, idx) => ({ x: p.x, y: idx === series.length - 1 ? p.y : null })),
      ...futurePoints
    ];

    const rangeStart = actualPadded[0]?.x;
    const rangeEnd = forecastSeries[forecastSeries.length - 1]?.x;
    const tickCount = forecastSeries.length;

    return {
      actualPadded,
      forecastSeries,
      liveIndex: series.length - 1,
      rangeStart,
      rangeEnd,
      tickCount
    };
  }

  private utcMidnightMs(date: Date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  private hashSeed(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
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
