// Stock Surfingkeys ungroups the sender, including background tabs. Participants
// cooperate through localData; the coordinator only activates fallback tabs.
const STORAGE_KEY = 'skConfigDissolveGroup';
const PARALLEL_KEY = 'skConfigDissolveParallelV1';
const POLL_MS = 2000;
const PARALLEL_TIMEOUT_MS = 3000;
const TAB_TIMEOUT_MS = 5000;
const JOB_TIMEOUT_MS = 45000;

interface Group {
  id: number;
  title?: string;
  windowId: number;
  active: boolean; // Sender's membership, not the browser's foreground group.
  tabs: { id: number; title: string; url?: string; active?: boolean }[];
}

interface Task {
  token: string;
  groupId: number;
  windowId: number;
  tabId: number;
  expires: number;
  jobExpires: number;
}

interface ParallelTask {
  token: string;
  windowId: number;
  expires: number;
  targets: { groupId: number; tabIds: number[] }[];
}

interface Requests {
  task?: Task | null;
  parallel?: ParallelTask | null;
}

export interface DissolveResult {
  remaining: string[];
  added: number;
}

function request<T>(action: string, args: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Surfingkeys did not respond.')), 4000);
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

const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const groups = () => request<{ groups: Group[] }>('getTabGroups').then((response) => response.groups);
const readRequests = () =>
  request<{ data: { [STORAGE_KEY]?: Task | null; [PARALLEL_KEY]?: ParallelTask | null } }>('localData', {
    data: [STORAGE_KEY, PARALLEL_KEY],
  }).then((response) => ({ task: response.data[STORAGE_KEY], parallel: response.data[PARALLEL_KEY] }));
const write = (data: Record<string, Task | ParallelTask | null>) => api.RUNTIME('localData', { data });
const writeTask = (task: Task | null) => write({ [STORAGE_KEY]: task });
const writeParallel = (task: ParallelTask | null) => write({ [PARALLEL_KEY]: task });
const eligible = (tab: { url?: string }) => !tab.url || /^(https?|file):/i.test(tab.url);

async function owned(token: string): Promise<Requests> {
  // localData writes have no callback. Verify read-back before dispatching work.
  let state = await readRequests();
  if (state.task?.token !== token) {
    await pause(100);
    state = await readRequests();
  }
  if (state.task?.token !== token) throw new Error('The group operation was replaced by another request.');
  return state;
}

let checkParticipant: (() => Promise<void>) | undefined;

export function installGroupDissolveParticipant(): void {
  if (window !== window.top) return;
  const state = window as Window & { __skDissolveCleanup?: () => void };
  state.__skDissolveCleanup?.();
  let stopped = false;
  let checking = false;
  let lastToken = '';
  let lastParallelToken = '';
  let senderId: number | undefined;

  async function identifySender(group: Group): Promise<number | undefined> {
    if (senderId !== undefined) return group.tabs.some((tab) => tab.id === senderId) ? senderId : undefined;
    // Stock getTabs' MRU chooser omits its sender when tabsThreshold is zero.
    // Compare IDs, never URL/title guesses. If MRU is disabled or this behavior
    // is unavailable, leave the tab for the visible sequential fallback.
    const peers = () =>
      request<{ tabs: { id: number }[] }>('getTabs', {
        queryInfo: { groupId: group.id, windowId: group.windowId },
        tabsThreshold: 0,
        includeLoading: true,
      }).then((response) => response.tabs);
    const otherIds = new Set((await peers()).map((tab) => tab.id));
    const missing = group.tabs.filter((tab) => !otherIds.has(tab.id));
    if (missing.length !== 1) return undefined;
    const candidate = missing[0].id;
    const fresh = (await groups()).find((item) => item.id === group.id && item.active);
    if (!fresh || fresh.windowId !== group.windowId || !fresh.tabs.some((tab) => tab.id === candidate))
      return undefined;
    const confirmed = new Set((await peers()).map((tab) => tab.id));
    if (
      confirmed.has(candidate) ||
      confirmed.size !== fresh.tabs.length - 1 ||
      !fresh.tabs.every((tab) => tab.id === candidate || confirmed.has(tab.id))
    )
      return undefined;
    senderId = candidate;
    return candidate;
  }

  async function parallelCheck(task: ParallelTask): Promise<void> {
    if (task.token === lastParallelToken || task.expires <= Date.now()) return;
    const group = (await groups()).find((item) => item.active && item.windowId === task.windowId);
    const target = task.targets.find((item) => item.groupId === group?.id);
    if (!group || !target) return;
    const tabId = await identifySender(group);
    if (tabId === undefined || !target.tabIds.includes(tabId)) return;
    const fresh = (await groups()).find((item) => item.id === group.id && item.active);
    if (!fresh || fresh.windowId !== task.windowId || !fresh.tabs.some((tab) => tab.id === tabId)) return;
    const current = await readRequests();
    if (
      stopped ||
      current.task?.token !== task.token ||
      current.parallel?.token !== task.token ||
      current.parallel.expires <= Date.now() ||
      !current.parallel.targets.some((item) => item.groupId === fresh.id && item.tabIds.includes(tabId))
    )
      return;
    lastParallelToken = task.token;
    api.RUNTIME('ungroupTab');
  }

  async function sequentialCheck(task: Task): Promise<void> {
    if (document.visibilityState !== 'visible' || task.expires <= Date.now() || task.token === lastToken)
      return;
    const group = (await groups()).find((item) => item.id === task.groupId);
    if (
      !group?.active ||
      group.windowId !== task.windowId ||
      !group.tabs.some((tab) => tab.id === task.tabId && tab.active)
    )
      return;
    const current = (await readRequests()).task;
    if (
      stopped ||
      document.visibilityState !== 'visible' ||
      current?.token !== task.token ||
      current.expires <= Date.now()
    )
      return;
    senderId = task.tabId;
    lastToken = task.token;
    api.RUNTIME('ungroupTab');
  }

  const check = async () => {
    if (stopped || checking) return;
    checking = true;
    try {
      const current = await readRequests();
      if (stopped) return;
      if (current.parallel && current.task?.token === current.parallel.token)
        await parallelCheck(current.parallel);
      if (current.task) await sequentialCheck(current.task);
    } catch {
      // The coordinator reads actual membership and retries only remaining tabs.
    } finally {
      checking = false;
    }
  };
  checkParticipant = check;
  const wake = () => {
    void check();
  };
  // Background pages need a shared-request check too. Chrome may throttle or
  // suspend it; the short parallel deadline always leads to a bounded fallback.
  const poll = window.setInterval(wake, POLL_MS);
  window.addEventListener('focus', wake);
  document.addEventListener('visibilitychange', wake);
  state.__skDissolveCleanup = () => {
    stopped = true;
    window.clearInterval(poll);
    window.removeEventListener('focus', wake);
    document.removeEventListener('visibilitychange', wake);
  };
  wake();
}

let running = false;

export const dissolveGroup = (
  groupId: number,
  progress: (message: string) => void,
  cancelled: () => boolean,
): Promise<DissolveResult> => dissolveGroups(groupId, progress, cancelled);

export const dissolveAllGroups = (
  progress: (message: string) => void,
  cancelled: () => boolean,
): Promise<DissolveResult> => dissolveGroups(null, progress, cancelled);

async function dissolveGroups(
  groupId: number | null,
  progress: (message: string) => void,
  cancelled: () => boolean,
): Promise<DissolveResult> {
  if (running) throw new Error('A group operation is already in progress.');
  running = true;
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let ownedToken = '';
  let parallelToken = '';
  let visited = false;
  let origin: { id: number; windowId: number } | undefined;
  try {
    const pending = (await readRequests()).task;
    if (pending && (pending.jobExpires ?? pending.expires) > Date.now())
      throw new Error('Another group operation is in progress.');
    const snapshot = await groups();
    origin = (
      await request<{ tabs: { id: number; windowId: number }[] }>('getTabs', {
        queryInfo: { currentWindow: true, active: true },
      })
    ).tabs[0];
    if (!origin) throw new Error('Could not determine the current window.');
    const windowId = origin.windowId;
    const targets = snapshot.filter((group) =>
      groupId === null ? group.windowId === windowId : group.id === groupId,
    );
    if (targets.some((group) => group.windowId !== windowId))
      throw new Error('Switch to a tab in this group’s window, then dissolve it there.');
    const tabs = targets.flatMap((group) => group.tabs.map((tab) => ({ groupId: group.id, tab })));
    const deadline = Date.now() + JOB_TIMEOUT_MS;
    const parallelTargets = targets
      .map((group) => ({
        groupId: group.id,
        tabIds: group.tabs.filter(eligible).map((tab) => tab.id),
      }))
      .filter((target) => target.tabIds.length);

    if (parallelTargets.length && !cancelled()) {
      ownedToken = parallelToken = `${jobId}-parallel`;
      const parallel: ParallelTask = {
        token: parallelToken,
        windowId,
        targets: parallelTargets,
        expires: Math.min(Date.now() + PARALLEL_TIMEOUT_MS, deadline),
      };
      // This invalid legacy task is a lease recognized by old coordinators.
      // Old participants ignore it and can still answer fallback tasks later.
      write({
        [STORAGE_KEY]: {
          token: ownedToken,
          windowId,
          groupId: -1,
          tabId: -1,
          expires: 0,
          jobExpires: deadline,
        },
        [PARALLEL_KEY]: parallel,
      });
      const stored = await owned(ownedToken);
      if (stored.parallel?.token !== parallelToken) throw new Error('Could not reserve the parallel pass.');
      void checkParticipant?.();
      while (!cancelled() && Date.now() < parallel.expires) {
        await owned(ownedToken);
        const current = await groups();
        const remaining = parallelTargets.reduce(
          (count, target) =>
            count +
            (current
              .find((group) => group.id === target.groupId && group.windowId === windowId)
              ?.tabs.filter((tab) => target.tabIds.includes(tab.id)).length ?? 0),
          0,
        );
        progress(`Parallel pass: ${remaining} ${remaining === 1 ? 'tab' : 'tabs'} still grouped`);
        if (!remaining) break;
        await pause(100);
      }
      const current = await owned(ownedToken);
      if (current.parallel?.token !== parallelToken) throw new Error('The parallel request was replaced.');
      writeParallel({ ...parallel, expires: 0 });
      let invalidated = await readRequests();
      if (invalidated.parallel?.expires !== 0) {
        await pause(100);
        invalidated = await readRequests();
      }
      if (
        invalidated.task?.token !== ownedToken ||
        invalidated.parallel?.token !== parallelToken ||
        invalidated.parallel.expires !== 0
      )
        throw new Error('Could not stop the parallel pass.');
    }

    const afterParallel = await groups();
    const fallback = tabs.filter(
      ({ groupId, tab }) =>
        eligible(tab) &&
        afterParallel.some(
          (group) =>
            group.id === groupId &&
            group.windowId === windowId &&
            group.tabs.some((item) => item.id === tab.id),
        ),
    );
    for (const [index, { groupId: targetGroupId, tab }] of fallback.entries()) {
      if (cancelled() || Date.now() >= deadline) break;
      if (ownedToken) await owned(ownedToken);
      const current = (await groups()).find((item) => item.id === targetGroupId);
      if (current?.windowId !== windowId || !current.tabs.some((item) => item.id === tab.id)) continue;
      if (cancelled() || Date.now() >= deadline) break;
      progress(`Sequential fallback: ${index + 1} / ${fallback.length} — ${tab.title}`);
      ownedToken = `${jobId}-${index}`;
      const task: Task = {
        token: ownedToken,
        groupId: targetGroupId,
        windowId,
        tabId: tab.id,
        expires: Math.min(Date.now() + TAB_TIMEOUT_MS, deadline),
        jobExpires: deadline,
      };
      writeTask(task);
      await owned(ownedToken);
      if (cancelled() || Date.now() >= task.expires) {
        writeTask({ ...task, tabId: -1, expires: 0 });
        break;
      }
      visited = true;
      api.RUNTIME('focusTab', { tabId: tab.id, windowId });
      void checkParticipant?.();
      while (!cancelled() && Date.now() < task.expires) {
        const latest = (await groups()).find((item) => item.id === targetGroupId);
        if (!latest?.tabs.some((item) => item.id === tab.id)) break;
        await pause(200);
      }
      await owned(ownedToken);
      writeTask({ ...task, tabId: -1, expires: 0 });
    }
    const targetIds = new Set(targets.map((group) => group.id));
    const remaining = (await groups()).filter((group) => targetIds.has(group.id));
    const originalIds = new Set(tabs.map(({ tab }) => tab.id));
    return {
      remaining: remaining.flatMap((group) =>
        group.tabs.map((tab) =>
          groupId === null
            ? `${group.title || 'Untitled group'} — ${tab.title || `Tab ${tab.id}`}`
            : tab.title || `Tab ${tab.id}`,
        ),
      ),
      added: remaining.flatMap((group) => group.tabs).filter((tab) => !originalIds.has(tab.id)).length,
    };
  } finally {
    try {
      const current = await readRequests();
      if (parallelToken && current.parallel?.token === parallelToken) writeParallel(null);
      if (ownedToken && current.task?.token === ownedToken) writeTask(null);
    } finally {
      running = false;
      if (visited && origin) api.RUNTIME('focusTab', { tabId: origin.id, windowId: origin.windowId });
    }
  }
}
