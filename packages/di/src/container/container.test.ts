import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from './container';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('registerSingleton', () => {
    it('should register and resolve a singleton', () => {
      const token = 'test-service';
      container.registerSingleton(token, () => 'hello');

      const result = container.resolve(token);
      expect(result).toBe('hello');
    });

    it('should return the same instance for singletons', () => {
      const token = Symbol('counter');
      let count = 0;
      container.registerSingleton(token, () => ({ value: ++count }));

      const first = container.resolve(token);
      const second = container.resolve(token);

      expect(first).toBe(second);
      expect(first.value).toBe(1);
    });
  });

  describe('registerTransient', () => {
    it('should create new instances for transients', () => {
      const token = 'transient-service';
      let id = 0;
      container.registerTransient(token, () => ({ id: ++id }));

      const first = container.resolve(token);
      const second = container.resolve(token);

      expect(first).not.toBe(second);
      expect(first.id).toBe(1);
      expect(second.id).toBe(2);
    });
  });

  describe('registerValue', () => {
    it('should register and resolve a value', () => {
      const token = 'value-service';
      container.registerValue(token, 42);

      const result = container.resolve(token);
      expect(result).toBe(42);
    });
  });

  describe('resolve', () => {
    it('should throw for unregistered services', () => {
      const token = 'unknown-service';
      expect(() => container.resolve(token)).toThrow('Service not found');
    });
  });

  describe('createScope', () => {
    it('should create a scoped container that inherits registrations', () => {
      const token = 'inherited-service';
      container.registerSingleton(token, () => 'parent');

      const scoped = container.createScope();
      const result = scoped.resolve(token);

      expect(result).toBe('parent');
    });

    it('should allow scoped registrations that override parent', () => {
      const token = 'override-service';
      container.registerSingleton(token, () => 'parent');

      const scoped = container.createScope();
      scoped.registerSingleton(token, () => 'child');

      expect(container.resolve(token)).toBe('parent');
      expect(scoped.resolve(token)).toBe('child');
    });
  });

  describe('has', () => {
    it('should return true for registered services', () => {
      const token = 'exists-service';
      container.registerValue(token, 'value');

      expect(container.has(token)).toBe(true);
    });

    it('should return false for unregistered services', () => {
      const token = 'missing-service';
      expect(container.has(token)).toBe(false);
    });
  });

  describe('registerClass', () => {
    it('should register and resolve a class', () => {
      class TestService {
        getValue() {
          return 'test-value';
        }
      }

      container.registerClass(TestService);
      const instance = container.resolve(TestService);

      expect(instance).toBeInstanceOf(TestService);
      expect(instance.getValue()).toBe('test-value');
    });
  });
});
