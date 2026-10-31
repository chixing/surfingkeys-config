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

const COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
let dismiss: (() => void) | undefined;

function request<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Surfingkeys did not respond.')), 4000);
    api.RUNTIME(action, args, (response) => {
      clearTimeout(timeout);
      if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

export function openTabGroups(): void {
  if (dismiss) {
    dismiss();
    return;
  }
  const previousFocus = document.activeElement;
  const host = document.createElement('div');
  (host as any).fromSurfingKeys = true;
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; position: fixed; inset: 0; z-index: 2147483647;
      background: #0009; display: grid; place-items: start center; padding-top: 10vh;
      color: #eee; font: 15px/1.5 system-ui; }
    * { box-sizing: border-box; }
    section { width: min(640px, 94vw); max-height: 80vh; overflow: auto; padding: 22px;
      background: #202127; border: 1px solid #555; border-radius: 12px; box-shadow: 0 18px 60px #0008; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    p { color: #bbb; margin: 8px 0; }
    input, select, button { font: inherit; color: inherit; background: #30323b;
      border: 1px solid #666; border-radius: 6px; padding: 8px 10px; }
    input, select { width: 100%; margin: 6px 0 12px; }
    button { cursor: pointer; text-align: left; }
    button:hover, button:focus-visible { background: #454958; outline: 2px solid #9abaff; }
    button:disabled { opacity: .5; cursor: default; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    #groups { display: grid; gap: 8px; }
    #groups button { width: 100%; }
    #status { color: #ffcf80; white-space: pre-wrap; }
    .danger { border-color: #ef8585; }
  `;
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Tab groups');
  shadow.append(style, panel);
  document.documentElement.append(host);
  let closed = false;
  const close = () => {
    closed = true;
    host.remove();
    dismiss = undefined;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  dismiss = close;
  host.addEventListener('click', (event) => {
    if (event.composedPath()[0] === host) close();
  });
  host.addEventListener('keydown', (event) => {
    (event as any).sk_suppressed = true;
    (event as any).sk_stopPropagation = true;
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'Tab') {
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>('button:not(:disabled), input, select'),
      );
      const index = controls.indexOf(shadow.activeElement as HTMLElement);
      event.preventDefault();
      controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    }
  });

  function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.textContent = text;
    (node as any).fromSurfingKeys = true;
    return node;
  }
  function page(title: string): HTMLElement {
    panel.replaceChildren(element('h2', title));
    const content = element('div');
    panel.append(content);
    const status = element('p');
    status.id = 'status';
    status.setAttribute('role', 'status');
    panel.append(status);
    return content;
  }
  function error(reason: unknown): void {
    const status = panel.querySelector('#status');
    if (status) status.textContent = reason instanceof Error ? reason.message : String(reason);
  }
  function button(parent: HTMLElement, label: string, action: () => void | Promise<void>): HTMLButtonElement {
    const node = element('button', label);
    node.type = 'button';
    node.onclick = async () => {
      node.disabled = true;
      try {
        await action();
      } catch (reason) {
        error(reason);
      } finally {
        node.disabled = false;
      }
    };
    parent.append(node);
    return node;
  }
  const name = (group: TabGroup) => group.title || 'Untitled group';

  function edit(group?: TabGroup): void {
    const content = page(group ? `Edit ${name(group)}` : 'Create group with this tab');
    const label = element('label', 'Name');
    const title = element('input');
    title.value = group?.title ?? '';
    label.append(title);
    const colorLabel = element('label', 'Color');
    const color = element('select');
    for (const value of COLORS) {
      const option = element('option', value);
      option.value = value;
      color.append(option);
    }
    color.value = group?.color ?? 'blue';
    colorLabel.append(color);
    content.append(label, colorLabel);
    const actions = element('nav');
    content.append(actions);
    button(actions, group ? 'Save changes' : 'Create', async () => {
      // createTabGroup also updates metadata. Reuse one existing member so editing
      // another group never moves the current tab into it.
      const args: Record<string, unknown> = { title: title.value.trim(), color: color.value };
      if (group) {
        if (!group.tabs.length) throw new Error('This group has no open tabs. Refresh the list.');
        args.groupId = group.id;
        args.tabIds = [group.tabs[0].id];
      }
      await request('createTabGroup', args);
      await list();
    });
    button(actions, 'Back', list);
    title.focus();
  }

  function details(group: TabGroup, windowId: number): void {
    const content = page(name(group));
    content.append(element('p', `${group.tabs.length} tabs · ${group.color}`));
    const actions = element('nav');
    content.append(actions);
    const add = button(actions, 'Add / move this tab here', async () => {
      await request('createTabGroup', { groupId: group.id });
      close();
    });
    add.disabled = group.active || group.windowId !== windowId;
    if (group.windowId !== windowId) content.append(element('p', 'This group is in another window.'));
    if (group.active) {
      button(actions, 'Remove this tab from group', () => {
        api.RUNTIME('ungroupTab');
        close();
      });
    }
    button(actions, 'Rename / recolor', () => edit(group));
    button(actions, group.collapsed ? 'Expand' : 'Collapse', () => {
      api.RUNTIME('collapseGroup', { groupId: group.id, collapsed: !group.collapsed });
      close();
    });
    if (group.tabs.length) {
      const dissolve = button(actions, 'Dissolve group — keep tabs open', async () => {
        const content = page(`Dissolving ${name(group)}`);
        content.append(element('p', 'Tabs are visited one at a time, then focus returns here.'));
        let cancelled = false;
        button(content, 'Stop', () => {
          cancelled = true;
        });
        const result = await dissolveGroup(
          group.id,
          (message) => {
            if (!closed) error(message);
          },
          () => closed || cancelled,
        );
        if (closed) return;
        const done = page(result.remaining.length ? 'Group partly dissolved' : 'Group dissolved');
        done.append(
          element(
            'p',
            result.remaining.length
              ? `${result.remaining.length} tabs remain grouped. They may need this config loaded or Surfingkeys enabled. Retry after opening them, or use Chrome’s Ungroup command.`
              : 'All tabs are ungrouped and remain open.',
          ),
        );
        for (const title of result.remaining) done.append(element('p', title));
        if (result.added)
          done.append(
            element('p', `${result.added} tabs joined during the operation and were left grouped.`),
          );
        button(done, 'Back to groups', list).focus();
      });
      dissolve.disabled = group.windowId !== windowId;
      if (dissolve.disabled) dissolve.title = 'Switch to this group’s window to dissolve it.';
      button(actions, 'Switch to group', () => {
        api.RUNTIME('focusTab', { tabId: group.tabs[0].id, windowId: group.windowId });
        close();
      });
      button(actions, 'Close group…', () => {
        const confirmation = page(`Close ${name(group)}?`);
        confirmation.append(element('p', `This closes all ${group.tabs.length} tabs in this group.`));
        const choices = element('nav');
        confirmation.append(choices);
        button(choices, 'Cancel', () => details(group, windowId)).focus();
        button(choices, `Close ${group.tabs.length} tabs`, async () => {
          const fresh = await request<{ groups: TabGroup[] }>('getTabGroups');
          const current = fresh.groups.find((item) => item.id === group.id);
          if (!current) throw new Error('This group no longer exists.');
          if (
            current.tabs
              .map((tab) => tab.id)
              .sort()
              .join() !==
            group.tabs
              .map((tab) => tab.id)
              .sort()
              .join()
          ) {
            throw new Error('Group membership changed. Go back and review it before closing.');
          }
          api.RUNTIME('closeTabByIds', { tabIds: current.tabs.map((tab) => tab.id) });
          close();
        }).className = 'danger';
      });
    }
    button(actions, 'Back', list);
    actions.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }

  async function list(): Promise<void> {
    const content = page('Tab groups');
    const search = element('input');
    search.type = 'search';
    search.placeholder = 'Search groups or tab titles';
    search.setAttribute('aria-label', 'Search groups or tab titles');
    const actions = element('nav');
    const rows = element('div');
    rows.id = 'groups';
    content.append(search, rows, actions);
    button(actions, 'Create group', () => edit());
    button(actions, 'Close menu', close);
    search.focus();
    try {
      const [result, current] = await Promise.all([
        request<{ groups: TabGroup[] }>('getTabGroups'),
        request<{ tabs: { windowId: number }[] }>('getTabs', {
          queryInfo: { currentWindow: true, active: true },
        }),
      ]);
      if (closed || !content.isConnected) return;
      if (!Array.isArray(result?.groups)) throw new Error('Tab groups are unavailable in this browser.');
      const windowId = current.tabs[0]?.windowId;
      if (windowId === undefined) throw new Error('Could not determine the current window.');
      const render = () => {
        rows.replaceChildren();
        const query = search.value.toLowerCase();
        const groups = result.groups.filter((group) =>
          [name(group), ...group.tabs.map((tab) => tab.title)].join(' ').toLowerCase().includes(query),
        );
        groups.sort((a, b) => Number(b.active) - Number(a.active) || name(a).localeCompare(name(b)));
        for (const group of groups) {
          button(
            rows,
            `${group.active ? '● ' : ''}${name(group)} · ${group.tabs.length} tabs · ${group.color}${group.windowId !== windowId ? ' · other window' : ''}`,
            () => details(group, windowId),
          );
        }
        if (!groups.length)
          rows.append(element('p', result.groups.length ? 'No matching groups.' : 'No groups yet.'));
      };
      search.oninput = render;
      search.onkeydown = (event) => {
        if (event.key === 'Enter') rows.querySelector('button')?.click();
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          rows.querySelector('button')?.focus();
        }
      };
      render();
    } catch (reason) {
      if (!closed && content.isConnected) error(reason);
    }
  }
  void list();
}
