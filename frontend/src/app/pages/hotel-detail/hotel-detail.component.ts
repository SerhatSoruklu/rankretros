import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hotel-detail.component.html',
  styleUrls: ['./hotel-detail.component.css']
})
export class HotelDetailComponent implements OnInit {
  hotel: any;
  loading = false;
  error = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
    const idOrSlug = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('slug');
    if (idOrSlug) {
      this.fetchHotel(idOrSlug);
    } else {
      this.error = 'No hotel specified.';
    }
  }

  private fetchHotel(id: string) {
    this.loading = true;
    this.api.getHotel(id).subscribe({
      next: (hotel) => {
        this.hotel = hotel;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to load hotel.';
        this.loading = false;
      }
    });
  }
}
