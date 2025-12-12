import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HomeHeroComponent } from './home-hero.component';
import { HomePoolsComponent } from './home-pools.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HomeHeroComponent, HomePoolsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  hotels: any[] = [];
  loading = false;
  error = '';
  selectedPool: 'habbo' | 'runescape' | 'minecraft' = 'habbo';
  sortOption: 'votes' | 'views' | 'viewsAsc' | 'votesAsc' = 'votes';
  chartSeries: { label: string; value: number }[] = [];
  private forecastCache: { label: string; value: number }[] = [];
  private totalVotes = 0;
  readonly chartWidth = 320;
  readonly chartHeight = 180;
  private readonly chartPad = 14;
  get isAuthed() {
    return !!this.auth.user;
  }

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchHotels();
  }

  selectPool(pool: 'habbo' | 'runescape' | 'minecraft') {
    this.selectedPool = pool;
  }

  onSortChange(option: 'votes' | 'views' | 'viewsAsc' | 'votesAsc') {
    this.sortOption = option;
  }

  get displayedHabbo() {
    const list = [...this.hotels];
    switch (this.sortOption) {
      case 'votes':
        return list.sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0));
      case 'votesAsc':
        return list.sort((a, b) => (a.totalVotes || 0) - (b.totalVotes || 0));
      case 'views':
        return list.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'viewsAsc':
        return list.sort((a, b) => (a.views || 0) - (b.views || 0));
      default:
        return list;
    }
  }

  getSortLabel(option: string): string {
    switch (option) {
      case 'votes':
        return 'Top votes';
      case 'views':
        return 'Top views';
      case 'votesAsc':
        return 'Least votes';
      case 'viewsAsc':
        return 'Least views';
      default:
        return 'Top votes';
    }
  }

  get liveRanking() {
    return [...this.hotels]
      .sort((a, b) => (b.totalVotes || 0) - (a.totalVotes || 0))
      .slice(0, 3);
  }

  private buildChartSeries(totalVotes: number): { label: string; value: number }[] {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (totalVotes <= 0) {
      return labels.map((label) => ({ label, value: 0 }));
    }

    // Cumulative 7-day curve so the last point is the real total from the DB.
    return labels.map((label, idx) => {
      const fraction = (idx + 1) / labels.length;
      return {
        label,
        value: Math.round(totalVotes * fraction)
      };
    });
  }

  private forecastSeries(): { label: string; value: number }[] {
    if (!this.chartSeries.length) return [];
    const last = this.chartSeries[this.chartSeries.length - 1].value;
    const avgDaily = this.totalVotes > 0 ? Math.max(1, Math.round(this.totalVotes / this.chartSeries.length)) : 0;
    this.forecastCache = Array.from({ length: 3 }).map((_, idx) => ({
      label: `Day +${idx + 1}`,
      value: last + avgDaily * (idx + 1)
    }));
    return this.forecastCache;
  }

  private fetchHotels() {
    this.loading = true;
    this.error = '';
    this.api.getHotels().subscribe({
      next: (data) => {
        this.hotels = data;
        this.selectPool('habbo'); // ensure default pool shows data immediately
        this.totalVotes = this.hotels.reduce((sum, h) => sum + (h.totalVotes || 0), 0);
        this.chartSeries = this.buildChartSeries(this.totalVotes);
        this.loading = false;
        setTimeout(() => this.cdr.detectChanges(), 0);
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load servers.';
        this.loading = false;
      }
    });
  }

  private computePoints(
    series: { label: string; value: number }[],
    offset: number,
    totalPoints: number
  ): {
    label: string;
    value: number;
    x: number;
    y: number;
    xPercent: number;
    yPercent: number;
    latest?: boolean;
  }[] {
    if (!series.length) return [];
    const max = Math.max(...this.chartSeries.map((p) => p.value), ...series.map((p) => p.value), 1);
    const step = totalPoints > 1 ? this.chartWidth / (totalPoints - 1) : 0;
    const usableHeight = this.chartHeight - this.chartPad * 2;

    return series.map((point, idx) => {
      const x = (idx + offset) * step;
      const y = this.chartHeight - this.chartPad - (point.value / max) * usableHeight;
      return {
        ...point,
        x,
        y,
        xPercent: (x / this.chartWidth) * 100,
        yPercent: (y / this.chartHeight) * 100
      };
    });
  }

  get chartPoints() {
    const totalPoints = this.chartSeries.length + this.forecastSeries().length;
    const points = this.computePoints(this.chartSeries, 0, totalPoints);
    if (points.length) {
      points[points.length - 1] = { ...points[points.length - 1], latest: true };
    }
    return points;
  }

  get forecastPoints() {
    const forecast = this.forecastSeries();
    const totalPoints = this.chartSeries.length + forecast.length;
    return this.computePoints(forecast, this.chartSeries.length, totalPoints);
  }

  get chartLinePoints(): string {
    return this.chartPoints.map((p) => `${p.x},${p.y}`).join(' ');
  }

  get predictedLinePoints(): string {
    if (!this.chartSeries.length) return '';
    const pts = [...this.chartPoints, ...this.forecastPoints];
    return pts.map((p) => `${p.x},${p.y}`).join(' ');
  }

  get chartAreaPoints(): string {
    const baseY = this.chartHeight - this.chartPad;
    return `0,${baseY} ${this.chartLinePoints} ${this.chartWidth},${baseY}`;
  }

  get crosshairPercent(): number {
    if (!this.chartPoints.length) return 0;
    const last = this.chartPoints[this.chartPoints.length - 1];
    return (last.x / this.chartWidth) * 100;
  }
}
