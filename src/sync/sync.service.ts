import { Injectable } from '@nestjs/common';
import { SyncActions } from 'src/constants';
import { Room } from './sync.interfaces';

@Injectable()
export class SyncActionProcessor {
  processAction(
    room: Room,
    action: SyncActions,
    value?: number,
  ): { updated: boolean; error?: string } {
    switch (action) {
      case SyncActions.PLAY:
        room.syncState.isPlaying = true;
        return { updated: true };
      case SyncActions.PAUSE:
        room.syncState.isPlaying = false;
        return { updated: true };
      case SyncActions.SEEK:
        if (typeof value === 'number' && value >= 0) {
          room.syncState.time = value;
          return { updated: true };
        } else {
          return { updated: false, error: 'Invalid seek value' };
        }
      default:
        return { updated: false, error: 'Unhandled action' };
    }
  }
}
