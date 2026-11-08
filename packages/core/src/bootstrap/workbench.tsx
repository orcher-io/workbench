'use client';

import { type ReactNode, useMemo, useState, useCallback } from 'react';
import {
  createContainer,
  ContainerProvider,
  type IContainer,
} from '@orcher/workbench-di';
import {
  type PluginDefinition,
  type PluginModule,
  type ActivationEvent,
  ServiceTokens,
} from '@orcher/workbench-plugin-api';
import {
  ExtensionRegistry,
  EventBus,
  CommandService,
  ViewService,
  TreeViewService,
  NavigationService,
} from '@orcher/workbench-services';
import {
  WorkbenchTheme,
  type WorkbenchThemeProps,
  ThemeProvider,
  type ThemeAppearance,
} from '@orcher/workbench-ui';
import { SSRBridgeProvider, type SSRState } from '../ssr';

export interface WorkbenchConfig {
  /** Theme configuration */
  theme?: Omit<WorkbenchThemeProps, 'children'>;
  /** Pre-registered plugins */
  plugins?: Array<{ definition: PluginDefinition; module: PluginModule }>;
  /** Lazy-loaded plugins */
  lazyPlugins?: Array<{
    definition: PluginDefinition;
    loader: () => Promise<PluginModule>;
  }>;
  /** SSR state for hydration */
  ssrState?: SSRState;
}

export interface WorkbenchProviderProps {
  /** Workbench configuration */
  config?: WorkbenchConfig;
  /** Initial URL path for routing (for deep linking / SSR) */
  initialPath?: string;
  /** Child components */
  children: ReactNode;
}

/**
 * Initialize workbench services in the container
 */
function initializeWorkbench(config: WorkbenchConfig = {}): IContainer {
  const container = createContainer();

  // Create core services
  const eventBus = new EventBus();
  const extensionRegistry = new ExtensionRegistry(container, eventBus);
  const commandService = new CommandService(container);
  const viewService = new ViewService();
  const treeViewService = new TreeViewService();
  const navigationService = new NavigationService();

  // Wire activation triggers
  commandService.setActivationTrigger((event) => extensionRegistry.triggerActivation(event as ActivationEvent));
  viewService.setActivationTrigger((event) => extensionRegistry.triggerActivation(event as ActivationEvent));

  // Register services
  container.registerValue(ServiceTokens.EventBus, eventBus);
  container.registerValue(ServiceTokens.PluginRegistry, extensionRegistry);
  container.registerValue(ServiceTokens.CommandExtensionPoint, commandService);
  container.registerValue(ServiceTokens.ViewExtensionPoint, viewService);
  container.registerValue(ServiceTokens.TreeViewService, treeViewService);
  container.registerValue(ServiceTokens.NavigationService, navigationService);

  // Register plugins
  if (config.plugins) {
    for (const { definition, module } of config.plugins) {
      extensionRegistry.register(definition, module);

      // Register contributions
      if (definition.contributes?.commands) {
        for (const cmd of definition.contributes.commands) {
          commandService.registerContribution(cmd, definition.id);
        }
      }

      // Register view containers
      if (definition.contributes?.viewContainers) {
        const { activityBar, panel } = definition.contributes.viewContainers;
        if (activityBar) {
          for (const container of activityBar) {
            viewService.registerViewContainer(
              container,
              'activityBar',
              definition.id,
            );
          }
        }
        if (panel) {
          for (const container of panel) {
            viewService.registerViewContainer(
              container,
              'panel',
              definition.id,
            );
          }
        }
      }

      // Register views
      if (definition.contributes?.views) {
        for (const [containerId, views] of Object.entries(
          definition.contributes.views,
        )) {
          for (const view of views) {
            viewService.registerContribution(view, containerId, definition.id);
          }
        }
      }
    }
  }

  // Register lazy plugins (contributions registered eagerly, module loaded lazily)
  if (config.lazyPlugins) {
    for (const { definition, loader } of config.lazyPlugins) {
      extensionRegistry.registerLazy(definition, loader);

      // Register contributions eagerly so views/commands are available before activation
      if (definition.contributes?.commands) {
        for (const cmd of definition.contributes.commands) {
          commandService.registerContribution(cmd, definition.id);
        }
      }
      if (definition.contributes?.viewContainers) {
        const { activityBar, panel } = definition.contributes.viewContainers;
        if (activityBar) {
          for (const vc of activityBar) {
            viewService.registerViewContainer(vc, 'activityBar', definition.id);
          }
        }
        if (panel) {
          for (const vc of panel) {
            viewService.registerViewContainer(vc, 'panel', definition.id);
          }
        }
      }
      if (definition.contributes?.views) {
        for (const [containerId, views] of Object.entries(definition.contributes.views)) {
          for (const view of views) {
            viewService.registerContribution(view, containerId, definition.id);
          }
        }
      }
    }
  }

  // Trigger startup activation
  extensionRegistry.triggerActivation('onStartup');

  return container;
}

/**
 * Inner component that uses theme context
 */
function resolveAppearance(
  value: string | undefined,
): ThemeAppearance {
  return value === 'light' ? 'light' : 'dark';
}

function WorkbenchThemeWrapper({
  config,
  children,
}: {
  config: WorkbenchConfig;
  children: ReactNode;
}) {
  const defaultAppearance = resolveAppearance(config.theme?.appearance as string);

  const [appearance, setAppearance] =
    useState<ThemeAppearance>(defaultAppearance);

  const handleThemeChange = useCallback((newAppearance: ThemeAppearance) => {
    setAppearance(newAppearance);
  }, []);

  return (
    <ThemeProvider
      defaultTheme={defaultAppearance}
      onThemeChange={handleThemeChange}
    >
      <WorkbenchTheme {...config.theme} appearance={appearance}>
        {children}
      </WorkbenchTheme>
    </ThemeProvider>
  );
}

/**
 * Workbench provider - wraps the application with workbench services
 */
export function WorkbenchProvider({
  config = {},
  children,
}: WorkbenchProviderProps) {
  const container = useMemo(() => initializeWorkbench(config), []);

  return (
    <ContainerProvider container={container}>
      <SSRBridgeProvider ssrState={config.ssrState}>
        <WorkbenchThemeWrapper config={config}>{children}</WorkbenchThemeWrapper>
      </SSRBridgeProvider>
    </ContainerProvider>
  );
}
