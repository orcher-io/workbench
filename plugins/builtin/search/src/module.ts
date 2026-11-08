import type {
  PluginModule,
  PluginActivationContext,
  IViewExtensionPoint,
} from '@orcher/workbench-plugin-api';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import { SearchView } from './components/search-view';

export const searchModule: PluginModule = {
  activate(context: PluginActivationContext) {
    // Get the view service
    const viewService = context.container.resolve<IViewExtensionPoint>(
      ServiceTokens.ViewExtensionPoint,
    );

    // Register the search view provider
    const disposable = viewService.registerProvider(
      'search.results',
      { component: SearchView },
      context.definition.id,
    );

    // Add to subscriptions for cleanup on deactivation
    context.subscriptions.push(disposable);
  },
};
