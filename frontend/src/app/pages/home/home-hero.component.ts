import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home-hero.component.html',
  styleUrls: ['./home-hero.component.css']
})
export class HomeHeroComponent {
  @Input() isAuthed = false;
  @Input() chartSeries: { label: string; value: number }[] = [];
  @Input() chartWidth = 320;
  @Input() chartHeight = 180;
  @Input() chartAreaPoints = '';
  @Input() chartLinePoints = '';
  @Input() predictedLinePoints = '';
  @Input() chartPoints: any[] = [];
  @Input() crosshairPercent = 0;
}
