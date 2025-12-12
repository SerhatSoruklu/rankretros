import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HabboServerComponent } from '../../../servers/habbo-server/habbo-server.component';

@Component({
  selector: 'app-add-server',
  standalone: true,
  imports: [CommonModule, HabboServerComponent],
  templateUrl: './add-server.component.html',
  styleUrl: './add-server.component.css'
})
export class AddServerComponent {
  @Input() pool: 'pick' | 'habbo' | 'runescape' | 'minecraft' = 'pick';
  @Output() poolChange = new EventEmitter<'pick' | 'habbo' | 'runescape' | 'minecraft'>();
  @Output() hotelCreated = new EventEmitter<any>();

  get eyebrowLabel(): string {
    switch (this.pool) {
      case 'habbo':
        return 'HABBO HOTEL';
      case 'runescape':
        return 'RUNESCAPE';
      case 'minecraft':
        return 'MINECRAFT';
      default:
        return 'SERVERS';
    }
  }

  get headerTitle(): string {
    switch (this.pool) {
      case 'habbo':
        return 'Add a Habbo Hotel server';
      case 'runescape':
        return 'Add a RuneScape server';
      case 'minecraft':
        return 'Add a Minecraft server';
      default:
        return 'Add server';
    }
  }

  selectPool(pool: 'pick' | 'habbo' | 'runescape' | 'minecraft') {
    this.pool = pool;
    this.poolChange.emit(pool);
  }

  onHotelCreated(hotel: any) {
    this.hotelCreated.emit(hotel);
  }
}
