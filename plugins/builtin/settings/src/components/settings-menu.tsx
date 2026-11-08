'use client';

import { memo, useState, useCallback } from 'react';
import { Box, Flex, Text, Separator } from '@radix-ui/themes';
import {
  GearIcon,
  PersonIcon,
  ExitIcon,
  SunIcon,
  MoonIcon,
  CubeIcon,
  FileIcon,
} from '@radix-ui/react-icons';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface Project {
  id: string;
  name: string;
  workspaceId: string;
  description?: string;
  icon?: React.ReactNode;
}

export interface SettingsMenuProps {
  /** Available workspaces */
  workspaces?: Workspace[];
  /** Currently selected workspace */
  selectedWorkspace?: Workspace | null;
  /** Called when a workspace is selected */
  onWorkspaceSelect?: (workspace: Workspace) => void;
  /** Called when create workspace is clicked */
  onWorkspaceCreate?: () => void;
  /** Available projects */
  projects?: Project[];
  /** Currently selected project */
  selectedProject?: Project | null;
  /** Called when a project is selected */
  onProjectSelect?: (project: Project) => void;
  /** Called when create project is clicked */
  onProjectCreate?: () => void;
  /** Current theme */
  theme?: 'light' | 'dark';
  /** Called when theme toggle is clicked */
  onThemeToggle?: () => void;
  /** Called when settings is clicked */
  onSettings?: () => void;
  /** Called when account settings is clicked */
  onAccountSettings?: () => void;
  /** Called when logout is clicked */
  onLogout?: () => void;
}

/** A clickable menu row */
function MenuRow({
  icon,
  label,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  color?: 'red';
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 12px',
        cursor: 'pointer',
        backgroundColor: hovered ? 'var(--gray-a3)' : 'transparent',
        borderRadius: 4,
        transition: 'background-color 0.1s',
      }}
    >
      <Box
        style={{
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: color === 'red' ? 'var(--red-9)' : 'var(--gray-11)',
        }}
      >
        {icon}
      </Box>
      <Text
        size="2"
        style={{ color: color === 'red' ? 'var(--red-9)' : undefined }}
      >
        {label}
      </Text>
    </Box>
  );
}

