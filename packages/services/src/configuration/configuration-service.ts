import type {
  ConfigurationContribution,
  IConfigurationExtensionPoint,
  ConfigurationScope,
  Disposable,
} from '@orcher/workbench-plugin-api';
import { createEvent } from '../events';

interface ConfigurationChangeEvent {
  key: string;
  value: unknown;
  scope: ConfigurationScope;
}

interface RegisteredConfiguration {
  contribution: ConfigurationContribution;
  pluginId: string;
}

/**
 * Configuration service - manages application settings
 */
export class ConfigurationService implements IConfigurationExtensionPoint {
  private configurations = new Map<string, RegisteredConfiguration>();
  private values = new Map<string, unknown>();
  private readonly storageKey = 'workbench:configuration';

  private readonly onDidChangeConfiguration =
    createEvent<ConfigurationChangeEvent>();
  readonly onConfigurationChanged = this.onDidChangeConfiguration.event;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register a configuration contribution
   */
  registerContribution(
    contribution: ConfigurationContribution,
    pluginId: string,
  ): void {
    this.configurations.set(contribution.id, {
      contribution,
      pluginId,
    });

    // Initialize defaults for any unset values
    for (const [key, prop] of Object.entries(contribution.properties)) {
      const fullKey = `${contribution.id}.${key}`;
      if (!this.values.has(fullKey) && prop.default !== undefined) {
        this.values.set(fullKey, prop.default);
      }
    }
  }

  /**
   * Get a configuration value
   */
  get<T>(key: string, defaultValue?: T): T {
    if (this.values.has(key)) {
      return this.values.get(key) as T;
    }

    // Look up default from schema
    const schemaDefault = this.getSchemaDefault(key);
    if (schemaDefault !== undefined) {
      return schemaDefault as T;
    }

    return defaultValue as T;
  }

  /**
   * Set a configuration value
   */
  async set(
    key: string,
    value: unknown,
    scope: ConfigurationScope = 'application',
  ): Promise<void> {
    const oldValue = this.values.get(key);

    if (oldValue === value) {
      return; // No change
    }

    this.values.set(key, value);
    this.saveToStorage();

    this.onDidChangeConfiguration.fire({ key, value, scope });
  }

  /**
   * Listen for configuration changes
   */
  onDidChange(key: string, listener: (value: unknown) => void): Disposable {
    return this.onConfigurationChanged((event) => {
      if (event.key === key || event.key.startsWith(key + '.')) {
        listener(event.value);
      }
    });
  }

  /**
   * Get all configuration sections
   */
  getSections(): ConfigurationContribution[] {
    return Array.from(this.configurations.values()).map((c) => c.contribution);
  }

  /**
   * Get configuration schema for a section
   */
  getSchema(sectionId: string): ConfigurationContribution | undefined {
    return this.configurations.get(sectionId)?.contribution;
  }

  /**
   * Get all values for a section
   */
  getSectionValues(sectionId: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const prefix = sectionId + '.';

    for (const [key, value] of this.values) {
      if (key.startsWith(prefix)) {
        const shortKey = key.slice(prefix.length);
        result[shortKey] = value;
      }
    }

    // Add defaults for missing values
    const schema = this.getSchema(sectionId);
    if (schema) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (!(key in result) && prop.default !== undefined) {
          result[key] = prop.default;
        }
      }
    }

    return result;
  }

  /**
   * Reset a configuration to default
   */
  async reset(key: string): Promise<void> {
    const defaultValue = this.getSchemaDefault(key);
    if (defaultValue !== undefined) {
      await this.set(key, defaultValue);
    } else {
      this.values.delete(key);
      this.saveToStorage();
    }
  }

  /**
   * Reset all configurations to defaults
   */
  async resetAll(): Promise<void> {
    this.values.clear();
    this.saveToStorage();

    // Re-initialize defaults
    for (const { contribution } of this.configurations.values()) {
      for (const [key, prop] of Object.entries(contribution.properties)) {
        const fullKey = `${contribution.id}.${key}`;
        if (prop.default !== undefined) {
          this.values.set(fullKey, prop.default);
        }
      }
    }
  }

  private getSchemaDefault(key: string): unknown {
    const parts = key.split('.');
    if (parts.length < 2) return undefined;

    const sectionId = parts[0];
    const propKey = parts.slice(1).join('.');
    const schema = this.getSchema(sectionId);

    return schema?.properties[propKey]?.default;
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, unknown>;
        for (const [key, value] of Object.entries(data)) {
          this.values.set(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data: Record<string, unknown> = {};
      for (const [key, value] of this.values) {
        data[key] = value;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }
}
