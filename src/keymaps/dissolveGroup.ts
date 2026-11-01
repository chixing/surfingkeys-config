// Each tab must send ungroupTab itself: Surfingkeys ignores supplied tab IDs.
// Activation events wake participants; visible tabs also check for missed events.
const STORAGE_KEY = 'skConfigDissolveGroup';
const TAB_TIMEOUT_MS = 5000;
const JOB_TIMEOUT_MS = 45000;

interface Group {
  id: number;
  windowId: number;
  active: boolean;
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
const readTask = () =>
  request<{ data: Record<string, Task | null> }>('localData', { data: [STORAGE_KEY] }).then(
    (response) => response.data[STORAGE_KEY],
  );
const writeTask = (task: Task | null) => api.RUNTIME('localData', { data: { [STORAGE_KEY]: task } });

let checkParticipant: (() => Promise<void>) | undefined;

export function installGroupDissolveParticipant(): void {
  if (window !== window.top) return;
  // Config reloads must remove old listeners rather than multiply participants.
  const state = window as Window & { __skDissolveCleanup?: () => void };
  state.__skDissolveCleanup?.();
  let stopped = false;
  let checking = false;
  let lastToken = '';
  const check = async () => {
    if (stopped || checking || document.visibilityState !== 'visible') return;
    checking = true;
    try {
      const task = await readTask();
      if (!task || task.expires <= Date.now() || task.token === lastToken || stopped) return;
      const group = (await groups()).find((item) => item.id === task.groupId);
      // "active" on the group identifies the sender's membership. The visible
      // top-level document must also be the specific tab the coordinator chose.
      if (
        !group?.active ||
        group.windowId !== task.windowId ||
        !group.tabs.some((tab) => tab.id === task.tabId && tab.active)
      )
        return;
      const current = await readTask();
      if (
        stopped ||
        document.visibilityState !== 'visible' ||
        current?.token !== task.token ||
        current.expires <= Date.now()
      )
        return;
      lastToken = task.token;
      api.RUNTIME('ungroupTab');
    } catch {
      // The coordinator verifies membership and reports tabs that did not answer.
    } finally {
      checking = false;
    }
  };
  checkParticipant = check;
  let foregroundTimer: number | undefined;
  const wake = () => {
    if (foregroundTimer !== undefined) window.clearInterval(foregroundTimer);
    foregroundTimer =
      document.visibilityState === 'visible'
        ? window.setInterval(() => {
            void check();
          }, 2000)
        : undefined;
    void check();
  };
  window.addEventListener('focus', wake);
  document.addEventListener('visibilitychange', wake);
  state.__skDissolveCleanup = () => {
    stopped = true;
    if (foregroundTimer !== undefined) window.clearInterval(foregroundTimer);
    window.removeEventListener('focus', wake);
    document.removeEventListener('visibilitychange', wake);
  };
  wake();
}

let running = false;

export async function dissolveGroup(
  groupId: number,
  progress: (message: string) => void,
  cancelled: () => boolean,
): Promise<DissolveResult> {
  if (running) throw new Error('A group is already being dissolved.');
  running = true;
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let ownedToken = '';
  let origin: { id: number; windowId: number } | undefined;
  try {
    const pending = await readTask();
    if (pending && (pending.jobExpires ?? pending.expires) > Date.now())
      throw new Error('Another group operation is in progress.');
    const group = (await groups()).find((item) => item.id === groupId);
    if (!group) return { remaining: [], added: 0 };
    origin = (
      await request<{ tabs: { id: number; windowId: number }[] }>('getTabs', {
        queryInfo: { currentWindow: true, active: true },
      })
    ).tabs[0];
    if (!origin || origin.windowId !== group.windowId) {
      origin = undefined;
      throw new Error('Switch to a tab in this group’s window, then dissolve it there.');
    }
    const deadline = Date.now() + JOB_TIMEOUT_MS;
    for (const [index, tab] of group.tabs.entries()) {
      if (cancelled() || Date.now() >= deadline) break;
      const current = (await groups()).find((item) => item.id === groupId);
      if (!current?.tabs.some((item) => item.id === tab.id)) continue;
      if (tab.url && !/^(https?|file):/i.test(tab.url)) continue;
      progress(`Dissolving group: ${index + 1} / ${group.tabs.length} — ${tab.title}`);
      ownedToken = `${jobId}-${index}`;
      const task: Task = {
        token: ownedToken,
        jobExpires: deadline,
        groupId,
        windowId: current.windowId,
        tabId: tab.id,
        expires: Math.min(Date.now() + TAB_TIMEOUT_MS, deadline),
      };
      writeTask(task);
      // localData's write has no response; read back before activating the tab.
      let stored = await readTask();
      if (stored?.token !== ownedToken) {
        await pause(100);
        stored = await readTask();
      }
      if (stored?.token !== ownedToken) throw new Error('Could not reserve the group operation.');
      api.RUNTIME('focusTab', { tabId: tab.id, windowId: current.windowId });
      // The originating tab may already be active and receive no activation event.
      void checkParticipant?.();
      while (!cancelled() && Date.now() < task.expires) {
        const latest = (await groups()).find((item) => item.id === groupId);
        if (!latest?.tabs.some((item) => item.id === tab.id)) break;
        await pause(200);
      }
      const active = await readTask();
      if (active?.token !== ownedToken)
        throw new Error('The group operation was replaced by another request.');
      // Invalidate each task before the next tab, including timed-out tabs.
      writeTask({ ...task, tabId: -1, expires: 0 });
    }
    const remaining = (await groups()).find((item) => item.id === groupId)?.tabs ?? [];
    const originalIds = new Set(group.tabs.map((tab) => tab.id));
    return {
      remaining: remaining.map((tab) => tab.title || `Tab ${tab.id}`),
      added: remaining.filter((tab) => !originalIds.has(tab.id)).length,
    };
  } finally {
    try {
      if (ownedToken && (await readTask())?.token === ownedToken) writeTask(null);
    } finally {
      running = false;
      if (origin) api.RUNTIME('focusTab', { tabId: origin.id, windowId: origin.windowId });
    }
  }
}
