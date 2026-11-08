'use client';

import { type ReactNode } from 'react';
import { Box, Text } from '@radix-ui/themes';
import { useActiveView } from '../hooks/use-view-service';
import { useTreeViewService } from '../hooks/use-tree-view-service';
import { TreeViewRenderer } from './tree-view-renderer';

interface SidebarRendererProps {
  /** Fallback content when no view is available */
  fallback?: ReactNode;
  /** Whether search is visible (controlled by sidebar header) */
  isSearchVisible?: boolean;
  /** Callback when search visibility changes */
  onSearchVisibilityChange?: (visible: boolean) => void;
}

/**
 * Renders the active view for the current sidebar container
 * Supports both component-based ViewProviders and TreeDataProviders
 */
export function SidebarRenderer({
  fallback,
  isSearchVisible,
  onSearchVisibilityChange,
}: SidebarRendererProps) {
  const { viewId, provider, containerId } = useActiveView();
  const { hasTreeDataProvider } = useTreeViewService();

  if (!containerId) {
    return fallback ?? null;
  }

  // Check if this view has a TreeDataProvider
  if (viewId && hasTreeDataProvider(viewId)) {
    return (
      <TreeViewRenderer
        viewId={viewId}
        isSearchVisible={isSearchVisible}
        onSearchVisibilityChange={onSearchVisibilityChange}
      />
    );
  }

  // Fall back to component-based provider
  if (!provider) {
    return (
      <Box p="4">
        <Text size="2" color="gray">
          No view registered for container: {containerId}
        </Text>
      </Box>
    );
  }

  const ViewComponent = provider.component;
  return <ViewComponent viewId={viewId!} />;
}
