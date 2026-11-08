import type { LayoutState, LayoutNode, TabState } from '../models';
import { validateLayout, createEmptyLayout } from '../operations/cleanup';

/**
 * Current serialization version
 */
export const SERIALIZATION_VERSION = 1;

/**
 * Serialized layout format (for storage)
 */
export interface SerializedLayout {
  version: number;
  timestamp: number;
  layout: LayoutState;
}

/**
 * Serialize a layout for storage
 */
export function serializeLayout(layout: LayoutState): string {
  const serialized: SerializedLayout = {
    version: SERIALIZATION_VERSION,
    timestamp: Date.now(),
    layout: sanitizeLayout(layout),
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize a layout from storage
 */
export function deserializeLayout(data: string): LayoutState | null {
  try {
    const parsed = JSON.parse(data);

    // Handle old format (direct layout without wrapper)
    if (parsed.root && parsed.activePaneId) {
      return migrateLayout(parsed as LayoutState, 0);
    }

    // Handle new format
    const serialized = parsed as SerializedLayout;
    const migrated = migrateLayout(serialized.layout, serialized.version);

    // Validate the migrated layout
    const { valid, errors } = validateLayout(migrated);
    if (!valid) {
      console.warn('Deserialized layout has validation errors:', errors);
      // Try to fix common issues
      return repairLayout(migrated);
    }

    return migrated;
  } catch (error) {
    console.error('Failed to deserialize layout:', error);
    return null;
  }
}

/**
 * Sanitize layout before serialization (remove non-serializable data)
 */
function sanitizeLayout(layout: LayoutState): LayoutState {
  return {
    ...layout,
    root: sanitizeNode(layout.root),
  };
}

/**
 * Sanitize a layout node
 */
function sanitizeNode(node: LayoutNode): LayoutNode {
  if (node.type === 'tabGroup') {
    return {
      ...node,
      tabs: node.tabs.map(sanitizeTab),
    };
  }

  return {
    ...node,
    children: node.children.map(sanitizeNode),
  };
}

/**
 * Sanitize a tab (remove non-serializable state)
 */
function sanitizeTab(tab: TabState): TabState {
  const sanitized: TabState = {
    id: tab.id,
    uri: tab.uri,
    title: tab.title,
    editorId: tab.editorId,
    pinned: tab.pinned,
    preview: tab.preview,
    dirty: false, // Don't persist dirty state
  };

  // Include optional fields if present
  if (tab.subtitle) sanitized.subtitle = tab.subtitle;
  if (tab.icon) sanitized.icon = tab.icon;
  if (tab.resourceType) sanitized.resourceType = tab.resourceType;
  if (tab.resourceId) sanitized.resourceId = tab.resourceId;

  // Only include serializable state
  if (tab.state) {
    try {
      JSON.stringify(tab.state);
      sanitized.state = tab.state;
    } catch {
      // State is not serializable, skip it
    }
  }

  return sanitized;
}

/**
 * Migrate layout from older versions
 */
function migrateLayout(layout: LayoutState, fromVersion: number): LayoutState {
  let migrated = { ...layout };

  // Migration from version 0 (no version field)
  if (fromVersion < 1) {
    migrated = {
      ...migrated,
      version: 1,
      id: migrated.id || `${Date.now()}-migrated`,
    };
  }

  // Future migrations go here
  // if (fromVersion < 2) { ... }

  return migrated;
}

/**
 * Attempt to repair a broken layout
 */
function repairLayout(layout: LayoutState): LayoutState {
  try {
    // Create a new valid layout and try to preserve tabs
    const repaired = createEmptyLayout();

    // Collect all tabs from the broken layout
    const tabs = collectAllTabs(layout.root);

    // Add tabs to the new layout
    if (tabs.length > 0 && repaired.root.type === 'tabGroup') {
      repaired.root.tabs = tabs;
      repaired.root.activeTabId = tabs[0].id;
    }

    return repaired;
  } catch {
    // If repair fails, return a fresh empty layout
    return createEmptyLayout();
  }
}

/**
 * Collect all tabs from a layout node
 */
function collectAllTabs(node: LayoutNode): TabState[] {
  if (node.type === 'tabGroup') {
    return [...node.tabs];
  }

  return node.children.flatMap(collectAllTabs);
}

/**
 * Check if two layouts are equal (for change detection)
 */
export function layoutsEqual(a: LayoutState, b: LayoutState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Create a layout diff for debugging
 */
export function layoutDiff(
  before: LayoutState,
  after: LayoutState,
): { added: string[]; removed: string[]; changed: string[] } {
  const beforeTabs = new Map(collectAllTabs(before.root).map((t) => [t.id, t]));
  const afterTabs = new Map(collectAllTabs(after.root).map((t) => [t.id, t]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const [id, tab] of afterTabs) {
    if (!beforeTabs.has(id)) {
      added.push(id);
    } else if (JSON.stringify(beforeTabs.get(id)) !== JSON.stringify(tab)) {
      changed.push(id);
    }
  }

  for (const id of beforeTabs.keys()) {
    if (!afterTabs.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, changed };
}
