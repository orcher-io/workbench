import type { Disposable } from '@orcher/workbench-plugin-api';

type EventHandler<T = unknown> = (data: T) => void;

interface EventSubscription {
  handler: EventHandler;
  once: boolean;
}

/**
 * Global event bus for decoupled plugin communication
 */
export class EventBus {
  private handlers = new Map<string, Set<EventSubscription>>();

  /**
   * Emit an event to all listeners
   */
  emit<T>(event: string, data: T): void {
    const subscriptions = this.handlers.get(event);
    if (!subscriptions) return;

    const toRemove: EventSubscription[] = [];

    for (const subscription of subscriptions) {
      try {
        subscription.handler(data);
        if (subscription.once) {
          toRemove.push(subscription);
        }
      } catch (error) {
        console.error(`Error in event handler for "${event}":`, error);
      }
    }

    // Remove one-time handlers
    for (const sub of toRemove) {
      subscriptions.delete(sub);
    }
  }

  /**
   * Subscribe to an event
   */
  on<T>(event: string, handler: EventHandler<T>): Disposable {
    return this.subscribe(event, handler, false);
  }

  /**
   * Subscribe to an event once
   */
  once<T>(event: string, handler: EventHandler<T>): Disposable {
    return this.subscribe(event, handler, true);
  }

  /**
   * Remove all handlers for an event
   */
  off(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }

  private subscribe<T>(event: string, handler: EventHandler<T>, once: boolean): Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const subscription: EventSubscription = { handler: handler as EventHandler, once };
    this.handlers.get(event)!.add(subscription);

    return {
      dispose: () => {
        const subs = this.handlers.get(event);
        if (subs) {
          subs.delete(subscription);
          if (subs.size === 0) {
            this.handlers.delete(event);
          }
        }
      },
    };
  }
}

/**
 * Create a typed event emitter function
 */
export function createEvent<T>(): {
  event: (listener: (e: T) => void) => Disposable;
  fire: (data: T) => void;
} {
  const listeners = new Set<(e: T) => void>();

  return {
    event: (listener) => {
      listeners.add(listener);
      return {
        dispose: () => listeners.delete(listener),
      };
    },
    fire: (data) => {
      for (const listener of listeners) {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      }
    },
  };
}
