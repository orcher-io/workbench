'use client';

import { useState } from 'react';
import {
  Box,
  Text,
  Heading,
  Flex,
  Switch,
  Separator,
  ScrollArea,
} from '@radix-ui/themes';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Input } from '../primitives';

export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  type: 'boolean' | 'string' | 'number' | 'select';
  default?: unknown;
  options?: Array<{ label: string; value: string | number }>;
  category?: string;
}

export type SettingValue = string | number | boolean | undefined;

export interface SettingsSection {
  id: string;
  title: string;
  settings: SettingDefinition[];
}

export interface SettingsEditorProps {
  /** Flat array of settings (will be grouped by category) */
  settings?: SettingDefinition[];
  /** Pre-grouped sections */
  sections?: SettingsSection[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function SettingRow({
  setting,
  value,
  onChange,
}: {
  setting: SettingDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const renderControl = () => {
    switch (setting.type) {
      case 'boolean':
        return (
          <Switch
            checked={(value as boolean) ?? setting.default ?? false}
            onCheckedChange={onChange}
          />
        );

      case 'string':
        return (
          <Input
            value={(value as string) ?? (setting.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 300 }}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? (setting.default as number) ?? 0}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: 100 }}
          />
        );

      case 'select':
        return (
          <select
            value={(value as string) ?? (setting.default as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid var(--gray-6)',
              backgroundColor: 'var(--gray-2)',
              color: 'var(--gray-12)',
              fontSize: 14,
            }}
          >
            {setting.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  return (
    <Box style={{ padding: '12px 0' }}>
      <Flex justify="between" align="start">
        <Box style={{ flex: 1, marginRight: 16 }}>
          <Text weight="medium" size="2">
            {setting.label}
          </Text>
          {setting.description && (
            <Text
              size="1"
              color="gray"
              style={{ display: 'block', marginTop: 4 }}
            >
              {setting.description}
            </Text>
          )}
        </Box>
        <Box>{renderControl()}</Box>
      </Flex>
    </Box>
  );
}

export function SettingsEditor({
  settings,
  sections,
  values,
  onChange,
}: SettingsEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Convert flat settings to sections if needed
  const allSections: SettingsSection[] =
    sections ??
    (() => {
      if (!settings) return [];

      const grouped = new Map<string, SettingDefinition[]>();
      for (const setting of settings) {
        const category = setting.category ?? 'General';
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(setting);
      }

      return Array.from(grouped.entries()).map(([title, settingsList]) => ({
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        settings: settingsList,
      }));
    })();

  const filteredSections = allSections
    .map((section) => ({
      ...section,
      settings: section.settings.filter(
        (s) =>
          !searchQuery ||
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }))
    .filter((section) => section.settings.length > 0);

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search */}
      <Box style={{ padding: 16, borderBottom: '1px solid var(--gray-6)' }}>
        <Flex align="center" gap="2">
          <MagnifyingGlassIcon
            width={16}
            height={16}
            style={{ color: 'var(--gray-9)' }}
          />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--gray-12)',
            }}
          />
        </Flex>
      </Box>

      {/* Settings list */}
      <ScrollArea style={{ flex: 1 }}>
        <Box style={{ padding: 16 }}>
          {filteredSections.length === 0 ? (
            <Text color="gray" size="2">
              No settings found
            </Text>
          ) : (
            filteredSections.map((section, index) => (
              <Box key={section.id}>
                {index > 0 && (
                  <Separator size="4" style={{ margin: '24px 0' }} />
                )}
                <Heading size="3" mb="3">
                  {section.title}
                </Heading>
                {section.settings.map((setting) => (
                  <SettingRow
                    key={setting.key}
                    setting={setting}
                    value={values[setting.key]}
                    onChange={(value) => onChange(setting.key, value)}
                  />
                ))}
              </Box>
            ))
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
