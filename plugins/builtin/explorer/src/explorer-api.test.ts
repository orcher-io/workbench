import { describe, expect, it } from 'vitest';
import type { IRoutingService, ITreeViewService } from '@orcher/workbench-plugin-api';
import { ExplorerRegistry, ViewService, type MenuTreeNode } from '@orcher/workbench-services';
import { ExplorerAPI } from './explorer-api';

/** The tree view each section registers, as the explorer hands it over. */
function explorer() {
  const registered: { id: string; options: any }[] = [];
  const trees = {
    registerTreeDataProvider: (id: string, _provider: unknown, options: unknown) => {
      registered.push({ id, options });
      return { dispose() {} };
    },
  } as unknown as ITreeViewService;
  const api = new ExplorerAPI(
    new ExplorerRegistry(),
    {} as IRoutingService,
    new ViewService(),
    trees,
    'test',
  );
  return { api, registered };
}

const node = (icon?: string): MenuTreeNode => ({
  id: 'waiting',
  item: { id: 'waiting', label: 'Waiting', icon },
  children: [],
});

describe('ExplorerAPI.registerSection', () => {
  it("draws each item's own icon when the section says how", () => {
    const { api, registered } = explorer();
    const drawn: [string | undefined, boolean][] = [];
    api.registerSection(
      { id: 'people', title: 'People', icon: 'people' },
      {
        renderItemIcon: (item, expanded) => {
          drawn.push([item.icon, expanded]);
          return `icon:${item.icon}`;
        },
      },
    );

    const renderIcon = registered[0].options.richOptions.renderIcon;
    expect(registered[0].id).toBe('explorer.people');
    expect(renderIcon(node('hourglass'), false)).toBe('icon:hourglass');
    expect(renderIcon(node('lock'), true)).toBe('icon:lock');
    expect(drawn).toEqual([
      ['hourglass', false],
      ['lock', true],
    ]);
  });

  it('keeps the tree\'s own file and folder icons otherwise', () => {
    const { api, registered } = explorer();
    api.registerSection({ id: 'files', title: 'Files', icon: 'files' });
    expect(registered[0].options.richOptions.renderIcon).toBeUndefined();
    expect(registered[0].options.richOptions.getItemType(node())).toBe('file');
  });
});
