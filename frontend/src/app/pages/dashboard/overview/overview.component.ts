import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import ApexCharts from 'apexcharts';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css'
})
export class OverviewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() selectedHotel: any | null = null;
  @ViewChild('votesChart') votesChartRef!: ElementRef;
  @ViewChild('viewsChart') viewsChartRef!: ElementRef;

  private votesChart?: ApexCharts;
  private viewsChart?: ApexCharts;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.renderChartsDeferred();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedHotel']) {
      this.renderChartsDeferred();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
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
    if (!this.selectedHotel) {
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
}
