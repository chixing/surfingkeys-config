import { buildUrl, parseUrl, part } from './urlParts';
import type { UrlDraft } from './urlParts';

let dismiss: (() => void) | undefined;

/** A config-owned, scriptless frame keeps both page CSS and Surfingkeys key handlers out. */
export async function openUrlEditor(): Promise<void> {
  if (dismiss) {
    dismiss();
    return;
  }
  const parent = window.document;
  const previousFocus = parent.activeElement;
  const originalUrl = window.location.href;
  let draft: UrlDraft;
  try {
    draft = parseUrl(originalUrl);
  } catch (reason) {
    api.Front.showBanner(reason instanceof Error ? reason.message : String(reason), 'error');
    return;
  }
  const container = parent.createElement('div');
  container.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;';
  const frameUrl = URL.createObjectURL(
    new Blob(['<!doctype html><html><head><title>URL editor</title></head><body></body></html>'], {
      type: 'text/html',
    }),
  );
  const host = parent.createElement('iframe');
  host.title = 'URL editor';
  host.src = frameUrl;
  host.setAttribute('data-sk-url-editor-dialog', '');
  host.setAttribute('sandbox', 'allow-same-origin');
  host.style.cssText = 'all:initial;position:absolute;inset:0;width:100%;height:100%;border:0;';
  container.append(host);
  let closed = false;
  let resize: (() => void) | undefined;
  let restoreFocus: (() => void) | undefined;
  const close = () => {
    if (closed) return;
    closed = true;
    container.remove();
    URL.revokeObjectURL(frameUrl);
    if (resize) window.removeEventListener('resize', resize);
    if (restoreFocus) parent.removeEventListener('focusin', restoreFocus);
    dismiss = undefined;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
  };
  dismiss = close;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('This page blocked the URL editor.')), 2500);
      host.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      host.onerror = () => {
        clearTimeout(timer);
        reject(new Error('This page blocked the URL editor.'));
      };
      parent.documentElement.append(container);
    });
    if (closed) return;
    if (!host.contentDocument || !host.contentWindow) throw new Error('This page blocked the URL editor.');
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
  const sheet = new (dialogWindow as Window & { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet();
  sheet.replaceSync(`
    :root { color-scheme:dark; --surface:#202127; --field:#2c2e36; --text:#eeeef2;
      --muted:#b4b7c2; --focus:#a7c4ff; --line:#555b69; }
    * { box-sizing:border-box; scrollbar-width:thin; scrollbar-color:#686d7b var(--surface); }
    html { overflow:hidden; }
    body { margin:0; width:var(--screen-width); height:var(--screen-height); background:#0009;
      display:grid; place-items:center; padding:18px; color:var(--text); font:14px/1.5 system-ui; }
    section { width:min(760px,100%); max-height:100%; background:var(--surface); border-radius:12px;
      box-shadow:0 18px 60px #0008; display:flex; flex-direction:column; overflow:hidden; }
    header { display:flex; align-items:center; gap:12px; padding:18px 22px 12px; }
    h2 { flex:1; margin:0; font-size:19px; font-weight:650; }
    h3 { font-size:14px; margin:0; font-weight:650; }
    .scroll { overflow:auto; padding:0 22px 18px; }
    .address { display:grid; grid-template-columns:100px minmax(0,1fr) 86px; gap:10px; }
    label { display:block; color:var(--muted); font-size:12px; }
    input,select,textarea,button { font:inherit; color:var(--text); }
    input,select,textarea { min-width:0; width:100%; background:var(--field); border:1px solid var(--line);
      border-radius:5px; padding:8px 10px; caret-color:var(--focus); }
    label input,label select { margin-top:5px; }
    input[type=text],textarea,output { font-family:Consolas,monospace; font-size:13px; }
    input[type=checkbox] { accent-color:var(--focus); width:16px; height:16px; margin:0; cursor:pointer; }
    input::placeholder,textarea::placeholder { color:var(--muted); }
    button { border:0; border-radius:5px; background:transparent; padding:7px 10px; cursor:pointer; white-space:nowrap; }
    button:hover { background:#353944; }
    button:disabled { color:#a0a4af; cursor:default; }
    :focus-visible { outline:2px solid var(--focus); outline-offset:2px; }
    ::selection { background:#435a82; color:#fff; }
    .section-head { display:flex; align-items:center; gap:10px; margin:20px 0 8px; }
    .section-head button:first-of-type { margin-left:auto; }
    .minor { color:var(--muted); font-size:12px; }
    .rows { display:grid; gap:7px; }
    .path-row { display:grid; grid-template-columns:20px minmax(0,1fr) 34px; gap:8px; align-items:center; }
    .slash { color:var(--muted); text-align:center; font:15px Consolas,monospace; }
    .param-row { display:grid; grid-template-columns:20px minmax(0,1fr) 14px minmax(0,1.55fr) 34px; gap:8px; align-items:center; }
    .param-row.off input[type=text] { color:var(--muted); text-decoration:line-through; }
    .equals { color:var(--muted); text-align:center; }
    .icon { padding:7px; display:grid; place-items:center; }
    .icon svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.7; }
    .empty { color:var(--muted); margin:0; padding:8px 0; font-size:13px; }
    .fragment { display:grid; grid-template-columns:20px minmax(0,1fr); gap:8px; align-items:center; }
    .preview { margin-top:22px; border-top:1px solid var(--line); padding-top:14px; }
    .preview-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:4px; }
    output { display:block; overflow-wrap:anywhere; line-height:1.7; max-height:110px; overflow:auto; }
    #error { color:#ffb4ad; margin:8px 0 0; font-size:13px; }
    #error:empty { display:none; }
    footer { padding:12px 22px 16px; border-top:1px solid #414550; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    footer .minor { flex:1; }
    .primary { background:#b8ceff; color:#182139; font-weight:650; }
    .primary:hover { background:#cbdcff; }
    .primary:disabled { background:#3c4352; color:#b4b7c2; }
    kbd { font:11px system-ui; color:var(--muted); margin-left:5px; }
    details { margin-top:16px; color:var(--muted); font-size:12px; }
    summary { cursor:pointer; width:fit-content; }
    .raw-row { display:flex; gap:8px; margin-top:8px; }
    .raw-row input { flex:1; }
    @media(max-width:520px) {
      body { padding:8px; } header { padding:14px 14px 10px; }
      .scroll { padding:0 14px 14px; } footer { padding:10px 14px 14px; }
      footer .minor { flex-basis:100%; } .address { grid-template-columns:88px minmax(0,1fr) 66px; gap:7px; }
      .param-row { grid-template-columns:18px minmax(0,1fr) 12px minmax(0,1.2fr) 28px; gap:5px; }
      input,select { padding:8px 6px; } .section-head { gap:6px; } .section-head button { padding:7px 6px; }
    }
  `);
  document.adoptedStyleSheets = [sheet];
  function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = ''): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    node.textContent = text;
    (node as any).fromSurfingKeys = true;
    return node;
  }
  const panel = element('section');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'url-title');
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
    if (!closed && parent.activeElement !== host && lastControl?.isConnected) {
      host.focus({ preventScroll: true });
      lastControl.focus({ preventScroll: true });
    }
  };
  parent.addEventListener('focusin', restoreFocus);
  for (const type of ['focus', 'focusin', 'mousedown', 'keyup']) {
    dialogWindow.addEventListener(
      type,
      (event) => {
        if (type === 'focusin') lastControl = event.target as HTMLElement;
        event.stopImmediatePropagation();
      },
      true,
    );
  }
  function button(
    parentNode: HTMLElement,
    text: string,
    action: () => void,
    label?: string,
  ): HTMLButtonElement {
    const node = element('button', text);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    node.onclick = action;
    parentNode.append(node);
    return node;
  }
  function removeButton(parentNode: HTMLElement, label: string, action: () => void): void {
    const node = button(parentNode, '', action, label);
    node.className = 'icon';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', 'M5 5l10 10M15 5L5 15');
    svg.append(line);
    node.append(svg);
    node.title = label;
  }
  function input(value: string, label: string, change: (value: string) => void): HTMLInputElement {
    const node = element('input');
    node.type = 'text';
    node.value = value;
    node.setAttribute('aria-label', label);
    node.autocomplete = 'off';
    node.spellcheck = false;
    node.oninput = () => {
      change(node.value);
      update();
    };
    return node;
  }
  let preview: HTMLOutputElement;
  let error: HTMLParagraphElement;
  let open: HTMLButtonElement;
  let newTab: HTMLButtonElement;
  let copy: HTMLButtonElement;
  let fullUrl: HTMLInputElement;
  let pathRows: HTMLDivElement;
  let paramRows: HTMLDivElement;
  let addPath: HTMLButtonElement;
  let addParam: HTMLButtonElement;
  let hash: HTMLInputElement;
  function update(): void {
    copy.textContent = 'Copy URL';
    try {
      const result = buildUrl(draft);
      preview.value = result;
      error.textContent = '';
      open.disabled = false;
      newTab.disabled = false;
      copy.disabled = false;
    } catch (reason) {
      preview.value = '';
      error.textContent = reason instanceof Error ? reason.message : String(reason);
      open.disabled = true;
      newTab.disabled = true;
      copy.disabled = true;
    }
  }
  function go(tabbed: boolean): void {
    try {
      const url = buildUrl(draft);
      api.RUNTIME('openLink', { url, tab: { tabbed, active: true } });
      close();
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : String(reason);
    }
  }
  function renderPath(focusIndex?: number): void {
    pathRows.replaceChildren();
    draft.path.forEach((value, index) => {
      const row = element('div');
      row.className = 'path-row';
      const field = input(value.text, `Path segment ${index + 1}`, (text) => {
        value.text = text;
      });
      field.placeholder = '(empty segment)';
      row.append(element('span', '/'), field);
      row.firstElementChild?.classList.add('slash');
      removeButton(row, `Remove path segment ${index + 1}`, () => {
        draft.path.splice(index, 1);
        renderPath(Math.min(index, draft.path.length - 1));
        update();
      });
      pathRows.append(row);
    });
    if (!draft.path.length) {
      const empty = element('p', '/ — root path');
      empty.className = 'empty';
      pathRows.append(empty);
    }
    if (focusIndex !== undefined) {
      (pathRows.querySelectorAll('input')[focusIndex] ?? addPath).focus();
    }
  }
  function renderParams(focusIndex?: number): void {
    paramRows.replaceChildren();
    draft.query.forEach((value, index) => {
      const row = element('div');
      row.className = `param-row${value.enabled ? '' : ' off'}`;
      const enabled = element('input');
      enabled.type = 'checkbox';
      enabled.checked = value.enabled;
      enabled.setAttribute('aria-label', `Include parameter ${index + 1}`);
      enabled.onchange = () => {
        value.enabled = enabled.checked;
        row.classList.toggle('off', !enabled.checked);
        update();
      };
      const key = input(value.key.text, `Parameter ${index + 1} name`, (text) => {
        value.key.text = text;
      });
      key.placeholder = 'name';
      const field = input(value.value.text, `Parameter ${index + 1} value`, (text) => {
        value.value.text = text;
        value.equals = true;
      });
      field.placeholder = value.equals ? 'value' : '(bare flag)';
      const equals = element('span', value.equals ? '=' : '');
      equals.className = 'equals';
      field.addEventListener('input', () => {
        equals.textContent = '=';
      });
      row.append(enabled, key, equals, field);
      removeButton(row, `Remove parameter ${index + 1}`, () => {
        draft.query.splice(index, 1);
        renderParams(Math.min(index, draft.query.length - 1));
        update();
      });
      paramRows.append(row);
    });
    if (!draft.query.length) {
      const empty = element('p', 'No query parameters.');
      empty.className = 'empty';
      paramRows.append(empty);
    }
    if (focusIndex !== undefined)
      (paramRows.querySelectorAll<HTMLInputElement>('input[type=text]')[focusIndex * 2] ?? addParam).focus();
  }
  function render(): void {
    const header = element('header');
    const title = element('h2', 'Edit URL');
    title.id = 'url-title';
    header.append(title, element('kbd', ';i'));
    button(header, 'Close', close, 'Close URL editor');
    const scroll = element('div');
    scroll.className = 'scroll';
    const address = element('div');
    address.className = 'address';
    const protocolLabel = element('label', 'Scheme');
    const protocol = element('select');
    protocol.setAttribute('aria-label', 'Scheme');
    for (const value of ['https', 'http']) {
      const option = element('option', value);
      option.value = value;
      protocol.append(option);
    }
    protocol.value = draft.protocol;
    protocol.onchange = () => {
      draft.protocol = protocol.value;
      update();
    };
    protocolLabel.append(protocol);
    const hostLabel = element('label', 'Host');
    const hostname = input(draft.hostname, 'Host', (value) => {
      draft.hostname = value;
    });
    hostLabel.append(hostname);
    const portLabel = element('label', 'Port');
    const port = input(draft.port, 'Port', (value) => {
      draft.port = value;
    });
    port.placeholder = 'auto';
    port.inputMode = 'numeric';
    portLabel.append(port);
    address.append(protocolLabel, hostLabel, portLabel);
    scroll.append(address);
    const pathHead = element('div');
    pathHead.className = 'section-head';
    pathHead.append(element('h3', 'Path'));
    addPath = button(pathHead, '+ Segment', () => {
      draft.path.push(part(''));
      renderPath(draft.path.length - 1);
      update();
    });
    addPath.title = 'Add path segment (Alt+P)';
    pathRows = element('div');
    pathRows.className = 'rows';
    const paramHead = element('div');
    paramHead.className = 'section-head';
    paramHead.append(element('h3', 'Query parameters'));
    addParam = button(paramHead, '+ Parameter', () => {
      draft.query.push({ key: part(''), value: part(''), equals: true, enabled: true });
      draft.emptyQuery = false;
      renderParams(draft.query.length - 1);
      update();
    });
    addParam.title = 'Add parameter (Alt+Q)';
    button(
      paramHead,
      'Clear',
      () => {
        draft.query = [];
        draft.emptyQuery = false;
        renderParams();
        update();
        addParam.focus();
      },
      'Clear all query parameters',
    );
    paramRows = element('div');
    paramRows.className = 'rows';
    const hashHead = element('div');
    hashHead.className = 'section-head';
    hashHead.append(element('h3', 'Fragment'));
    const fragment = element('div');
    fragment.className = 'fragment';
    hash = input(draft.fragment.text, 'Fragment', (value) => {
      draft.fragment.text = value;
      draft.emptyFragment = false;
    });
    hash.placeholder = 'section or anchor';
    const hashSign = element('span', '#');
    hashSign.className = 'slash';
    fragment.append(hashSign, hash);
    scroll.append(pathHead, pathRows, paramHead, paramRows, hashHead, fragment);
    const details = element('details');
    details.append(element('summary', 'Load a full URL'));
    const rawRow = element('div');
    rawRow.className = 'raw-row';
    fullUrl = input(originalUrl, 'Full URL to load', () => {});
    rawRow.append(fullUrl);
    button(rawRow, 'Load', () => {
      try {
        draft = parseUrl(fullUrl.value.trim());
        render();
      } catch (reason) {
        error.textContent = reason instanceof Error ? reason.message : String(reason);
      }
    });
    details.append(rawRow);
    scroll.append(details);
    if (draft.credentials) {
      const note = element('p', 'This URL contains credentials. They are preserved in the preview.');
      note.className = 'minor';
      scroll.append(note);
    }
    const previewBox = element('div');
    previewBox.className = 'preview';
    const previewHead = element('div');
    previewHead.className = 'preview-head';
    previewHead.append(element('h3', 'URL preview'));
    copy = button(previewHead, 'Copy URL', () => {
      try {
        api.Clipboard.write(buildUrl(draft));
        copy.textContent = 'Copied';
      } catch {
        error.textContent = 'Could not copy. Select and copy the URL preview.';
      }
    });
    preview = element('output');
    preview.setAttribute('aria-label', 'URL preview');
    error = element('p');
    error.id = 'error';
    error.setAttribute('role', 'status');
    previewBox.append(previewHead, preview, error);
    scroll.append(previewBox);
    const footer = element('footer');
    const hints = element('span', 'Tab Move · Ctrl+Enter Open · Esc Close');
    hints.className = 'minor';
    footer.append(hints);
    button(footer, 'Reset', () => {
      draft = parseUrl(originalUrl);
      render();
    });
    newTab = button(footer, 'New tab', () => go(true));
    newTab.title = 'Ctrl+Shift+Enter';
    open = button(footer, 'Open URL', () => go(false));
    open.className = 'primary';
    panel.replaceChildren(header, scroll, footer);
    renderPath();
    renderParams();
    update();
    const first =
      pathRows.querySelector('input') ??
      paramRows.querySelector<HTMLInputElement>('input[type=text]') ??
      hostname;
    first.focus();
    first.select();
  }
  dialogWindow.addEventListener(
    'keydown',
    (event) => {
      event.stopImmediatePropagation();
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (!open.disabled) go(event.shiftKey);
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const target = { p: addPath, q: addParam, h: hash }[event.key.toLowerCase()];
        if (target) {
          event.preventDefault();
          if (target === hash) hash.focus();
          else (target as HTMLButtonElement).click();
        }
      }
      if (event.key === 'Tab') {
        const controls = Array.from(
          panel.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary'),
        ).filter((node) => node.getClientRects().length);
        const index = controls.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    },
    true,
  );
  dialogWindow.focus();
  render();
}
