# Workbench

A plugin-based React workbench: an IDE-style shell with an activity bar,
sidebars, tabs, splits and a command palette, where every feature is a plugin
that declares what it contributes and activates only when it is needed.

It is the UI framework behind the Orcher console.

## Packages

| Package | What it is |
| --- | --- |
| `@orcher/workbench-core` | `WorkbenchProvider` and `Shell`: bootstraps services, loads plugins, renders the layout |
| `@orcher/workbench-plugin-api` | Types for plugin definitions, modules, contributions and extension points |
| `@orcher/workbench-services` | Extension registry, commands, views, keybindings, configuration, navigation |
| `@orcher/workbench-window-manager` | Tabs, splits, drag and drop, layout persistence |
| `@orcher/workbench-ui` | Components on Radix Themes: tree view, command palette, panels, motion |
| `@orcher/workbench-di` | A small dependency-injection container |
| `@orcher/workbench-plugin-*` | Built-in plugins: welcome, settings, explorer, search, bookmarks, header, breadcrumb bar |

React 18 or later is a peer dependency.

## Using it

```tsx
import { WorkbenchProvider, Shell } from '@orcher/workbench-core';
import { welcomeDefinition, welcomeModule } from '@orcher/workbench-plugin-welcome';

export function App() {
  return (
    <WorkbenchProvider
      config={{
        theme: { appearance: 'dark' },
        plugins: [{ definition: welcomeDefinition, module: welcomeModule }],
      }}
    >
      <Shell renderEditor={(tab) => <MyEditor tab={tab} />} />
    </WorkbenchProvider>
  );
}
```

`apps/demo` is a complete Next.js example.

## Writing a plugin

A plugin is two parts. The **definition** is static data: what the plugin
contributes and which events activate it. The **module** is the code that runs
on activation.

```ts
// definition.ts
import type { PluginDefinition } from '@orcher/workbench-plugin-api';

export const notesDefinition: PluginDefinition = {
  id: 'acme-notes',
  version: '0.1.0',
  name: 'Notes',
  activationEvents: ['onView:notes'],
  contributes: {
    viewContainers: { activityBar: [{ id: 'notes', title: 'Notes', icon: 'notes' }] },
    views: { notes: [{ id: 'notes.list', name: 'Notes' }] },
    commands: [{ id: 'notes.create', title: 'New Note', category: 'Notes' }],
    keybindings: [{ command: 'notes.create', key: 'Ctrl+Alt+N', mac: 'Cmd+Alt+N' }],
  },
};

// module.ts
import type { PluginModule, ICommandExtensionPoint, IViewExtensionPoint } from '@orcher/workbench-plugin-api';
import { ServiceTokens } from '@orcher/workbench-plugin-api';

export const notesModule: PluginModule = {
  activate(context) {
    const views = context.container.resolve<IViewExtensionPoint>(ServiceTokens.ViewExtensionPoint);
    const commands = context.container.resolve<ICommandExtensionPoint>(ServiceTokens.CommandExtensionPoint);

    context.subscriptions.push(
      views.registerProvider('notes.list', { component: NotesList }, context.definition.id),
      commands.registerHandler('notes.create', createNote, context.definition.id),
    );
  },
};
```

Contributions are registered up front, so the activity bar, command palette
and keybindings know about a plugin before its code runs. Activation events
decide when it runs:

- `onStartup`: when the workbench starts
- `onView:<id>`: when a view container, or a view inside it, opens
- `onCommand:<id>`: the first time the command runs
- `onEditor:<id>`: when a tab with that editor becomes active
- `*`: immediately

Pass modules through `lazyPlugins` with a loader instead of `plugins` to load
their code on activation as well.

Scaffold a new plugin with the generator:

```bash
pnpm g:plugin --name notes            # --withEditor, --withView, --withCommand
```

## Window manager

```ts
import { useWindowManager } from '@orcher/workbench-window-manager';

const { openTab, closeTab, split } = useWindowManager();

openTab({ uri: 'notes://42', title: 'Note 42', editorId: 'notes.editor', pinned: false, preview: true, dirty: false });
split(paneId, 'horizontal');
```

Tabs can be reordered and dragged to the edges of a pane to split it. The
layout persists to `localStorage`.

## Development

```bash
pnpm install
pnpm dev          # the demo, at http://localhost:4200
pnpm build        # every package
pnpm typecheck
pnpm test:run
```

CI runs a frozen install, `nx sync:check`, build, typecheck and tests on every
pull request.

## Releasing

1. Bump versions in a pull request: `pnpm release --skip-publish`.
2. Merge it, then run the **Publish** workflow from the Actions tab. It
   publishes every package whose version is not on npm yet, through npm
   trusted publishing, so no token is involved.

A brand-new package has to exist on npm before it can trust the workflow:
publish its first version by hand (`npm login`, then `pnpm publish --access
public` in its folder), then register the workflow as its trusted publisher:

```bash
npx -y npm@^11.15.0 trust github @orcher/workbench-<name> \
  --repo orcher-io/workbench --file publish.yml --allow-publish
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
