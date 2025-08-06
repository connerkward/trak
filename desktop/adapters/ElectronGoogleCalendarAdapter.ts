import { IGoogleCalendarService, Calendar, CalendarEvent, AuthTokens } from '../../src/shared/types';
import { GoogleCalendarService as ElectronGoogleCalendarService } from '../googleCalendarService';

export class ElectronGoogleCalendarAdapter implements IGoogleCalendarService {
  private electronService: ElectronGoogleCalendarService;

  constructor() {
    this.electronService = new ElectronGoogleCalendarService();
  }

  isAuthenticated(): boolean {
    return this.electronService.isAuthenticated();
  }

  getCurrentUserId(): string | null {
    return this.electronService.getCurrentUserId();
  }

  getAuthUrl(): string {
    return this.electronService.getAuthUrl();
  }

  async authenticate(authCode?: string): Promise<{ success: boolean; authUrl?: string; error?: string }> {
    return this.electronService.authenticate(authCode);
  }

  async logout(): Promise<void> {
    return this.electronService.logout();
  }

  async setAuthCode(authCode: string): Promise<boolean> {
    return this.electronService.setAuthCode(authCode);
  }

  async getCalendars(): Promise<Calendar[]> {
    return this.electronService.getCalendars();
  }

  async createEvent(event: CalendarEvent): Promise<boolean> {
    return this.electronService.createEvent(event);
  }

  setCurrentUser(userId: string | null): void {
    this.electronService.setCurrentUser(userId);
  }
} 