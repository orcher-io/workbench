'use client';

import { memo, useMemo, type ReactNode } from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { CubeIcon, FileIcon } from '@radix-ui/react-icons';
import { SelectorDropdown, type SelectorItem } from './selector-dropdown';

/**
 * Workspace item interface
 */
export interface Workspace extends SelectorItem {
  id: string;
  name: string;
  icon?: ReactNode;
  description?: string;
}

/**
 * Project item interface
 */
export interface Project extends SelectorItem {
  id: string;
  name: string;
  /** ID of the workspace this project belongs to */
  workspaceId: string;
  icon?: ReactNode;
  description?: string;
}

/**
 * Props for the WorkspaceSelector component
 */
export interface WorkspaceSelectorProps {
  // Workspace data
  /** List of available workspaces */
  workspaces: Workspace[];
  /** Currently selected workspace */
  selectedWorkspace: Workspace | null;
  /** Called when a workspace is selected */
  onWorkspaceSelect: (workspace: Workspace) => void;
  /** Called when "Create workspace" is clicked */
  onWorkspaceCreate?: () => void;
  /** Whether workspaces are loading */
  isLoadingWorkspaces?: boolean;
  /** Error loading workspaces */
  workspacesError?: string | null;

  // Project data (optional)
  /** List of all projects */
  projects?: Project[];
  /** Currently selected project */
  selectedProject?: Project | null;
  /** Called when a project is selected */
  onProjectSelect?: (project: Project) => void;
  /** Called when "Create project" is clicked */
  onProjectCreate?: () => void;
  /** Whether projects are loading */
  isLoadingProjects?: boolean;
  /** Error loading projects */
  projectsError?: string | null;

  // Display options
  /** Whether to show project selector (default: true if projects provided) */
  showProjects?: boolean;
  /** Custom separator between workspace and project */
  separator?: ReactNode;
  /** Placeholder for workspace dropdown */
  workspacePlaceholder?: string;
  /** Placeholder for project dropdown */
  projectPlaceholder?: string;
  /** Max width for workspace name */
  workspaceMaxWidth?: number;
  /** Max width for project name */
  projectMaxWidth?: number;
  /** Default icon for workspaces without custom icon */
  defaultWorkspaceIcon?: ReactNode;
  /** Default icon for projects without custom icon */
  defaultProjectIcon?: ReactNode;
}

/**
 * A workspace and project selector component for the navbar.
 * Displays a hierarchical selection of workspace > project.
 */
export const WorkspaceSelector = memo(function WorkspaceSelector({
  workspaces,
  selectedWorkspace,
  onWorkspaceSelect,
  onWorkspaceCreate,
  isLoadingWorkspaces = false,
  workspacesError = null,
  projects = [],
  selectedProject = null,
  onProjectSelect,
  onProjectCreate,
  isLoadingProjects = false,
  projectsError = null,
  showProjects,
  separator,
  workspacePlaceholder = 'Workspace',
  projectPlaceholder = 'Project',
  workspaceMaxWidth = 140,
  projectMaxWidth = 140,
  defaultWorkspaceIcon,
  defaultProjectIcon,
}: WorkspaceSelectorProps) {
  // Determine if we should show projects
  const shouldShowProjects =
    showProjects ?? (projects.length > 0 || onProjectSelect !== undefined);

  // Filter projects by selected workspace
  const filteredProjects = useMemo(
    () =>
      selectedWorkspace
        ? projects.filter((p) => p.workspaceId === selectedWorkspace.id)
        : [],
    [projects, selectedWorkspace],
  );

  // Add default icons to items if not provided
  const workspacesWithIcons = useMemo(
    () =>
      workspaces.map((w) => ({
        ...w,
        icon: w.icon || defaultWorkspaceIcon || (
          <CubeIcon width={16} height={16} />
        ),
      })),
    [workspaces, defaultWorkspaceIcon],
  );

  const projectsWithIcons = useMemo(
    () =>
      filteredProjects.map((p) => ({
        ...p,
        icon: p.icon || defaultProjectIcon || (
          <FileIcon width={16} height={16} />
        ),
      })),
    [filteredProjects, defaultProjectIcon],
  );

  // Default separator
  const separatorElement = separator || (
    <Text
      size="2"
      style={{
        color: 'var(--gray-8)',
        userSelect: 'none',
      }}
    >
      /
    </Text>
  );

  return (
    <Flex align="center" gap="1">
      {/* Workspace Selector */}
      <SelectorDropdown
        items={workspacesWithIcons}
        selectedItem={
          selectedWorkspace
            ? {
                ...selectedWorkspace,
                icon: selectedWorkspace.icon || defaultWorkspaceIcon || (
                  <CubeIcon width={16} height={16} />
                ),
              }
            : null
        }
        onSelect={onWorkspaceSelect}
        placeholder={workspacePlaceholder}
        searchPlaceholder="Search workspaces..."
        isLoading={isLoadingWorkspaces}
        error={workspacesError}
        icon={<CubeIcon width={14} height={14} />}
        onCreate={onWorkspaceCreate}
        createLabel="Create workspace"
        emptyMessage="No workspaces"
        maxWidth={workspaceMaxWidth}
      />

      {/* Project Selector (shown when workspace is selected) */}
      {shouldShowProjects && selectedWorkspace && onProjectSelect && (
        <>
          {separatorElement}
          <SelectorDropdown
            items={projectsWithIcons}
            selectedItem={
              selectedProject
                ? {
                    ...selectedProject,
                    icon: selectedProject.icon || defaultProjectIcon || (
                      <FileIcon width={16} height={16} />
                    ),
                  }
                : null
            }
            onSelect={onProjectSelect}
            placeholder={projectPlaceholder}
            searchPlaceholder="Search projects..."
            isLoading={isLoadingProjects}
            error={projectsError}
            disabled={!selectedWorkspace}
            icon={<FileIcon width={14} height={14} />}
            onCreate={onProjectCreate}
            createLabel="Create project"
            emptyMessage={
              selectedWorkspace
                ? 'No projects in this workspace'
                : 'Select a workspace first'
            }
            maxWidth={projectMaxWidth}
          />
        </>
      )}
    </Flex>
  );
});
