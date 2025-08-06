import { SharedTimerService } from '../src/shared/TimerService';
import { ElectronStorageAdapter } from './adapters/ElectronStorageAdapter';
import { ElectronGoogleCalendarAdapter } from './adapters/ElectronGoogleCalendarAdapter';

export class TimerService extends SharedTimerService {
  constructor() {
    const storage = new ElectronStorageAdapter();
    const googleCalendarService = new ElectronGoogleCalendarAdapter();
    super(storage, googleCalendarService);
  }
}