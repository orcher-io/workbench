import type { IContainer } from '@orcher/workbench-di';
import type {
  ICommandExtensionPoint,
  IEditorExtensionPoint,
  IViewExtensionPoint,
  IMenuExtensionPoint,
  IConfigurationExtensionPoint,
  ITypeExtensionPoint,
} from '../extension-points';

/**
 * Service tokens for DI container
 */
export const ServiceTokens = {
  CommandExtensionPoint: Symbol('CommandExtensionPoint'),
  EditorExtensionPoint: Symbol('EditorExtensionPoint'),
  ViewExtensionPoint: Symbol('ViewExtensionPoint'),
  MenuExtensionPoint: Symbol('MenuExtensionPoint'),
  ConfigurationExtensionPoint: Symbol('ConfigurationExtensionPoint'),
  TypeExtensionPoint: Symbol('TypeExtensionPoint'),
  TreeViewService: Symbol('TreeViewService'),
  NavigationService: Symbol('NavigationService'),
  PluginRegistry: Symbol('PluginRegistry'),
  WindowManager: Symbol('WindowManager'),
  EventBus: Symbol('EventBus'),
  ExplorerAPI: Symbol('ExplorerAPI'),
  RoutingService: Symbol('RoutingService'),
  ExplorerRegistry: Symbol('ExplorerRegistry'),
} as const;

/**
 * Workbench API available to plugins
 */
export interface WorkbenchAPI {
  /** DI container */
  readonly container: IContainer;
  /** Command extension point */
  readonly commands: ICommandExtensionPoint;
  /** Editor extension point */
  readonly editors: IEditorExtensionPoint;
  /** View extension point */
  readonly views: IViewExtensionPoint;
  /** Menu extension point */
  readonly menus: IMenuExtensionPoint;
  /** Configuration extension point */
  readonly configuration: IConfigurationExtensionPoint;
  /** Type extension point */
  readonly types: ITypeExtensionPoint;
}

/**
 * Get the workbench API from the container
 */
export function getWorkbenchAPI(container: IContainer): WorkbenchAPI {
  return {
    container,
    commands: container.resolve(ServiceTokens.CommandExtensionPoint),
    editors: container.resolve(ServiceTokens.EditorExtensionPoint),
    views: container.resolve(ServiceTokens.ViewExtensionPoint),
    menus: container.resolve(ServiceTokens.MenuExtensionPoint),
    configuration: container.resolve(ServiceTokens.ConfigurationExtensionPoint),
    types: container.resolve(ServiceTokens.TypeExtensionPoint),
  };
}
