'use client';

import { useState, useEffect } from 'react';
import { Box } from '@radix-ui/themes';
import {
  SettingsEditor as SettingsEditorUI,
  type SettingDefinition,
  type SettingValue,
} from '@orcher/workbench-ui';

// Default settings schema - plugins can contribute more
const defaultSettings: SettingDefinition[] = [
  {
    key: 'editor.fontSize',
    type: 'number',
    label: 'Font Size',
    description: 'Controls the font size in pixels for the editor',
    default: 14,
    category: 'Editor',
  },
  {
    key: 'editor.tabSize',
    type: 'number',
    label: 'Tab Size',
    description: 'The number of spaces a tab is equal to',
    default: 2,
    category: 'Editor',
  },
  {
    key: 'editor.wordWrap',
    type: 'boolean',
    label: 'Word Wrap',
    description: 'Controls how lines should wrap',
    default: false,
    category: 'Editor',
  },
  {
    key: 'editor.minimap.enabled',
    type: 'boolean',
    label: 'Show Minimap',
    description: 'Controls whether the minimap is shown',
    default: true,
    category: 'Editor',
  },
  {
    key: 'workbench.colorTheme',
    type: 'select',
    label: 'Color Theme',
    description: 'Specifies the color theme used in the workbench',
    default: 'dark',
    options: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'inherit', label: 'System' },
    ],
    category: 'Appearance',
  },
  {
    key: 'workbench.activityBar.visible',
    type: 'boolean',
    label: 'Show Activity Bar',
    description: 'Controls the visibility of the activity bar',
    default: true,
    category: 'Appearance',
  },
  {
    key: 'workbench.statusBar.visible',
    type: 'boolean',
    label: 'Show Status Bar',
    description: 'Controls the visibility of the status bar',
    default: true,
    category: 'Appearance',
  },
  {
    key: 'files.autoSave',
    type: 'select',
    label: 'Auto Save',
    description: 'Controls auto save of editors',
    default: 'off',
    options: [
      { value: 'off', label: 'Off' },
      { value: 'afterDelay', label: 'After Delay' },
      { value: 'onFocusChange', label: 'On Focus Change' },
      { value: 'onWindowChange', label: 'On Window Change' },
    ],
    category: 'Files',
  },
  {
    key: 'files.autoSaveDelay',
    type: 'number',
    label: 'Auto Save Delay',
    description: 'Controls the delay in ms after which an editor is auto saved',
    default: 1000,
    category: 'Files',
  },
];

const STORAGE_KEY = 'workbench-settings';

function loadSettings(): Record<string, SettingValue> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: Record<string, SettingValue>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function SettingsEditor() {
  const [values, setValues] = useState<Record<string, SettingValue>>({});

  useEffect(() => {
    setValues(loadSettings());
  }, []);

  const handleChange = (key: string, value: unknown) => {
    const newValues = { ...values, [key]: value as SettingValue };
    setValues(newValues);
    saveSettings(newValues);
  };

  return (
    <Box style={{ height: '100%', overflow: 'auto' }}>
      <SettingsEditorUI
        settings={defaultSettings}
        values={values}
        onChange={handleChange}
      />
    </Box>
  );
}
