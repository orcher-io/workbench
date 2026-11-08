import type { IContainer } from '@orcher/workbench-di';
import type {
  CommandContribution,
  CommandHandler,
  CommandContext,
  ICommandExtensionPoint,
  Disposable,
} from '@orcher/workbench-plugin-api';

interface RegisteredCommand {
  contribution: CommandContribution;
  handler?: CommandHandler;
  pluginId: string;
  /** Created by a handler that arrived before the command's contribution */
  implicit?: boolean;
}

/**
 * Command service - manages command registration and execution
 */
export class CommandService implements ICommandExtensionPoint {
  private commands = new Map<string, RegisteredCommand>();
  private activationTrigger?: (event: string) => void;

  constructor(private container: IContainer) {}

  /**
   * Set a callback to trigger plugin activation events (e.g. onCommand:*)
   */
  setActivationTrigger(trigger: (event: string) => void): void {
    this.activationTrigger = trigger;
  }

  /**
   * Register a command contribution from a plugin manifest
   */
  registerContribution(
    contribution: CommandContribution,
    pluginId: string,
  ): void {
    const existing = this.commands.get(contribution.id);
    if (existing && !existing.implicit) {
      console.warn(`Command already registered: ${contribution.id}`);
      return;
    }

    // A plugin activated while it was being registered (activation event
    // '*') registers its handlers before its contributions: keep the handler.
    this.commands.set(contribution.id, {
      contribution,
      pluginId,
      handler: existing?.handler,
    });
  }

  /**
   * Register a command handler
   */
  registerHandler(
    commandId: string,
    handler: CommandHandler,
    pluginId: string,
  ): Disposable {
    const command = this.commands.get(commandId);
    if (!command) {
      // Create implicit command
      this.commands.set(commandId, {
        contribution: { id: commandId, title: commandId },
        handler,
        pluginId,
        implicit: true,
      });
    } else {
      command.handler = handler;
    }

    return {
      dispose: () => {
        const cmd = this.commands.get(commandId);
        if (cmd) {
          cmd.handler = undefined;
        }
      },
    };
  }

  /**
   * Execute a command by ID
   */
  async executeCommand<T = unknown>(
    commandId: string,
    ...args: unknown[]
  ): Promise<T> {
    // Trigger onCommand activation for lazy plugins
    this.activationTrigger?.(`onCommand:${commandId}`);

    const command = this.commands.get(commandId);
    if (!command) {
      throw new Error(`Command not found: ${commandId}`);
    }

    if (!command.handler) {
      // Handler may not be registered yet if plugin is still loading
      // Wait briefly for lazy activation to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!command.handler) {
        throw new Error(`No handler registered for command: ${commandId}`);
      }
    }

    const context: CommandContext = {
      caller: command.pluginId,
      container: this.container,
      // activeEditor would be provided by window manager integration
    };

    return command.handler(context, ...args) as Promise<T>;
  }

  /**
   * Check if a command exists
   */
  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  /**
   * Get all registered commands
   */
  getCommands(): CommandContribution[] {
    return Array.from(this.commands.values()).map((c) => c.contribution);
  }

  /**
   * Get commands by category
   */
  getCommandsByCategory(category: string): CommandContribution[] {
    return Array.from(this.commands.values())
      .filter((c) => c.contribution.category === category)
      .map((c) => c.contribution);
  }
}
