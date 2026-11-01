import { dissolveGroup } from './dissolveGroup';

interface GroupTab {
  id: number;
  title: string;
}

interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
  windowId: number;
  active: boolean;
  tabs: GroupTab[];
}

interface MenuItem {
  title: string;
  run: () => void | Promise<void>;
}

const COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
const name = (group: TabGroup) => group.title || 'Untitled group';

function request<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Surfingkeys did not respond.')), 4000);
    try {
      api.RUNTIME(action, args, (response) => {
        clearTimeout(timeout);
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    } catch (reason) {
      clearTimeout(timeout);
      reject(reason);
    }
  });
}

const getGroups = () => request<{ groups: TabGroup[] }>('getTabGroups').then((response) => response.groups);

async function currentGroup(id: number): Promise<TabGroup> {
  const group = (await getGroups()).find((item) => item.id === id);
  if (!group) throw new Error('This group no longer exists. Open ;g to refresh.');
  return group;
}

function report(reason: unknown): void {
  api.Front.showBanner(reason instanceof Error ? reason.message : String(reason), 'error');
}

// UserURLs supplies Surfingkeys' own focused input, filtering, selection, and
// Escape handling. onEnter consumes our opaque IDs; no URLs are opened.
function menu(items: MenuItem[]): void {
  api.Front.openOmnibar({
    type: 'UserURLs',
    extra: items.map((item, index) => ({ title: item.title, url: '', id: String(index) })),
    onEnter: (selected) => {
      const item = items.find((_, index) => String(index) === selected.id);
      if (!item) return;
      // Let the current frontend finish hiding before opening the next picker
      // or a native input prompt. This also keeps focus in the next picker.
      window.setTimeout(() => {
        void Promise.resolve().then(item.run).catch(report);
      }, 50);
    },
  });
}

function colorMenu(title: string, run: (color: string) => Promise<void>): void {
  menu(COLORS.map((color) => ({ title: `${title}: ${color}`, run: () => run(color) })));
}

async function createGroup(): Promise<void> {
  const title = window.prompt('New tab group name');
  if (title === null) return;
  colorMenu('Create group with this tab', async (color) => {
    await request('createTabGroup', { title: title.trim(), color });
    api.Front.showBanner('Group created. Press ;g to manage it.', 'success');
  });
}

async function editGroup(id: number, color?: string): Promise<void> {
  let group = await currentGroup(id);
  const title = color ? (group.title ?? '') : window.prompt('Rename tab group', group.title ?? '');
  if (title === null) return;
  // Metadata updates reuse a live member; a cached member may have moved to
  // another group while the picker or prompt was open.
  group = await currentGroup(id);
  if (!group.tabs.length) throw new Error('This group has no open tabs.');
  await request('createTabGroup', {
    groupId: id,
    tabIds: [group.tabs[0].id],
    title: title.trim(),
    color: color ?? group.color,
  });
  api.Front.showBanner('Group updated.', 'success');
}

async function showActions(id: number, windowId: number): Promise<void> {
  const group = await currentGroup(id);
  const sameWindow = group.windowId === windowId;
  const actions: MenuItem[] = [];
  if (sameWindow && !group.active)
    actions.push({
      title: 'Add / move this tab to group',
      run: async () => {
        await request('createTabGroup', { groupId: id });
      },
    });
  if (group.active)
    actions.push({
      title: 'Remove this tab from group — keep tab open',
      run: () => api.RUNTIME('ungroupTab'),
    });
  actions.push(
    { title: 'Rename group', run: () => editGroup(id) },
    { title: 'Change group color', run: () => colorMenu('Group color', (color) => editGroup(id, color)) },
    {
      title: group.collapsed ? 'Expand group' : 'Collapse group',
      run: () => {
        api.RUNTIME('collapseGroup', { groupId: id, collapsed: !group.collapsed });
      },
    },
  );
  if (sameWindow)
    actions.push({
      title: 'Dissolve group — keep all tabs open',
      run: async () => {
        const result = await dissolveGroup(
          id,
          () => {},
          () => false,
        );
        if (!result.remaining.length)
          api.Front.showBanner('Group dissolved. All tabs remain open.', 'success');
        else
          menu([
            {
              title: `${result.remaining.length} tabs still grouped — retry after loading this config`,
              run: () => showActions(id, windowId),
            },
            ...result.remaining.map((title) => ({
              title: `Still grouped: ${title}`,
              run: () => showActions(id, windowId),
            })),
            { title: 'Back to groups', run: openTabGroups },
          ]);
      },
    });
  actions.push(
    {
      title: sameWindow ? 'Switch to group' : 'Switch to group in other window',
      run: async () => {
        const fresh = await currentGroup(id);
        if (fresh.tabs.length) api.RUNTIME('focusTab', { tabId: fresh.tabs[0].id, windowId: fresh.windowId });
      },
    },
    {
      title: 'Close group and all its tabs…',
      run: async () => {
        const fresh = await currentGroup(id);
        menu([
          { title: 'Cancel — keep tabs open', run: () => showActions(id, windowId) },
          {
            title: `Confirm close ${fresh.tabs.length} tabs in ${name(fresh)}`,
            run: async () => {
              const latest = await currentGroup(id);
              const ids = (item: TabGroup) =>
                item.tabs
                  .map((tab) => tab.id)
                  .sort()
                  .join();
              if (ids(latest) !== ids(fresh))
                throw new Error('Group membership changed. Review it before closing.');
              api.RUNTIME('closeTabByIds', { tabIds: latest.tabs.map((tab) => tab.id) });
            },
          },
        ]);
      },
    },
    { title: 'Back to groups', run: openTabGroups },
  );
  menu(actions.map((action) => ({ ...action, title: `${action.title} · ${name(group)}` })));
}

export async function openTabGroups(): Promise<void> {
  try {
    const [groups, current] = await Promise.all([
      getGroups(),
      request<{ tabs: { windowId: number }[] }>('getTabs', {
        queryInfo: { currentWindow: true, active: true },
      }),
    ]);
    if (!Array.isArray(groups)) throw new Error('Tab groups are unavailable in this browser.');
    const windowId = current.tabs[0]?.windowId;
    if (windowId === undefined) throw new Error('Could not determine the current window.');
    groups.sort((a, b) => Number(b.active) - Number(a.active) || name(a).localeCompare(name(b)));
    menu([
      ...groups.map((group) => ({
        title: `${group.active ? 'Current group: ' : ''}${name(group)} · ${group.tabs.length} tabs · ${group.color}${group.windowId !== windowId ? ' · other window' : ''} · ${group.tabs.map((tab) => tab.title).join(' / ')}`,
        run: () => showActions(group.id, windowId),
      })),
      { title: 'Create new group with this tab…', run: createGroup },
    ]);
  } catch (reason) {
    report(reason);
  }
}
