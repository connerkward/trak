/**
 * Dependency injection container for services
 * Follows the service locator pattern with type safety
 */

export type ServiceFactory<T = unknown> = () => T;
export type ServiceInstance<T = unknown> = T;

export interface ServiceDefinition<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: ServiceInstance<T>;
}

export class ServiceContainer {
  private services = new Map<symbol, ServiceDefinition>();
  
  /**
   * Register a service with the container
   */
  register<T>(
    token: symbol, 
    factory: ServiceFactory<T>, 
    options: { singleton?: boolean } = {}
  ): void {
    this.services.set(token, {
      factory,
      singleton: options.singleton ?? true,
      instance: undefined
    });
  }
  
  /**
   * Register a singleton service (convenience method)
   */
  registerSingleton<T>(token: symbol, factory: ServiceFactory<T>): void {
    this.register(token, factory, { singleton: true });
  }
  
  /**
   * Register a transient service (convenience method)
   */
  registerTransient<T>(token: symbol, factory: ServiceFactory<T>): void {
    this.register(token, factory, { singleton: false });
  }
  
  /**
   * Get a service instance
   */
  get<T>(token: symbol): T {
    const service = this.services.get(token);
    
    if (!service) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }
    
    if (service.singleton) {
      if (!service.instance) {
        service.instance = service.factory();
      }
      return service.instance as T;
    }
    
    // Return new instance for transient services
    return service.factory() as T;
  }
  
  /**
   * Check if a service is registered
   */
  has(token: symbol): boolean {
    return this.services.has(token);
  }
  
  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }
  
  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): symbol[] {
    return Array.from(this.services.keys());
  }
}

// Service tokens - these are the "contracts" for our services
export const SERVICE_TOKENS = {
  StorageService: Symbol('StorageService'),
  GoogleCalendarService: Symbol('GoogleCalendarService'),
  TimerService: Symbol('TimerService'),
  EventEmitter: Symbol('EventEmitter')
} as const;

// Global container instance
export const serviceContainer = new ServiceContainer();