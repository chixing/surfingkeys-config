export interface DissolveResult {
  ungrouped: number;
  remaining: string[];
  added: number;
}

function request<T>(action: string, args: Record<string, unknown> = {}, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Surfingkeys did not respond.')), timeout);
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

async function dissolve(groupId?: number): Promise<DissolveResult> {
  const capabilities = await request<{ batchDissolve?: number }>('getGroupCapabilities', {}, 1200).catch(
    () => null,
  );
  if (capabilities?.batchDissolve !== 1)
    throw new Error('Batch ungrouping needs the local Surfingkeys build. Load it, then reload this page.');
  return request<DissolveResult>('dissolveTabGroups', groupId === undefined ? {} : { groupId });
}

export const dissolveGroup = (groupId: number): Promise<DissolveResult> => dissolve(groupId);
export const dissolveAllGroups = (): Promise<DissolveResult> => dissolve();
