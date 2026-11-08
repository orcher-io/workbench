import { createContainer } from '@orcher/workbench-di';
import { ServiceTokens } from '@orcher/workbench-plugin-api';
import type { ActivationEvent, PluginDefinition } from '@orcher/workbench-plugin-api';
import { EventBus } from '../events';
import { ExtensionRegistry } from '../extension-registry';
import { ViewService } from './view-service';

const searchDefinition: PluginDefinition = {
  id: 'test-search',
  version: '0.1.0',
  name: 'Search',
  activationEvents: ['onView:search'],
  contributes: {
    viewContainers: { activityBar: [{ id: 'search', title: 'Search', icon: 'search' }] },
    views: { search: [{ id: 'search.results', name: 'Results' }] },
  },
};

function lazyPlugin(definition: PluginDefinition) {
  const container = createContainer();
  const registry = new ExtensionRegistry(container, new EventBus());
  const views = new ViewService();
  container.registerValue(ServiceTokens.ViewExtensionPoint, views);
  views.setActivationTrigger((event) => registry.triggerActivation(event as ActivationEvent));

  // Explorer registers first, so it is the default and search starts closed
  views.registerViewContainer({ id: 'explorer', title: 'Explorer', icon: 'files' }, 'activityBar', 'explorer');

  const SearchView = () => null;
  registry.register(definition, {
    activate(context) {
      context.container
        .resolve<ViewService>(ServiceTokens.ViewExtensionPoint)
        .registerProvider('search.results', { component: SearchView }, definition.id);
    },
  });
  views.registerViewContainer(definition.contributes!.viewContainers!.activityBar![0], 'activityBar', definition.id);
  views.registerContribution(definition.contributes!.views!.search[0], 'search', definition.id);
  return views;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ViewService activation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('activates a lazy plugin when its container opens', async () => {
    const views = lazyPlugin(searchDefinition);
    expect(views.getViewProvider('search.results')).toBeUndefined();

    views.setActiveContainer('search');
    await settle();

    expect(views.getViewProvider('search.results')).toBeDefined();
  });

  it('activates by view id as well as container id', async () => {
    const views = lazyPlugin({ ...searchDefinition, activationEvents: ['onView:search.results'] });

    views.setActiveContainer('search');
    await settle();

    expect(views.getViewProvider('search.results')).toBeDefined();
  });

  it('activates the container restored from storage', async () => {
    // vitest.setup.ts stubs localStorage, so stub the read that hydrate makes
    vi.spyOn(localStorage, 'getItem').mockImplementation((key) =>
      key === 'workbench-active-container' ? 'search' : null,
    );
    const views = lazyPlugin(searchDefinition);

    views.hydrate();
    await settle();

    expect(views.getViewProvider('search.results')).toBeDefined();
  });
});

describe('ViewService default container', () => {
  it('activates the first container, which opens without being chosen', async () => {
    const container = createContainer();
    const registry = new ExtensionRegistry(container, new EventBus());
    const views = new ViewService();
    container.registerValue(ServiceTokens.ViewExtensionPoint, views);
    views.setActivationTrigger((event) => registry.triggerActivation(event as ActivationEvent));
    const activated: string[] = [];
    for (const id of ['first', 'second']) {
      registry.register(
        { id, version: '0.1.0', name: id, activationEvents: [`onView:${id}`] },
        { activate: () => void activated.push(id) },
      );
      views.registerViewContainer({ id, title: id, icon: id }, 'activityBar', id);
    }
    await settle();

    expect(views.activeContainerId).toBe('first');
    expect(activated).toEqual(['first']);
  });
});

describe('ViewService provider before contribution', () => {
  it('keeps a provider registered before its view, as the first container activates mid-registration', async () => {
    // The order initializeWorkbench uses: plugin, then its containers, then its views
    const container = createContainer();
    const registry = new ExtensionRegistry(container, new EventBus());
    const views = new ViewService();
    container.registerValue(ServiceTokens.ViewExtensionPoint, views);
    views.setActivationTrigger((event) => registry.triggerActivation(event as ActivationEvent));
    const SearchView = () => null;
    registry.register(searchDefinition, {
      activate(context) {
        context.container
          .resolve<ViewService>(ServiceTokens.ViewExtensionPoint)
          .registerProvider('search.results', { component: SearchView }, searchDefinition.id);
      },
    });
    views.registerViewContainer({ id: 'search', title: 'Search', icon: 'search' }, 'activityBar', searchDefinition.id);
    views.registerContribution({ id: 'search.results', name: 'Results' }, 'search', searchDefinition.id);
    await settle();

    expect(views.getViewsForContainer('search').map((v) => v.id)).toEqual(['search.results']);
    expect(views.getViewProvider('search.results')?.component).toBe(SearchView);
  });
});
