import type {
  PluginModule,
  PluginActivationContext,
  ICommandExtensionPoint,
  ITreeViewService,
  ExplorerMenuItem,
} from '@orcher/workbench-plugin-api';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import {
  ExplorerRegistry,
  RoutingService,
  BrowserHistoryAdapter,
  ViewService,
} from '@orcher/workbench-services';
import { ExplorerAPI } from './explorer-api';

export const explorerModule: PluginModule = {
  activate(context: PluginActivationContext) {
    // Get required services
    const viewService = context.container.resolve<ViewService>(
      ServiceTokens.ViewExtensionPoint,
    );
    const treeViewService = context.container.resolve<ITreeViewService>(
      ServiceTokens.TreeViewService,
    );
    const commandService = context.container.resolve<ICommandExtensionPoint>(
      ServiceTokens.CommandExtensionPoint,
    );

    // Create the explorer registry
    const explorerRegistry = new ExplorerRegistry();

    // Create history adapter (browser-based for now)
    const historyAdapter = new BrowserHistoryAdapter();

    // Create routing service
    const routingService = new RoutingService(historyAdapter);

    // Connect registry to routing service
    explorerRegistry.setRoutingService(routingService);

    // Create the ExplorerAPI
    const explorerAPI = new ExplorerAPI(
      explorerRegistry,
      routingService,
      viewService,
      treeViewService,
      context.definition.id,
    );

    // Register services in root container for other plugins and hooks to use
    context.container.registerSharedValue(
      ServiceTokens.ExplorerRegistry,
      explorerRegistry,
    );
    context.container.registerSharedValue(
      ServiceTokens.RoutingService,
      routingService,
    );
    context.container.registerSharedValue(
      ServiceTokens.ExplorerAPI,
      explorerAPI,
    );

    // Register command handlers
    context.subscriptions.push(
      commandService.registerHandler(
        'explorer.navigateTo',
        async (_ctx, path: unknown) => {
          if (typeof path === 'string') {
            await explorerAPI.navigateTo(path);
          }
        },
        context.definition.id,
      ),
    );

    context.subscriptions.push(
      commandService.registerHandler(
        'explorer.openItem',
        (_ctx, item: unknown) => {
          if (item && typeof item === 'object' && 'id' in item) {
            const menuItem = item as ExplorerMenuItem;
            const path = explorerAPI.buildPath(menuItem.id);
            explorerAPI.navigateTo(path);
          }
        },
        context.definition.id,
      ),
    );

    context.subscriptions.push(
      commandService.registerHandler(
        'explorer.refresh',
        () => {
          // Trigger a refresh by re-syncing from URL
          routingService.syncFromUrl();
        },
        context.definition.id,
      ),
    );

    // Initialize routing from current URL (for deep linking)
    // Delay to allow other plugins to register their sections first
    setTimeout(() => {
      routingService.syncFromUrl();
    }, 100);
  },
};
