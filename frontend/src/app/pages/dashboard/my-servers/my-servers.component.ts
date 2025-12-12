import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule, MatChipInput, MatChipInputEvent } from '@angular/material/chips';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-my-servers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './my-servers.component.html',
  styleUrl: './my-servers.component.css'
})
export class MyServersComponent implements OnInit, OnDestroy {
  @Input() hotels: any[] = [];
  @Input() editingId: string | null = null;
  @Input() editingModel: any = {};
  @Input() selectedHotel: any | null = null;
  @Input() loading = false;
  @Input() error = '';

  @Output() startEdit = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() saveEdit = new EventEmitter<any>();
  @Output() deleteHotel = new EventEmitter<any>();
  @Output() selectHotelForView = new EventEmitter<any>();

  private nowTimer: any;
  private nowMs = Date.now();
  bannerMeta: Record<string, string> = {};
  editingBannerFile: File | null = null;
  editingBannerPreview = '';
  editingBannerInfo = '';
  editingBannerError = '';
  uploadingBanner = false;
  readonly maxTags = 8;
  readonly maxTagLength = 12;
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  editingTags: string[] = [];
  currentEditingTag = '';

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly api: ApiService
  ) {}

  ngOnInit(): void {
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

  onStartEdit(hotel: any) {
    this.editingBannerFile = null;
    this.editingBannerPreview = hotel.bannerUrl || '';
    this.editingBannerInfo = this.bannerMeta[hotel._id || hotel.id] || '';
    this.editingBannerError = '';
    this.editingTags = Array.isArray(hotel.tags) ? [...hotel.tags] : [];
    this.startEdit.emit(hotel);
  }

  onCancelEdit() {
    if (this.editingBannerPreview && this.editingBannerFile) {
      URL.revokeObjectURL(this.editingBannerPreview);
    }
    this.editingBannerFile = null;
    this.editingBannerPreview = '';
    this.editingBannerInfo = '';
    this.editingBannerError = '';
    this.editingTags = [];
    this.currentEditingTag = '';
    this.cancelEdit.emit();
  }

  onSaveEdit(hotel: any, form?: any) {
    if (form?.invalid) {
      Object.values(form.controls || {}).forEach((control: any) => control?.markAsTouched?.());
      return;
    }

    if (!this.editingModel.bannerUrl && !this.editingBannerFile) {
      this.editingBannerError = 'Banner is required. Upload an image to continue.';
      return;
    }

    this.editingModel.tags = this.editingTags;
    const previousBanner = hotel.bannerUrl || '';

    if (this.editingBannerFile) {
      this.uploadingBanner = true;
      this.api.uploadHabboBanner(this.editingBannerFile).subscribe({
        next: (res) => {
          this.uploadingBanner = false;
          this.editingModel.bannerUrl = res.url;
          this.saveEdit.emit({ hotel, newBannerKey: res.key, previousBanner });
        },
        error: (err) => {
          this.uploadingBanner = false;
          this.editingBannerError = err?.error?.message || 'Failed to upload banner.';
        }
      });
    } else {
      this.saveEdit.emit({ hotel, previousBanner });
    }
  }

  onDeleteHotel(hotel: any) {
    this.deleteHotel.emit(hotel);
  }

  onSelectHotelForView(hotel: any) {
    this.selectHotelForView.emit(hotel);
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

    if (hotel?.collection === 'habboservers') return 'habbo';

    return 'habbo';
  }

  getServerIcon(hotel: any) {
    const type = this.getServerType(hotel);
    if (type === 'runescape') return '/game-icons/runescape-icon.png';
    if (type === 'minecraft') return '/game-icons/minecraft-icon.png';
    return '/game-icons/habbo-icon.png';
  }

  getServerLabel(hotel: any) {
    const type = this.getServerType(hotel);
    if (type === 'runescape') return 'RuneScape';
    if (type === 'minecraft') return 'Minecraft';
    return 'Habbo Hotel';
  }

  getServerTypeClass(hotel: any) {
    return this.getServerType(hotel);
  }

  setBannerMeta(hotel: any, width: number, height: number) {
    const ratio = width / height;
    const recommendedRatio = 500 / 75;
    const ratioOff = Math.abs(ratio - recommendedRatio) > 0.3;
    const sizeOff = width < 500 || height < 75;

    if (ratioOff || sizeOff) {
      const parts = [];
      if (sizeOff) parts.push(`Current size: ${width}x${height}px (recommend at least 500x75).`);
      if (ratioOff) parts.push(`Aspect looks off ${ratio.toFixed(2)}:1 (target ~6.7:1).`);
      this.bannerMeta[hotel._id || hotel.id] = parts.join(' ');
    } else {
      this.bannerMeta[hotel._id || hotel.id] = 'Looks good. Target size 500x75 (~6.7:1), animated GIFs supported.';
    }
  }

  onBannerLoad(hotel: any, event: Event) {
    const img = event.target as HTMLImageElement;
    if (img?.naturalWidth && img?.naturalHeight) {
      this.setBannerMeta(hotel, img.naturalWidth, img.naturalHeight);
    }
  }

  async onEditingBannerSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.editingBannerError = '';
    if (this.editingBannerPreview && this.editingBannerFile) {
      URL.revokeObjectURL(this.editingBannerPreview);
    }

    this.editingBannerFile = file;
    this.editingBannerPreview = URL.createObjectURL(file);

    try {
      const info = await this.inspectImage(file);
      if (info) this.editingBannerInfo = info;
    } catch {
      // non-blocking
    }
  }

  removeEditingBanner() {
    this.editingBannerError = '';
    if (this.editingBannerPreview && this.editingBannerFile) {
      URL.revokeObjectURL(this.editingBannerPreview);
    }
    this.editingBannerFile = null;
    this.editingBannerPreview = '';
    this.editingBannerInfo = '';
    this.editingModel.bannerUrl = '';
  }

  addEditingTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (!value) {
      this.clearEditingTagInput(event.chipInput);
      return;
    }

    if (value.length > this.maxTagLength) {
      this.clearEditingTagInput(event.chipInput);
      return;
    }

    if (this.editingTags.length >= this.maxTags) {
      this.clearEditingTagInput(event.chipInput);
      return;
    }

    if (!this.editingTags.includes(value)) {
      this.editingTags.push(value);
    }

    this.clearEditingTagInput(event.chipInput);
  }

  removeEditingTag(tag: string): void {
    const index = this.editingTags.indexOf(tag);
    if (index >= 0) {
      this.editingTags.splice(index, 1);
    }
  }

  private clearEditingTagInput(chipInput?: MatChipInput | null) {
    chipInput?.clear();
    this.currentEditingTag = '';
  }

  private inspectImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(url);
        const ratio = width / height;
        const recommendedRatio = 500 / 75;
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