/** A selectable item in the workspace/project list */
function SelectableItem({
  icon,
  name,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  description?: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px',
        cursor: 'pointer',
        backgroundColor: hovered
          ? 'var(--accent-4)'
          : selected
            ? 'var(--gray-a3)'
            : 'transparent',
        borderRadius: 4,
        transition: 'background-color 0.1s',
      }}
    >
      <Box
        style={{
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--gray-11)',
        }}
      >
        {icon}
      </Box>
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Text
          size="2"
          weight={selected ? 'medium' : 'regular'}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </Text>
        {description && (
          <Text
            size="1"
            color="gray"
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export const SettingsMenu = memo(function SettingsMenu({
  workspaces = [],
  selectedWorkspace,
  onWorkspaceSelect,
  onWorkspaceCreate,
  projects = [],
  selectedProject,
  onProjectSelect,
  onProjectCreate,
  theme = 'dark',
  onThemeToggle,
  onSettings,
  onAccountSettings,
  onLogout,
}: SettingsMenuProps) {
  const isDark = theme === 'dark';

  // Filter projects by selected workspace
  const filteredProjects = selectedWorkspace
    ? projects.filter((p) => p.workspaceId === selectedWorkspace.id)
    : projects;

  const showWorkspaces = workspaces.length > 0 && onWorkspaceSelect;

  const [section, setSection] = useState<'main' | 'workspaces' | 'projects'>(
    'main',
  );

  const handleBack = useCallback(() => setSection('main'), []);

  return (
    <Box
      style={{
        width: 260,
        backgroundColor: 'var(--color-panel)',
        overflow: 'hidden',
      }}
    >
      {section === 'main' && (
        <>
          {/* Workspace & Project display */}
          {showWorkspaces && (
            <>
              <Box py="1" px="1">
                <MenuRow
                  icon={<CubeIcon width={15} height={15} />}
                  label={selectedWorkspace?.name ?? 'Select workspace'}
                  onClick={() => setSection('workspaces')}
                />
                {selectedWorkspace && filteredProjects.length > 0 && (
                  <MenuRow
                    icon={<FileIcon width={15} height={15} />}
                    label={selectedProject?.name ?? 'Select project'}
                    onClick={() => setSection('projects')}
                  />
                )}
              </Box>
              <Separator size="4" />
            </>
          )}

          {/* Menu items */}
          <Box py="1" px="1">
            <MenuRow
              icon={<GearIcon width={15} height={15} />}
              label="Settings"
              onClick={onSettings}
            />
            <MenuRow
              icon={<PersonIcon width={15} height={15} />}
              label="Account Settings"
              onClick={onAccountSettings}
            />
            {onThemeToggle && (
              <MenuRow
                icon={
                  isDark ? (
                    <SunIcon width={15} height={15} />
                  ) : (
                    <MoonIcon width={15} height={15} />
                  )
                }
                label={isDark ? 'Light Mode' : 'Dark Mode'}
                onClick={onThemeToggle}
              />
            )}
          </Box>

          {onLogout && (
            <>
              <Separator size="4" />
              <Box py="1" px="1">
                <MenuRow
                  icon={<ExitIcon width={15} height={15} />}
                  label="Logout"
                  onClick={onLogout}
                  color="red"
                />
              </Box>
            </>
          )}
        </>
      )}

      {section === 'workspaces' && (
        <>
          <Flex
            align="center"
            gap="2"
            px="3"
            py="2"
            style={{ borderBottom: '1px solid var(--gray-6)' }}
          >
            <Box
              onClick={handleBack}
              style={{
                cursor: 'pointer',
                color: 'var(--gray-11)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text size="2" color="gray">
                &larr;
              </Text>
            </Box>
            <Text size="2" weight="medium">
              Workspaces
            </Text>
          </Flex>
          <Box
            py="1"
            px="1"
            style={{ maxHeight: 240, overflowY: 'auto' }}
          >
            {workspaces.map((ws) => (
              <SelectableItem
                key={ws.id}
                icon={ws.icon ?? <CubeIcon width={14} height={14} />}
                name={ws.name}
                description={ws.description}
                selected={selectedWorkspace?.id === ws.id}
                onClick={() => {
                  onWorkspaceSelect?.(ws);
                  setSection('main');
                }}
              />
            ))}
          </Box>
          {onWorkspaceCreate && (
            <>
              <Separator size="4" />
              <Box py="1" px="1">
                <MenuRow
                  icon={<Text size="2">+</Text>}
                  label="Create workspace"
                  onClick={onWorkspaceCreate}
                />
              </Box>
            </>
          )}
        </>
      )}

      {section === 'projects' && (
        <>
          <Flex
            align="center"
            gap="2"
            px="3"
            py="2"
            style={{ borderBottom: '1px solid var(--gray-6)' }}
          >
            <Box
              onClick={handleBack}
              style={{
                cursor: 'pointer',
                color: 'var(--gray-11)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Text size="2" color="gray">
                &larr;
              </Text>
            </Box>
            <Text size="2" weight="medium">
              Projects
            </Text>
          </Flex>
          <Box
            py="1"
            px="1"
            style={{ maxHeight: 240, overflowY: 'auto' }}
          >
            {filteredProjects.map((proj) => (
              <SelectableItem
                key={proj.id}
                icon={proj.icon ?? <FileIcon width={14} height={14} />}
                name={proj.name}
                description={proj.description}
                selected={selectedProject?.id === proj.id}
                onClick={() => {
                  onProjectSelect?.(proj);
                  setSection('main');
                }}
              />
            ))}
          </Box>
          {onProjectCreate && (
            <>
              <Separator size="4" />
              <Box py="1" px="1">
                <MenuRow
                  icon={<Text size="2">+</Text>}
                  label="Create project"
                  onClick={onProjectCreate}
                />
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
});
