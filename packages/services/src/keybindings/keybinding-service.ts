import type { KeybindingContribution, Disposable } from '@orcher/workbench-plugin-api';

/**
 * Parsed keybinding
 */
interface ParsedKeybinding {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

interface RegisteredKeybinding {
  contribution: KeybindingContribution;
  parsed: ParsedKeybinding;
  pluginId: string;
}

/**
 * Keybinding service - manages keyboard shortcuts
 */
export class KeybindingService {
  private keybindings: RegisteredKeybinding[] = [];
  private enabled = true;
  private disposables: Disposable[] = [];

  constructor(private executeCommand: (commandId: string) => Promise<void>) {
    this.setupGlobalListener();
  }

  /**
   * Register a keybinding contribution
   */
  registerKeybinding(contribution: KeybindingContribution, pluginId: string): Disposable {
    // Use platform-specific key
    const keyString = this.getPlatformKey(contribution);
    const parsed = this.parseKeybinding(keyString);

    const binding: RegisteredKeybinding = {
      contribution,
      parsed,
      pluginId,
    };

    this.keybindings.push(binding);

    return {
      dispose: () => {
        const index = this.keybindings.indexOf(binding);
        if (index !== -1) {
          this.keybindings.splice(index, 1);
        }
      },
    };
  }

  /**
   * Get keybinding for a command
   */
  getKeybinding(commandId: string): string | undefined {
    const binding = this.keybindings.find((b) => b.contribution.command === commandId);
    if (!binding) return undefined;
    return this.getPlatformKey(binding.contribution);
  }

  /**
   * Get display string for a keybinding
   */
  getKeybindingDisplay(commandId: string): string | undefined {
    const key = this.getKeybinding(commandId);
    if (!key) return undefined;
    return this.formatKeybindingDisplay(key);
  }

  /**
   * Enable/disable keybindings
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Dispose the service
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.keybindings = [];
  }

  private setupGlobalListener(): void {
    if (typeof window === 'undefined') return;

    const handler = (e: KeyboardEvent) => {
      if (!this.enabled) return;

      // Don't trigger in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const matching = this.findMatchingKeybinding(e);
      if (matching) {
        e.preventDefault();
        e.stopPropagation();
        this.executeCommand(matching.contribution.command).catch(console.error);
      }
    };

    window.addEventListener('keydown', handler);
    this.disposables.push({
      dispose: () => window.removeEventListener('keydown', handler),
    });
  }

  private findMatchingKeybinding(e: KeyboardEvent): RegisteredKeybinding | undefined {
    const key = e.key.toLowerCase();

    return this.keybindings.find((binding) => {
      const parsed = binding.parsed;
      return (
        parsed.key === key &&
        parsed.ctrlKey === e.ctrlKey &&
        parsed.shiftKey === e.shiftKey &&
        parsed.altKey === e.altKey &&
        parsed.metaKey === e.metaKey
      );
    });
  }

  private getPlatformKey(contribution: KeybindingContribution): string {
    if (typeof navigator === 'undefined') return contribution.key;

    const isMac = navigator.platform.toLowerCase().includes('mac');
    const isLinux = navigator.platform.toLowerCase().includes('linux');

    if (isMac && contribution.mac) return contribution.mac;
    if (isLinux && contribution.linux) return contribution.linux;
    return contribution.key;
  }

  private parseKeybinding(keyString: string): ParsedKeybinding {
    const parts = keyString.toLowerCase().split('+').map((p) => p.trim());
    const key = parts.pop() || '';

    return {
      key,
      ctrlKey: parts.includes('ctrl'),
      shiftKey: parts.includes('shift'),
      altKey: parts.includes('alt'),
      metaKey: parts.includes('cmd') || parts.includes('meta'),
    };
  }

  private formatKeybindingDisplay(keyString: string): string {
    const isMac = typeof navigator !== 'undefined' && 
      navigator.platform.toLowerCase().includes('mac');

    return keyString
      .split('+')
      .map((part) => {
        const p = part.trim().toLowerCase();
        if (p === 'cmd' || p === 'meta') return isMac ? '⌘' : 'Ctrl';
        if (p === 'ctrl') return isMac ? '⌃' : 'Ctrl';
        if (p === 'shift') return isMac ? '⇧' : 'Shift';
        if (p === 'alt') return isMac ? '⌥' : 'Alt';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(isMac ? '' : '+');
  }
}
