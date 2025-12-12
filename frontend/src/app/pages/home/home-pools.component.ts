import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Pool = 'habbo' | 'runescape' | 'minecraft';
type SortOption = 'votes' | 'views' | 'viewsAsc' | 'votesAsc';

@Component({
  selector: 'app-home-pools',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-pools.component.html',
  styleUrls: ['./home-pools.component.css']
})
export class HomePoolsComponent {
  @Input() hotels: any[] = [];
  @Input() selectedPool: Pool = 'habbo';
  @Input() sortOption: SortOption = 'votes';
  @Input() loading = false;
  @Input() error = '';
  @Output() poolChange = new EventEmitter<Pool>();
  @Output() sortChange = new EventEmitter<SortOption>();

  selectPool(pool: Pool) {
    this.selectedPool = pool;
    this.poolChange.emit(pool);
  }

  onSortChange(option: SortOption) {
    this.sortOption = option;
    this.sortChange.emit(option);
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

  getSortLabel(option: SortOption): string {
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
}
