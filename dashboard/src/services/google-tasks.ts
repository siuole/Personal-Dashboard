import { getToken } from './google-auth';

export interface Task {
  id: string;
  title: string;
  due?: string;
  completed: boolean;
  notes?: string;
  parent?: string;
}

export async function fetchTasks(): Promise<Task[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  // Get the default task list
  const listsRes = await fetch(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listsRes.ok) throw new Error('Task lists fetch failed');
  const listsData = await listsRes.json();
  const listId = listsData.items?.[0]?.id;
  if (!listId) return [];

  const tasksRes = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false&maxResults=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!tasksRes.ok) throw new Error('Tasks fetch failed');
  const tasksData = await tasksRes.json();

  return (tasksData.items ?? []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    title: (item.title as string) || '(Kein Titel)',
    due: item.due as string | undefined,
    completed: item.status === 'completed',
    notes: item.notes as string | undefined,
    parent: item.parent as string | undefined,
  }));
}

export async function completeTask(taskId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const listsRes = await fetch(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listsData = await listsRes.json();
  const listId = listsData.items?.[0]?.id;
  if (!listId) return;

  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed' }),
    }
  );
  if (!res.ok) throw new Error(`Task complete failed: ${res.status}`);
}
