import { dissolveAllGroups, dissolveGroup } from './dissolveGroup';

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

export async function openTabGroups(): Promise<void> {
  if (dismiss) {
    dismiss();
    return;
  }
  const parentDocument = window.document;
  const previousFocus = parentDocument.activeElement;
  // Surfingkeys ignores frames whose layout viewport is <= 16px wide.
  // Scale this private frame to the screen and counter-scale its content, so
  // the dialog keeps ordinary dimensions without entering Surfingkeys modes.
  const container = parentDocument.createElement('div');
  container.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
  const host = parentDocument.createElement('iframe');
  host.title = 'Tab groups';
  host.setAttribute('sandbox', 'allow-same-origin');
  host.style.cssText = 'all:initial;position:absolute;inset:0;width:16px;border:0;';
  const sizeFrame = () => {
    host.style.setProperty('zoom', String(window.innerWidth / 16));
    host.style.height = `${(16 * window.innerHeight) / window.innerWidth}px`;
  };
  sizeFrame();
  container.append(host);
  let closed = false;
  let resize: (() => void) | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    container.remove();
    if (resize) window.removeEventListener('resize', resize);
    dismiss = undefined;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  dismiss = close;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error('This page blocked the tab-group dialog.')),
        2000,
      );
      host.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      host.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('This page blocked the tab-group dialog.'));
      };
      parentDocument.documentElement.append(container);
    });
    if (closed) return;
    if (!host.contentDocument || !host.contentWindow)
      throw new Error('This page blocked the tab-group dialog.');
  } catch (reason) {
    if (closed) return;
    close();
    api.Front.showBanner(reason instanceof Error ? reason.message : String(reason), 'error');
    return;
  }
  const document = host.contentDocument;
  const dialogWindow = host.contentWindow;
  if (!document || !dialogWindow) {
    close();
    return;
  }
  host.onload = null;
  document.head.replaceChildren();
  document.body.replaceChildren();
  const style = document.createElement('style');
  style.textContent = `
    html { height: 100%; overflow: hidden; color-scheme: dark; }
    body { margin: 0; width: var(--screen-width); min-height: var(--screen-height); background: #0009; display: grid;
      place-items: start center; padding-top: calc(var(--screen-height) * .1); box-sizing: border-box;
      color: #eee; font: 15px/1.5 system-ui; }
    * { box-sizing: border-box; }
    section { width: min(640px, calc(var(--screen-width) * .94)); max-height: calc(var(--screen-height) * .8); overflow: auto; padding: 22px;
      background: #202127; border: 1px solid #555; border-radius: 12px; box-shadow: 0 18px 60px #0008; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    p { color: #bbb; margin: 8px 0; }
    input, select, button { font: inherit; color: inherit; background: #30323b;
      border: 1px solid #666; border-radius: 6px; padding: 8px 10px; }
    input, select { width: 100%; margin: 6px 0 12px; }
    button { cursor: pointer; text-align: left; }
    button:hover, button:focus-visible { background: #454958; outline: 2px solid #9abaff; }
    button:disabled { opacity: .5; cursor: default; }
    nav { display: grid; gap: 8px; margin-top: 12px; }
    footer { color: #bbb; margin-top: 16px; font-size: 13px; }
    input:focus-visible, select:focus-visible { outline: 2px solid #9abaff; }
    #groups { display: grid; gap: 8px; }
    #groups button { width: 100%; }
    #status { color: #ffcf80; white-space: pre-wrap; }
    .danger { border-color: #ef8585; }
  `;
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Tab groups');
  const sheet = new (dialogWindow as Window & { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet();
  sheet.replaceSync(style.textContent ?? '');
  document.adoptedStyleSheets = [sheet];
  document.body.append(panel);
  resize = () => {
    sizeFrame();
    document.body.style.transform = `scale(${16 / window.innerWidth})`;
    document.body.style.transformOrigin = '0 0';
    document.body.style.setProperty('--screen-width', `${window.innerWidth}px`);
    document.body.style.setProperty('--screen-height', `${window.innerHeight}px`);
  };
  resize();
  window.addEventListener('resize', resize);
  document.body.addEventListener('click', (event) => {
    if (event.target === document.body) close();
  });
  for (const type of ['focus', 'focusin', 'mousedown', 'keyup']) {
    dialogWindow.addEventListener(type, (event) => event.stopImmediatePropagation(), true);
  }
  dialogWindow.addEventListener(
    'keydown',
    (event) => {
      event.stopImmediatePropagation();
      const target = event.target as HTMLElement | null;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
        ),
      );
      const index = target ? controls.indexOf(target) : -1;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (target?.tagName === 'INPUT' && event.key === 'Enter') {
        event.preventDefault();
        if ((target as HTMLInputElement).type === 'search')
          panel.querySelector<HTMLButtonElement>('#groups button')?.click();
        else panel.querySelector<HTMLButtonElement>('button[data-submit]')?.click();
      } else if (
        target?.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'search' &&
        event.key === 'ArrowDown'
      ) {
        event.preventDefault();
        panel.querySelector<HTMLButtonElement>('#groups button')?.focus();
      } else if (target?.tagName === 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        (target as HTMLButtonElement).click();
      } else if (
        target?.tagName === 'SELECT' &&
        ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
      ) {
        event.preventDefault();
        const select = target as HTMLSelectElement;
        select.selectedIndex =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? select.options.length - 1
              : Math.max(
                  0,
                  Math.min(
                    select.options.length - 1,
                    select.selectedIndex + (event.key === 'ArrowDown' ? 1 : -1),
                  ),
                );
        select.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (event.key === 'Tab') {
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      } else if (
        target?.tagName === 'BUTTON' &&
        ['ArrowDown', 'ArrowUp', 'j', 'k', 'Home', 'End'].includes(event.key)
      ) {
        event.preventDefault();
        const step = event.key === 'ArrowUp' || event.key === 'k' ? -1 : 1;
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? controls.length - 1
              : (index + step + controls.length) % controls.length;
        controls[next]?.focus();
      }
    },
    true,
  );

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
    panel.append(
      status,
      element('footer', '↑↓ Move · Tab / Shift-Tab Next / previous · Enter Select · Esc Close'),
    );
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
        if (node.isConnected && document.activeElement === document.body) node.focus();
      }
    };
    parent.append(node);
    return node;
  }
  const name = (group: TabGroup) => group.title || 'Untitled group';

  async function dissolve(group?: TabGroup): Promise<void> {
    const content = page(group ? `Dissolving ${name(group)}` : 'Dissolving all groups in this window');
    content.append(
      element('p', 'Tabs are visited one at a time, then focus returns here. All tabs stay open.'),
    );
    let cancelled = false;
    button(content, 'Stop', () => {
      cancelled = true;
    }).focus();
    const progress = (message: string) => {
      if (!closed) error(message);
    };
    const isCancelled = () => closed || cancelled;
    const result = group
      ? await dissolveGroup(group.id, progress, isCancelled)
      : await dissolveAllGroups(progress, isCancelled);
    if (closed) return;
    const done = page(
      result.remaining.length
        ? group
          ? 'Group partly dissolved'
          : 'Groups partly dissolved'
        : group
          ? 'Group dissolved'
          : 'All groups dissolved in this window',
    );
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
      done.append(element('p', `${result.added} tabs joined during the operation and were left grouped.`));
    button(done, 'Back to groups', list).focus();
  }

  function edit(group?: TabGroup): void {
    const content = page(group ? `Edit ${name(group)}` : 'Create group with this tab');
    const label = element('label', 'Name');
    const title = element('input');
    title.setAttribute('aria-label', 'Name');
    title.value = group?.title ?? '';
    label.append(title);
    const colorLabel = element('label', 'Color');
    const color = element('select');
    color.setAttribute('aria-label', 'Color');
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
    const save = button(actions, group ? 'Save changes' : 'Create', async () => {
      // createTabGroup also updates metadata. Reuse one existing member so editing
      // another group never moves the current tab into it.
      const args: Record<string, unknown> = { title: title.value.trim(), color: color.value };
      if (group) {
        const fresh = (await request<{ groups: TabGroup[] }>('getTabGroups')).groups.find(
          (item) => item.id === group.id,
        );
        if (!fresh?.tabs.length) throw new Error('This group no longer has open tabs. Refresh the list.');
        args.groupId = fresh.id;
        args.tabIds = [fresh.tabs[0].id];
      }
      await request('createTabGroup', args);
      await list();
    });
    button(actions, 'Back', list);
    save.dataset.submit = 'true';
    title.focus();
    title.select();
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
      const dissolveButton = button(actions, 'Dissolve group — keep tabs open', () => dissolve(group));
      dissolveButton.disabled = group.windowId !== windowId;
      if (dissolveButton.disabled) dissolveButton.title = 'Switch to this group’s window to dissolve it.';
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
    const dissolveAll = button(actions, 'Dissolve all groups in this window — keep tabs open', () =>
      dissolve(),
    );
    dissolveAll.disabled = true;
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
      dissolveAll.disabled = !result.groups.some((group) => group.windowId === windowId && group.tabs.length);
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
      render();
      if (document.activeElement === document.body) search.focus();
    } catch (reason) {
      if (!closed && content.isConnected) error(reason);
    }
  }
  dialogWindow.focus();
  void list();
}
