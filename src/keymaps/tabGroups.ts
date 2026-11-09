import { dissolveAllGroups, dissolveGroup } from './dissolveGroup';
import type { DissolveResult } from './dissolveGroup';

interface TabGroup {
  id: number;
  title?: string;
  color: string;
  collapsed: boolean;
  windowId: number;
  active: boolean;
  tabs: { id: number; title: string }[];
}

const COLORS: Record<string, string> = {
  grey: '#b0b4bc',
  blue: '#8ab4f8',
  red: '#f28b82',
  yellow: '#fdd663',
  green: '#81c995',
  pink: '#ff8bcb',
  purple: '#c58af9',
  cyan: '#78d9ec',
  orange: '#fcad70',
};
let dismiss: (() => void) | undefined;

function request<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Surfingkeys did not respond. Try again.')), 5000);
    try {
      api.RUNTIME(action, args, (response) => {
        clearTimeout(timer);
        if (response?.error) reject(new Error(response.error));
        else resolve(response);
      });
    } catch (reason) {
      clearTimeout(timer);
      reject(reason);
    }
  });
}

export async function openTabGroups(): Promise<void> {
  if (dismiss) {
    dismiss();
    return;
  }
  const parentDocument = window.document;
  const previousFocus = parentDocument.activeElement;
  const container = parentDocument.createElement('div');
  container.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
  // Navigate to a config-owned document instead of leaving an about:blank
  // frame, where the stock extension can bootstrap another keyboard handler.
  const frameUrl = URL.createObjectURL(
    new Blob(['<!doctype html><html><head><title>Tab groups</title></head><body></body></html>'], {
      type: 'text/html',
    }),
  );
  const host = parentDocument.createElement('iframe');
  host.title = 'Tab groups';
  host.src = frameUrl;
  host.setAttribute('data-sk-tab-groups-dialog', '');
  host.setAttribute('sandbox', 'allow-same-origin');
  host.style.cssText = 'all:initial;position:absolute;inset:0;width:100%;height:100%;border:0;';
  container.append(host);
  let closed = false;
  let resize: (() => void) | undefined;
  let restoreFocus: (() => void) | undefined;
  let stopOperation: (() => void) | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    stopOperation?.();
    container.remove();
    URL.revokeObjectURL(frameUrl);
    if (resize) window.removeEventListener('resize', resize);
    if (restoreFocus) parentDocument.removeEventListener('focusin', restoreFocus);
    dismiss = undefined;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  dismiss = close;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('This page blocked the groups dialog.')), 2000);
      host.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      host.onerror = () => {
        clearTimeout(timer);
        reject(new Error('This page blocked the groups dialog.'));
      };
      parentDocument.documentElement.append(container);
    });
    if (closed) return;
    if (!host.contentDocument || !host.contentWindow) throw new Error('This page blocked the groups dialog.');
  } catch (reason) {
    if (!closed) {
      close();
      api.Front.showBanner(String(reason), 'error');
    }
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
  const sheet = new (dialogWindow as Window & { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet();
  sheet.replaceSync(`
    :root { color-scheme: dark; --surface: #202127; --text: #eeeef2; --muted: #b4b7c2; --focus: #a7c4ff; }
    * { box-sizing: border-box; }
    html { overflow: hidden; }
    body { margin: 0; width: var(--screen-width); min-height: var(--screen-height); background: #0009;
      padding-top: min(100px, calc(var(--screen-height) * .1)); display: grid; place-items: start center;
      color: var(--text); font: 14px/1.5 system-ui; }
    section { width: min(540px, calc(var(--screen-width) - 24px)); max-height: calc(var(--screen-height) * .82);
      overflow: auto; padding: 18px; background: var(--surface); border-radius: 12px; box-shadow: 0 18px 60px #0008; }
    header, .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    header { margin-bottom: 14px; }
    h2 { flex: 1; min-width: 0; margin: 0; font-size: 18px; overflow-wrap: anywhere; }
    p { margin: 10px 0; color: var(--muted); }
    button, input, select { font: inherit; color: inherit; }
    button { border: 0; border-radius: 5px; background: transparent; padding: 7px 9px; cursor: pointer; text-align: left; }
    button:hover, button:focus-visible { background: #353944; }
    :focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
    button:disabled { color: #9499a5; cursor: default; }
    input, select { width: 100%; padding: 9px 11px; background: #2c2e36; border: 1px solid #636877; border-radius: 6px; }
    input::placeholder { color: var(--muted); }
    input { caret-color: var(--focus); }
    ::selection { background: #435a82; color: #fff; }
    label { display: block; margin: 12px 0; }
    label input, label select { margin-top: 5px; }
    #groups { display: grid; gap: 2px; margin: 10px 0; max-height: min(360px, calc(var(--screen-height) * .45)); overflow: auto; }
    .group { display: flex; gap: 10px; align-items: center; width: 100%; min-height: 40px; padding: 7px 10px; }
    .group[aria-selected=true] { background: #343a48; }
    .group-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; }
    .meta, kbd, footer, .scope { color: var(--muted); font-size: 12px; }
    .meta { white-space: nowrap; }
    kbd { font-family: inherit; margin-left: auto; padding-left: 12px; white-space: nowrap; }
    .group kbd { padding: 0; min-width: 9px; }
    .toolbar { border-top: 1px solid #414550; padding-top: 8px; }
    .toolbar .help { margin-left: auto; }
    nav.actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; margin: 12px 0; }
    nav.actions button { display: flex; align-items: center; min-height: 40px; }
    footer { margin-top: 12px; }
    #status { white-space: pre-wrap; overflow-wrap: anywhere; color: #ffcf80; }
    #status:empty { display: none; }
    .danger { color: #ffb4ad; }
    .primary { background: #353d50; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 8px 18px; }
    dt { color: var(--focus); } dd { margin: 0; color: var(--muted); }
    * { scrollbar-width: thin; scrollbar-color: #686d7b var(--surface); }
  `);
  document.adoptedStyleSheets = [sheet];
  const panel = document.createElement('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Tab groups');
  document.body.append(panel);
  resize = () => {
    document.body.style.setProperty('--screen-width', `${window.innerWidth}px`);
    document.body.style.setProperty('--screen-height', `${window.innerHeight}px`);
  };
  resize();
  window.addEventListener('resize', resize);
  document.body.onclick = (event) => {
    if (event.target === document.body) close();
  };
  let lastControl: HTMLElement | undefined;
  restoreFocus = () => {
    if (!closed && parentDocument.activeElement !== host && lastControl?.isConnected) {
      host.focus({ preventScroll: true });
      lastControl.focus({ preventScroll: true });
    }
  };
  parentDocument.addEventListener('focusin', restoreFocus);
  for (const type of ['focus', 'focusin', 'mousedown', 'keyup'])
    dialogWindow.addEventListener(
      type,
      (event) => {
        const target = event.target as HTMLElement | null;
        if (type === 'focusin' && ['INPUT', 'BUTTON', 'SELECT'].includes(target?.tagName ?? ''))
          lastControl = target ?? undefined;
        event.stopImmediatePropagation();
      },
      true,
    );

  let busy = false;
  let back: () => void = close;
  let shortcuts = new Map<string, HTMLButtonElement>();
  let search: HTMLInputElement | undefined;
  let filtered: TabGroup[] = [];
  let selectedId: number | undefined;
  let rememberedSearch = '';
  let showOtherWindows = false;
  let windowId: number | undefined;
  let onList = false;
  const name = (group: TabGroup) => group.title || 'Untitled group';
  const selected = () => filtered.find((group) => group.id === selectedId);
  function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.textContent = text;
    (node as any).fromSurfingKeys = true;
    return node;
  }
  function status(message: unknown): void {
    const node = panel.querySelector('#status');
    if (node) node.textContent = message instanceof Error ? message.message : String(message);
  }
  function page(
    title: string,
    goBack: () => void = () => {
      void list();
    },
  ): HTMLElement {
    onList = false;
    search = undefined;
    shortcuts = new Map();
    back = goBack;
    const header = element('header');
    header.append(element('h2', title));
    if (goBack !== close) button(header, 'Back', goBack, 'Escape');
    const content = element('div');
    const message = element('p');
    message.id = 'status';
    message.setAttribute('role', 'status');
    const footer = element(
      'footer',
      goBack === close
        ? 'Type to filter · Enter Actions · Ctrl+Enter Switch'
        : 'Arrows Move · Enter Select · Letter shortcuts · Esc Back',
    );
    panel.replaceChildren(header, content, message, footer);
    return content;
  }
  function button(
    parent: HTMLElement,
    label: string,
    action: () => void | Promise<void>,
    key?: string,
  ): HTMLButtonElement {
    const node = element('button');
    node.type = 'button';
    node.append(element('span', label));
    if (key) {
      node.append(element('kbd', key === 'Escape' ? 'Esc' : key));
      shortcuts.set(key.toLowerCase(), node);
    }
    node.onclick = async () => {
      if (busy || node.disabled) return;
      busy = true;
      panel.setAttribute('aria-busy', 'true');
      node.disabled = true;
      try {
        await action();
      } catch (reason) {
        if (!closed) status(reason);
      } finally {
        busy = false;
        panel.removeAttribute('aria-busy');
        node.disabled = false;
        if (node.isConnected && document.activeElement === document.body) node.focus();
      }
    };
    parent.append(node);
    return node;
  }
  function pick(index: number): void {
    selectedId = filtered[index]?.id;
    for (const row of Array.from(panel.querySelectorAll<HTMLButtonElement>('#groups button'))) {
      const active = Number(row.dataset.id) === selectedId;
      row.setAttribute('aria-selected', String(active));
      if (active) {
        search?.setAttribute('aria-activedescendant', row.id);
        row.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  async function ungroup(group?: TabGroup): Promise<void> {
    const content = page(group ? `Dissolving ${name(group)}` : 'Dissolving groups in this window', close);
    content.append(
      element('p', 'Loaded tabs ungroup together. Remaining tabs are visited individually. Tabs stay open.'),
    );
    let cancelled = false;
    stopOperation = () => {
      cancelled = true;
      status('Stopping…');
    };
    const stop = button(content, 'Stop', () => {}, 's');
    stop.onclick = () => stopOperation?.();
    stop.focus({ preventScroll: true });
    const footer = panel.querySelector('footer');
    if (footer) footer.textContent = 'S Stop · Esc Stop and close';
    const progress = (message: string) => {
      if (!closed) status(message);
    };
    const isCancelled = () => closed || cancelled;
    let result: DissolveResult;
    try {
      result = group
        ? await dissolveGroup(group.id, progress, isCancelled)
        : await dissolveAllGroups(progress, isCancelled);
    } finally {
      stopOperation = undefined;
    }
    if (closed) return;
    if (result.remaining.length) {
      const done = page(cancelled ? 'Stopped' : 'Some tabs remain grouped');
      done.append(
        element(
          'p',
          `${result.remaining.length} ${result.remaining.length === 1 ? 'tab remains' : 'tabs remain'} grouped. Restricted pages or pages without this config may need Chrome’s Ungroup command.`,
        ),
      );
      if (result.added)
        done.append(
          element(
            'p',
            `${result.added} ${result.added === 1 ? 'new tab was' : 'new tabs were'} left grouped because they joined after starting.`,
          ),
        );
      for (const title of result.remaining) done.append(element('p', title));
      button(done, 'Back to groups', list).focus({ preventScroll: true });
      return;
    }
    await list();
    status(`${group ? 'Group' : 'All groups in this window'} dissolved. All tabs stay open.`);
  }
  async function act(key: string, group: TabGroup): Promise<void> {
    if (['a', 'd', 'u'].includes(key) && group.windowId !== windowId)
      throw new Error('Switch to this group’s window first.');
    if (key === 'u' && !group.active) throw new Error('This tab is not in the selected group.');
    if (key === 's') {
      api.RUNTIME('focusTab', { tabId: group.tabs[0]?.id, windowId: group.windowId });
      close();
    } else if (key === 'a') {
      await request('createTabGroup', { groupId: group.id });
      close();
    } else if (key === 'u') {
      api.RUNTIME('ungroupTab');
      close();
    } else if (key === 'r') edit(group);
    else if (key === 'c') {
      api.RUNTIME('collapseGroup', { groupId: group.id, collapsed: !group.collapsed });
      await list();
    } else if (key === 'd') await ungroup(group);
    else if (key === 'x') confirmClose(group);
  }
  function details(group: TabGroup): void {
    const content = page(name(group));
    content.append(
      element(
        'p',
        `${group.tabs.length} ${group.tabs.length === 1 ? 'tab' : 'tabs'}${group.windowId !== windowId ? ' · Other window' : ''}`,
      ),
    );
    const actions = element('nav');
    actions.className = 'actions';
    content.append(actions);
    for (const [key, label] of [
      ['s', 'Switch to group'],
      ['a', 'Move this tab here'],
      ['r', 'Rename / color'],
      ['c', group.collapsed ? 'Expand' : 'Collapse'],
      ['d', 'Ungroup tabs'],
      ['x', 'Close group…'],
      ...(group.active ? [['u', 'Remove this tab']] : []),
    ]) {
      const control = button(actions, label, () => act(key, group), key);
      control.disabled =
        (['a', 'd', 'u'].includes(key) && group.windowId !== windowId) || (key === 'a' && group.active);
      if (key === 'x') control.className = 'danger';
      if (key === 'd') control.title = 'Dissolve this group, keeping every tab open';
    }
    actions.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }
  function edit(group?: TabGroup): void {
    const content = page(group ? `Rename ${name(group)}` : 'New group');
    const label = element('label', 'Name');
    const title = element('input');
    title.value = group?.title ?? '';
    label.append(title);
    const colorLabel = element('label', 'Color');
    const color = element('select');
    for (const value of Object.keys(COLORS)) {
      const option = element('option', value);
      option.value = value;
      color.append(option);
    }
    color.value = group?.color ?? 'blue';
    colorLabel.append(color);
    content.append(label, colorLabel);
    const save = button(content, group ? 'Save' : 'Create', async () => {
      const args: Record<string, unknown> = { title: title.value.trim(), color: color.value };
      if (group) {
        const current = (await request<{ groups: TabGroup[] }>('getTabGroups')).groups.find(
          (item) => item.id === group.id,
        );
        if (!current?.tabs.length) throw new Error('This group no longer exists. Go back to refresh.');
        args.groupId = current.id;
        args.tabIds = [current.tabs[0].id];
      }
      await request('createTabGroup', args);
      await list();
    });
    save.dataset.submit = 'true';
    save.className = 'primary';
    title.focus();
    title.select();
    const footer = panel.querySelector('footer');
    if (footer) footer.textContent = 'Enter Save · Esc Back';
  }
  function confirmClose(group: TabGroup): void {
    const content = page(`Close ${name(group)}?`, () => details(group));
    content.append(element('p', `This closes all ${group.tabs.length} tabs in this group.`));
    button(content, 'Cancel', () => details(group)).focus();
    button(
      content,
      `Close ${group.tabs.length} tabs`,
      async () => {
        const current = (await request<{ groups: TabGroup[] }>('getTabGroups')).groups.find(
          (item) => item.id === group.id,
        );
        if (
          !current ||
          current.tabs
            .map((tab) => tab.id)
            .sort()
            .join() !==
            group.tabs
              .map((tab) => tab.id)
              .sort()
              .join()
        )
          throw new Error('Group membership changed. Go back and review it before closing.');
        api.RUNTIME('closeTabByIds', { tabIds: current.tabs.map((tab) => tab.id) });
        await list();
      },
      'y',
    ).className = 'danger';
    const footer = panel.querySelector('footer');
    if (footer) footer.textContent = 'Y Close tabs · Esc Cancel';
  }
  function help(): void {
    const content = page('Keyboard shortcuts');
    const keys = element('dl');
    for (const [key, action] of [
      ['Type', 'Filter groups and tab titles'],
      ['Enter', 'Actions for the first match / selected group'],
      ['Ctrl+Enter', 'Switch to the selected group'],
      ['Alt+1–9', 'Open actions for a numbered result'],
      ['S / A / R', 'In actions: switch / move this tab / rename'],
      ['C / D / X', 'In actions: collapse / ungroup / close group'],
      ['Arrow keys', 'Move between commands; Enter or Space activates'],
      ['Alt+N', 'New group'],
      ['Ctrl+Shift+U', 'Ungroup all in this window'],
      ['Alt+W', 'Show / hide other windows'],
      ['Esc', 'Back, then close'],
    ])
      keys.append(element('dt', key), element('dd', action));
    content.append(keys);
    panel.querySelector<HTMLButtonElement>('button')?.focus();
  }
  async function list(): Promise<void> {
    if (closed) return;
    const content = page('Tab groups', close);
    onList = true;
    filtered = [];
    const scope = button(
      panel.querySelector('header') as HTMLElement,
      showOtherWindows ? 'All windows' : 'This window',
      async () => {
        showOtherWindows = !showOtherWindows;
        await list();
      },
      'Alt+W',
    );
    scope.className = 'scope';
    search = element('input');
    search.type = 'search';
    search.placeholder = 'Find a group…';
    search.value = rememberedSearch;
    search.setAttribute('aria-label', 'Find a group');
    search.setAttribute('role', 'combobox');
    search.setAttribute('aria-expanded', 'true');
    search.setAttribute('aria-controls', 'groups');
    search.setAttribute('aria-autocomplete', 'list');
    const input = search;
    const rows = element('div');
    rows.id = 'groups';
    rows.setAttribute('role', 'listbox');
    rows.setAttribute('aria-label', 'Groups');
    const toolbar = element('div');
    toolbar.className = 'toolbar';
    content.append(input, rows, toolbar);
    button(toolbar, 'New', () => edit(), 'Alt+N');
    const all = button(toolbar, 'Ungroup all', () => ungroup(), 'Ctrl+Shift+U');
    all.title = 'Dissolve every group in this window. All tabs stay open.';
    all.disabled = true;
    const helpButton = button(toolbar, '?', help);
    helpButton.setAttribute('aria-label', 'Keyboard shortcuts');
    helpButton.className = 'help';
    shortcuts.set('?', helpButton);
    input.focus();
    try {
      const [result, current] = await Promise.all([
        request<{ groups: TabGroup[] }>('getTabGroups'),
        request<{ tabs: { windowId: number }[] }>('getTabs', {
          queryInfo: { currentWindow: true, active: true },
        }),
      ]);
      if (closed || !content.isConnected) return;
      if (!Array.isArray(result?.groups)) throw new Error('Tab groups are unavailable in this browser.');
      windowId = current.tabs[0]?.windowId;
      if (windowId === undefined) throw new Error('Could not determine the current window.');
      all.disabled = !result.groups.some((group) => group.windowId === windowId && group.tabs.length);
      const render = () => {
        rememberedSearch = input.value;
        const query = input.value.toLocaleLowerCase().trim();
        filtered = result.groups.filter(
          (group) =>
            (showOtherWindows || group.windowId === windowId) &&
            [name(group), ...group.tabs.map((tab) => tab.title)]
              .join(' ')
              .toLocaleLowerCase()
              .includes(query),
        );
        filtered.sort((a, b) => Number(b.active) - Number(a.active) || name(a).localeCompare(name(b)));
        rows.replaceChildren();
        input.removeAttribute('aria-activedescendant');
        filtered.forEach((group, index) => {
          const row = button(rows, '', () => details(group));
          row.className = 'group';
          row.tabIndex = -1;
          row.id = `group-${group.id}`;
          row.dataset.id = String(group.id);
          row.setAttribute('role', 'option');
          row.setAttribute(
            'aria-label',
            `${name(group)}, ${group.tabs.length} ${group.tabs.length === 1 ? 'tab' : 'tabs'}${group.active ? ', current group' : ''}`,
          );
          row.title = group.tabs.map((tab) => tab.title).join('\n');
          const dot = element('span');
          dot.className = 'dot';
          dot.style.background = COLORS[group.color] ?? COLORS.grey;
          const title = element('span', name(group));
          title.className = 'group-name';
          const meta = element(
            'span',
            `${group.tabs.length} ${group.tabs.length === 1 ? 'tab' : 'tabs'}${group.active ? ' · Current' : group.windowId !== windowId ? ' · Other window' : ''}`,
          );
          meta.className = 'meta';
          const hint = element('kbd', index < 9 ? String(index + 1) : '');
          hint.title = `Alt+${index + 1}`;
          row.replaceChildren(dot, title, meta, hint);
        });
        if (!filtered.length)
          rows.append(element('p', query ? 'No matching groups.' : 'No groups in this window.'));
        pick(
          Math.max(
            0,
            filtered.findIndex((group) => group.id === selectedId),
          ),
        );
      };
      input.oninput = render;
      render();
      if (document.activeElement === document.body) input.focus({ preventScroll: true });
    } catch (reason) {
      if (!closed && content.isConnected) status(reason);
    }
  }

  dialogWindow.addEventListener(
    'keydown',
    (event) => {
      event.stopImmediatePropagation();
      if (event.isComposing) return;
      const target = event.target as HTMLElement | null;
      const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        event.preventDefault();
        back();
        return;
      }
      if (busy) {
        if (stopOperation && (key === 's' || (target?.tagName === 'BUTTON' && ['enter', ' '].includes(key))))
          stopOperation();
        event.preventDefault();
        return;
      }
      if (target?.tagName === 'BUTTON' && ['enter', ' '].includes(key) && !event.altKey && !event.ctrlKey) {
        event.preventDefault();
        (target as HTMLButtonElement).click();
        return;
      }
      if (event.repeat && !['arrowdown', 'arrowup', 'arrowleft', 'arrowright', 'tab'].includes(key)) return;
      const shortcut = `${event.ctrlKey ? 'ctrl+' : ''}${event.altKey ? 'alt+' : ''}${event.shiftKey && key !== '?' ? 'shift+' : ''}${key}`;
      if ((!editing || event.altKey || event.ctrlKey) && !event.metaKey && shortcuts.has(shortcut)) {
        event.preventDefault();
        shortcuts.get(shortcut)?.click();
        return;
      }
      if (onList) {
        const group = selected();
        if (event.altKey && /^[1-9]$/.test(key)) {
          event.preventDefault();
          const item = filtered[Number(key) - 1];
          if (item) {
            selectedId = item.id;
            details(item);
          }
          return;
        }
        if (key === 'enter' && group) {
          event.preventDefault();
          if (event.ctrlKey) {
            void act('s', group);
          } else details(group);
          return;
        }
        if (key === '?' && !event.altKey) {
          event.preventDefault();
          help();
          return;
        }
        if (
          (target === search || target?.closest('#groups')) &&
          (['arrowdown', 'arrowup'].includes(key) || (!editing && ['j', 'k'].includes(key)))
        ) {
          event.preventDefault();
          const index = filtered.findIndex((item) => item.id === selectedId);
          pick((index + (['arrowup', 'k'].includes(key) ? -1 : 1) + filtered.length) % filtered.length);
          return;
        }
        if (key === '/' && !editing) {
          event.preventDefault();
          search?.focus();
          return;
        }
      }
      if (
        target?.tagName === 'BUTTON' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        ['arrowdown', 'arrowup', 'arrowleft', 'arrowright', 'home', 'end'].includes(key)
      ) {
        event.preventDefault();
        const commands = Array.from(panel.querySelectorAll<HTMLButtonElement>('nav.actions button'));
        const controls = commands.length
          ? commands
          : Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([tabindex="-1"])'));
        const enabled = controls.filter((control) => !control.disabled);
        const current = controls.indexOf(target as HTMLButtonElement);
        let next: HTMLButtonElement | undefined;
        if (key === 'home') next = enabled[0];
        else if (key === 'end') next = enabled[enabled.length - 1];
        else if (commands.length && current >= 0 && ['arrowdown', 'arrowup'].includes(key)) {
          // Preserve the visual column in the two-column command grid, skipping
          // disabled commands and the missing cell in an uneven last row.
          const rows = Math.ceil(commands.length / 2);
          const direction = key === 'arrowdown' ? 1 : -1;
          for (let step = 1; step <= rows; step++) {
            const row = (Math.floor(current / 2) + direction * step + rows) % rows;
            const candidate = commands[row * 2 + (current % 2)];
            if (candidate && !candidate.disabled) {
              next = candidate;
              break;
            }
          }
        } else {
          const index = enabled.indexOf(target as HTMLButtonElement);
          const direction = ['arrowup', 'arrowleft'].includes(key) ? -1 : 1;
          next =
            enabled[
              index < 0
                ? direction > 0
                  ? 0
                  : enabled.length - 1
                : (index + direction + enabled.length) % enabled.length
            ];
        }
        next?.focus({ preventScroll: true });
        next?.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (target?.tagName === 'SELECT' && ['arrowdown', 'arrowup', 'home', 'end'].includes(key)) {
        event.preventDefault();
        const select = target as HTMLSelectElement;
        select.selectedIndex =
          key === 'home'
            ? 0
            : key === 'end'
              ? select.options.length - 1
              : Math.max(
                  0,
                  Math.min(select.options.length - 1, select.selectedIndex + (key === 'arrowdown' ? 1 : -1)),
                );
        return;
      }
      if (target?.tagName === 'INPUT' && key === 'enter') {
        event.preventDefault();
        panel.querySelector<HTMLButtonElement>('[data-submit]')?.click();
        return;
      }
      if (target?.tagName === 'BUTTON' && ['enter', ' '].includes(key)) {
        event.preventDefault();
        (target as HTMLButtonElement).click();
        return;
      }
      if (key === 'tab') {
        event.preventDefault();
        const controls = Array.from(
          panel.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input, select'),
        );
        const index = controls.indexOf(target as HTMLElement);
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    },
    true,
  );
  dialogWindow.focus();
  void list();
}
