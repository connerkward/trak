/**
 * Bootstrap file for dependency injection setup
 * This sets up all services and their dependencies
 */

import { EventEmitter } from 'events';
import { serviceContainer, SERVICE_TOKENS } from './utils/ServiceContainer';
import { GoogleCalendarServiceSimple } from './services/GoogleCalendarService';
import { TimerService } from './services/timerService';

/**
 * Configure and register all services with the DI container
 */
export function bootstrapServices(): void {
  console.log('Bootstrapping services...');

  // Register storage services
  serviceContainer.registerSingleton(
    SERVICE_TOKENS.StorageService,
    () => new SimpleStore({ name: 'dingo-track' })
  );

  // Register event emitter for OAuth communication
  serviceContainer.registerSingleton(
    SERVICE_TOKENS.EventEmitter,
    () => new EventEmitter()
  );

  // Register Google Calendar service
  serviceContainer.registerSingleton(
    SERVICE_TOKENS.GoogleCalendarService,
    () => {
      const service = new GoogleCalendarServiceSimple();
      
      // Set up auth success callback to propagate user ID to timer service
      service.setAuthSuccessCallback(() => {
        console.log('🔔 Auth success callback fired in bootstrap');
        const userId = service.getCurrentUserId();
        if (userId) {
          console.log('🔔 Propagating userId to TimerService:', userId);
          const timerService = serviceContainer.get<TimerService>(SERVICE_TOKENS.TimerService);
          timerService.setCurrentUser(userId);
        }
        
        const eventEmitter = serviceContainer.get<EventEmitter>(SERVICE_TOKENS.EventEmitter);
        eventEmitter.emit('oauth-success');
      });
      
      return service;
    }
  );

  // Register timer service with injected GoogleCalendarService
  serviceContainer.registerSingleton(
    SERVICE_TOKENS.TimerService,
    () => {
      const googleCalendarService = serviceContainer.get<GoogleCalendarServiceSimple>(SERVICE_TOKENS.GoogleCalendarService);
      const service = new TimerService(googleCalendarService);
      service.initialize();
      return service;
    }
  );

  // Set up global OAuth event emitter for backward compatibility
  const oauthEmitter = serviceContainer.get<EventEmitter>(SERVICE_TOKENS.EventEmitter);
  (global as any).oauthEmitter = oauthEmitter;

  console.log('Services bootstrapped successfully');
}

/**
 * Initialize authenticated user context across services
 */
export async function initializeUserContext(isDev: boolean = false): Promise<void> {
  const googleCalendarService = serviceContainer.get<GoogleCalendarServiceSimple>(SERVICE_TOKENS.GoogleCalendarService);
  const timerService = serviceContainer.get<TimerService>(SERVICE_TOKENS.TimerService);

  if (googleCalendarService.isAuthenticated()) {
    try {
      // Get the actual user ID (hash of calendar data, no personal info)
      const userId = await googleCalendarService.getUserId();
      console.log('User authenticated, setting current user to:', userId);
      googleCalendarService.setCurrentUser(userId);
      timerService.setCurrentUser(userId);
    } catch (error) {
      console.error('Error getting user info during initialization:', error);
      // Fallback to stored user ID if available
      const storedUserId = googleCalendarService.getCurrentUserId();
      if (storedUserId) {
        console.log('Using stored user ID:', storedUserId);
        timerService.setCurrentUser(storedUserId);
      }
    }
  } else {
    // In development mode, set up a default user for testing
    if (isDev) {
      console.log('Development mode: setting up default user');
      googleCalendarService.setCurrentUser('dev-user');
      timerService.setCurrentUser('dev-user');
    }
  }
}

/**
 * Set up event listeners for OAuth flow
 */
export function setupOAuthEventListeners(): void {
  const oauthEmitter = serviceContainer.get<EventEmitter>(SERVICE_TOKENS.EventEmitter);
  const googleCalendarService = serviceContainer.get<GoogleCalendarServiceSimple>(SERVICE_TOKENS.GoogleCalendarService);
  const timerService = serviceContainer.get<TimerService>(SERVICE_TOKENS.TimerService);

  oauthEmitter.on('oauth-completed', async (data: any) => {
    console.log('OAuth completed - notifying all windows', data);
    
    try {
      const userId = googleCalendarService.getCurrentUserId();
      if (userId) {
        console.log('Setting current user:', userId);
        googleCalendarService.setCurrentUser(userId);
        timerService.setCurrentUser(userId);
      }
    } catch (error) {
      console.error('Error getting user ID:', error);
    }
  });
}

/**
 * Cleanup services on app shutdown
 */
export function cleanupServices(): void {
  console.log('Cleaning up services...');
  
  try {
    const timerService = serviceContainer.get<TimerService>(SERVICE_TOKENS.TimerService);
    timerService.cleanup();
  } catch (error) {
    console.error('Error cleaning up timer service:', error);
  }
  
  console.log('Services cleaned up');
}