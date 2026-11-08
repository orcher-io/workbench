import { openTab } from './tab-operations';
import type { LayoutState } from '../models';

const layout: LayoutState = {
  id: 'layout',
  version: 1,
  root: { type: 'tabGroup', id: 'pane', tabs: [], activeTabId: null },
  activePaneId: 'pane',
};

function opened(result: ReturnType<typeof openTab>) {
  const root = result.layout.root;
  if (root.type !== 'tabGroup') throw new Error('expected a tab group');
  return root.tabs[0];
}

describe('openTab', () => {
  it('opens a clean, unpinned, non-preview tab from the fields that describe it', () => {
    const tab = opened(openTab(layout, { title: 'A', editorId: 'e', uri: 'x://a' }));
    expect(tab).toMatchObject({ pinned: false, preview: false, dirty: false });
  });

  it('lets options decide pinned and preview over the tab fields', () => {
    const tab = opened(
      openTab(layout, { title: 'A', editorId: 'e', uri: 'x://a', pinned: false, preview: true }, { pin: true, preview: false }),
    );
    expect(tab).toMatchObject({ pinned: true, preview: false });
  });
});
