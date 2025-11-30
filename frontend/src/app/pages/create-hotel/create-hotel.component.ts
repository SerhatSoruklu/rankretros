import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl, FormGroup } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-create-hotel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-hotel.component.html',
  styleUrls: ['./create-hotel.component.css']
})
export class CreateHotelComponent {
  @Output() hotelCreated = new EventEmitter<any>();
  error = '';
  success = '';
  loading = false;
  form: FormGroup<{
    name: FormControl<string>;
    slug: FormControl<string>;
    description: FormControl<string>;
    bannerUrl: FormControl<string>;
    callbackUrl: FormControl<string>;
    rewards: FormGroup<{
      credits: FormControl<number>;
      diamonds: FormControl<number>;
      duckets: FormControl<number>;
    }>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', Validators.required),
      slug: this.fb.nonNullable.control('', Validators.required),
      description: this.fb.nonNullable.control(''),
      bannerUrl: this.fb.nonNullable.control(''),
      callbackUrl: this.fb.nonNullable.control('', Validators.required),
      rewards: this.fb.nonNullable.group({
        credits: this.fb.nonNullable.control(0),
        diamonds: this.fb.nonNullable.control(0),
        duckets: this.fb.nonNullable.control(0)
      })
    });
  }

  submit() {
    if (this.form.invalid) {
      this.error = 'Please fill required fields (name, slug, callback URL).';
      return;
    }

    this.error = '';
    this.success = '';
    this.loading = true;

    this.api.createHotel(this.form.getRawValue()).subscribe({
      next: (hotel) => {
        this.loading = false;
        this.success = 'Hotel created successfully.';
        this.hotelCreated.emit(hotel);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to create hotel.';
      }
    });
  }
}
