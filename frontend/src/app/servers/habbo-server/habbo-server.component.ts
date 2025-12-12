import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators, FormControl, FormGroup } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ApiService } from '../../services/api.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule, MatChipInput, MatChipInputEvent } from '@angular/material/chips';

@Component({
  selector: 'app-habbo-server',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './habbo-server.component.html',
  styleUrls: ['./habbo-server.component.css']
})
export class HabboServerComponent {
  @Output() hotelCreated = new EventEmitter<any>();
  error = '';
  success = '';
  loading = false;
  uploadingBanner = false;
  bannerUploadError = '';
  bannerInfo = '';
  bannerButtonLabel = 'Upload banner';
  pendingBannerFile: File | null = null;
  pendingBannerPreview = '';
  lastUploadedBannerUrl = '';
  readonly maxTags = 8;
  readonly maxTagLength = 12;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  tags: string[] = [];
  currentTag = '';
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
    tags: FormControl<string[]>;
  }>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiService
  ) {
    this.form = this.fb.nonNullable.group({
      name: this.fb.nonNullable.control('', Validators.required),
      slug: this.fb.nonNullable.control('', Validators.required),
      description: this.fb.nonNullable.control('', Validators.required),
      bannerUrl: this.fb.nonNullable.control('', Validators.required),
      callbackUrl: this.fb.nonNullable.control('', Validators.required),
      rewards: this.fb.nonNullable.group({
        credits: this.fb.nonNullable.control(0),
        diamonds: this.fb.nonNullable.control(0),
        duckets: this.fb.nonNullable.control(0)
      }),
      tags: this.fb.nonNullable.control<string[]>([])
    });
    this.updateBannerLabel();
  }

  private setUploading(state: boolean) {
    // Defer to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.uploadingBanner = state;
    }, 0);
  }

  private updateBannerLabel() {
    const nextLabel =
      this.pendingBannerPreview || this.bannerUrl ? 'Replace banner' : 'Upload banner';
    setTimeout(() => {
      this.bannerButtonLabel = nextLabel;
    }, 0);
  }

  get bannerUrl(): string {
    return this.form.controls.bannerUrl.value;
  }

  get bannerError(): string {
    if (this.bannerUploadError) return this.bannerUploadError;
    if (this.hasError('bannerUrl')) return 'Banner is required. Upload an image to continue.';
    return '';
  }

  submit() {
    this.error = '';
    this.success = '';
    this.bannerUploadError = '';

    const requiredControls: Array<'name' | 'slug' | 'callbackUrl' | 'description'> = [
      'name',
      'slug',
      'callbackUrl',
      'description'
    ];
    const otherInvalid = requiredControls.some((control) => this.hasError(control));
    const bannerReady = !!this.pendingBannerFile || !!this.bannerUrl;

    if (otherInvalid || !bannerReady) {
      this.form.markAllAsTouched();
      return;
    }

    const finalizeCreate = () => {
      this.loading = true;

      this.api.createHotel(this.form.getRawValue()).subscribe({
        next: (hotel) => {
          this.loading = false;
          this.success = 'Hotel created successfully.';
          this.hotelCreated.emit(hotel);
          this.pendingBannerFile = null;
          if (this.pendingBannerPreview) {
            URL.revokeObjectURL(this.pendingBannerPreview);
            this.pendingBannerPreview = '';
          }
          this.lastUploadedBannerUrl = '';
        },
        error: (err) => {
          this.loading = false;
          const rawMsg = err?.error?.message;
          if (!rawMsg || !/required/i.test(rawMsg)) {
            this.error = rawMsg || 'Failed to create hotel.';
          }
          if (this.lastUploadedBannerUrl) {
            this.api.deleteHabboBanner(this.lastUploadedBannerUrl).subscribe({
              next: () => {},
              error: () => {}
            });
          }
        }
      });
    };

    if (this.pendingBannerFile) {
      this.setUploading(true);
      this.api.uploadHabboBanner(this.pendingBannerFile).subscribe({
        next: (res) => {
          this.setUploading(false);
          this.lastUploadedBannerUrl = res.url;
          this.form.controls.bannerUrl.setValue(res.url);
          this.form.controls.bannerUrl.markAsDirty();
          this.form.controls.bannerUrl.markAsTouched();
          this.updateBannerLabel();
          finalizeCreate();
        },
        error: (err) => {
          this.setUploading(false);
          this.form.controls.bannerUrl.setValue('');
          this.form.controls.bannerUrl.markAsTouched();
          this.updateBannerLabel();
          this.bannerUploadError = err?.error?.message || 'Failed to upload banner.';
        }
      });
    } else {
      finalizeCreate();
    }
  }

  async onBannerSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.bannerUploadError = '';
    this.bannerInfo = '';
    if (this.pendingBannerPreview) {
      URL.revokeObjectURL(this.pendingBannerPreview);
    }
    this.pendingBannerFile = file;
    this.pendingBannerPreview = URL.createObjectURL(file);
    this.form.controls.bannerUrl.setValue('');
    this.updateBannerLabel();

    try {
      const info = await this.inspectImage(file);
      if (info) this.bannerInfo = info;
    } catch {
      // Non-blocking; still allow upload
    }
  }

  removeBanner() {
    this.bannerUploadError = '';
    if (this.pendingBannerPreview) {
      URL.revokeObjectURL(this.pendingBannerPreview);
    }
    this.pendingBannerFile = null;
    this.pendingBannerPreview = '';
    this.bannerInfo = '';
    this.form.controls.bannerUrl.setValue('');
    this.form.controls.bannerUrl.markAsDirty();
    this.form.controls.bannerUrl.markAsTouched();
    this.updateBannerLabel();
  }

  hasError(controlName: 'name' | 'slug' | 'bannerUrl' | 'callbackUrl' | 'description'): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (!value) {
      this.clearTagInput(event.chipInput);
      return;
    }

    if (value.length > this.maxTagLength) {
      this.clearTagInput(event.chipInput);
      return;
    }

    if (this.tags.length >= this.maxTags) {
      this.clearTagInput(event.chipInput);
      return;
    }

    if (!this.tags.includes(value)) {
      this.tags.push(value);
      this.form.controls.tags.setValue(this.tags);
      this.form.controls.tags.markAsDirty();
    }

    this.clearTagInput(event.chipInput);
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag);
    if (index >= 0) {
      this.tags.splice(index, 1);
      this.form.controls.tags.setValue(this.tags);
      this.form.controls.tags.markAsDirty();
    }
  }

  private clearTagInput(chipInput?: MatChipInput | null) {
    chipInput?.clear();
    this.currentTag = '';
  }

  private inspectImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(url);
        const ratio = width / height;
        const recommendedRatio = 500 / 75; // ~6.67:1
        const ratioOff = Math.abs(ratio - recommendedRatio) > 0.3;
        const sizeOff = width < 500 || height < 75;

        if (ratioOff || sizeOff) {
          const parts = [];
          if (sizeOff) parts.push(`Current size: ${width}x${height}px (recommend at least 500x75).`);
          if (ratioOff) parts.push(`Aspect looks off ${ratio.toFixed(2)}:1 (target ~6.7:1).`);
          resolve(parts.join(' '));
        } else {
          resolve('Looks good. Target size 500x75 (~6.7:1), animated GIFs supported.');
        }
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }
}
