/** Keep untouched components byte-for-byte, including +, escapes and bare query flags. */
export interface UrlPart {
  text: string;
  raw: string;
  original: string;
}
export interface QueryPart {
  key: UrlPart;
  value: UrlPart;
  equals: boolean;
  enabled: boolean;
}
export interface UrlDraft {
  protocol: string;
  hostname: string;
  port: string;
  credentials: string;
  path: UrlPart[];
  query: QueryPart[];
  fragment: UrlPart;
  emptyQuery: boolean;
  emptyFragment: boolean;
}
export function part(raw: string, query = false): UrlPart {
  let text = raw;
  try {
    text = decodeURIComponent(query ? raw.replace(/\+/g, ' ') : raw);
  } catch {
    // Malformed escapes are legal in an existing URL; leave them untouched.
  }
  return { text, original: text, raw };
}
function encode(value: UrlPart, fragment = false): string {
  return value.text === value.original
    ? value.raw
    : fragment
      ? encodeURI(value.text)
      : encodeURIComponent(value.text);
}
export function parseUrl(href: string): UrlDraft {
  const url = new URL(href);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http:// or https:// URL.');
  const hashAt = url.href.indexOf('#');
  const beforeHash = hashAt < 0 ? url.href : url.href.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const rawQuery = queryAt < 0 ? '' : beforeHash.slice(queryAt + 1);
  return {
    protocol: url.protocol.slice(0, -1),
    hostname: url.hostname,
    port: url.port,
    credentials:
      url.username || url.password ? `${url.username}${url.password ? `:${url.password}` : ''}@` : '',
    path:
      url.pathname === '/'
        ? []
        : url.pathname
            .slice(1)
            .split('/')
            .map((value) => part(value)),
    query: rawQuery
      ? rawQuery.split('&').map((value) => {
          const at = value.indexOf('=');
          return {
            key: part(at < 0 ? value : value.slice(0, at), true),
            value: part(at < 0 ? '' : value.slice(at + 1), true),
            equals: at >= 0,
            enabled: true,
          };
        })
      : [],
    fragment: part(hashAt < 0 ? '' : url.href.slice(hashAt + 1)),
    emptyQuery: queryAt >= 0 && rawQuery === '',
    emptyFragment: hashAt >= 0 && hashAt === url.href.length - 1,
  };
}
export function buildUrl(draft: UrlDraft): string {
  if (!['http', 'https'].includes(draft.protocol)) throw new Error('Choose HTTP or HTTPS.');
  if (!draft.hostname || /[\s/@?#\\]/.test(draft.hostname))
    throw new Error('Enter a hostname without a path.');
  if (draft.hostname.includes(':') && !/^\[[0-9a-f:.]+\]$/i.test(draft.hostname))
    throw new Error('Enter the port in the separate Port field. Use brackets around IPv6 addresses.');
  if (draft.port && (!/^\d+$/.test(draft.port) || Number(draft.port) > 65535))
    throw new Error('Port must be a number from 0 to 65535, or empty.');
  const authority = `${draft.protocol}://${draft.credentials}${draft.hostname}${draft.port ? `:${draft.port}` : ''}`;
  const origin = new URL(authority);
  if (origin.hostname !== new URL(`${draft.protocol}://${draft.hostname}`).hostname)
    throw new Error('Enter the port in the separate Port field.');
  const path = draft.path.map((value) => {
    const encoded = encode(value);
    if (/^(\.|%2e){1,2}$/i.test(encoded))
      throw new Error('A path segment cannot be “.” or “..”. Remove the row instead.');
    return encoded;
  });
  const query = draft.query
    .filter((row) => row.enabled)
    .map((row) => {
      const value = encode(row.value);
      return `${encode(row.key)}${row.equals || value ? `=${value}` : ''}`;
    });
  const fragment = encode(draft.fragment, true);
  return `${authority}/${path.join('/')}${query.length ? `?${query.join('&')}` : draft.emptyQuery ? '?' : ''}${fragment || draft.emptyFragment ? `#${fragment}` : ''}`;
}
