import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceContainer, SERVICE_TOKENS } from './ServiceContainer';

describe('ServiceContainer', () => {
  let container: ServiceContainer;
  const testToken = Symbol('TestService');

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('register', () => {
    it('registers a singleton service by default', () => {
      const factory = vi.fn(() => ({ value: 'test' }));
      
      container.register(testToken, factory);
      
      const instance1 = container.get(testToken);
      const instance2 = container.get(testToken);
      
      expect(factory).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });

    it('registers a transient service when specified', () => {
      const factory = vi.fn(() => ({ value: Math.random() }));
      
      container.register(testToken, factory, { singleton: false });
      
      const instance1 = container.get(testToken);
      const instance2 = container.get(testToken);
      
      expect(factory).toHaveBeenCalledTimes(2);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('registerSingleton', () => {
    it('registers a singleton service', () => {
      const factory = vi.fn(() => ({ value: 'singleton' }));
      
      container.registerSingleton(testToken, factory);
      
      const instance1 = container.get(testToken);
      const instance2 = container.get(testToken);
      
      expect(factory).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerTransient', () => {
    it('registers a transient service', () => {
      const factory = vi.fn(() => ({ value: Math.random() }));
      
      container.registerTransient(testToken, factory);
      
      const instance1 = container.get(testToken);
      const instance2 = container.get(testToken);
      
      expect(factory).toHaveBeenCalledTimes(2);
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('get', () => {
    it('throws error for unregistered service', () => {
      expect(() => container.get(testToken)).toThrow('Service not registered');
    });

    it('returns service instance', () => {
      const expectedValue = { value: 'test' };
      container.register(testToken, () => expectedValue);
      
      const instance = container.get(testToken);
      
      expect(instance).toBe(expectedValue);
    });
  });

  describe('has', () => {
    it('returns true for registered service', () => {
      container.register(testToken, () => ({}));
      
      expect(container.has(testToken)).toBe(true);
    });

    it('returns false for unregistered service', () => {
      expect(container.has(testToken)).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all registered services', () => {
      container.register(testToken, () => ({}));
      container.clear();
      
      expect(container.has(testToken)).toBe(false);
    });
  });

  describe('getRegisteredTokens', () => {
    it('returns all registered tokens', () => {
      const token1 = Symbol('Service1');
      const token2 = Symbol('Service2');
      
      container.register(token1, () => ({}));
      container.register(token2, () => ({}));
      
      const tokens = container.getRegisteredTokens();
      
      expect(tokens).toContain(token1);
      expect(tokens).toContain(token2);
      expect(tokens).toHaveLength(2);
    });

    it('returns empty array when no services registered', () => {
      const tokens = container.getRegisteredTokens();
      
      expect(tokens).toEqual([]);
    });
  });

  describe('SERVICE_TOKENS', () => {
    it('defines expected service tokens', () => {
      expect(SERVICE_TOKENS.StorageService).toBeDefined();
      expect(SERVICE_TOKENS.GoogleCalendarService).toBeDefined();
      expect(SERVICE_TOKENS.TimerService).toBeDefined();
      expect(SERVICE_TOKENS.EventEmitter).toBeDefined();
    });

    it('tokens are unique symbols', () => {
      const tokens = Object.values(SERVICE_TOKENS);
      const uniqueTokens = [...new Set(tokens)];
      
      expect(tokens).toHaveLength(uniqueTokens.length);
    });
  });
});