import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const settingsDefinition: PluginDefinition = {
  id: '@orcher/workbench-plugin-settings',
  version: '0.0.1',
  name: 'Settings',
  description: 'Settings editor for configuring the workbench',
  activationEvents: ['onCommand:settings.open'],
  contributes: {
    commands: [
      {
        id: 'settings.open',
        title: 'Open Settings',
        category: 'Preferences',
      },
    ],
    keybindings: [
      {
        command: 'settings.open',
        key: 'Ctrl+,',
        mac: 'Cmd+,',
      },
    ],
    editors: [
      {
        id: 'settings.editor',
        name: 'Settings',
        selector: {
          scheme: 'settings',
        },
      },
    ],
  },
};
