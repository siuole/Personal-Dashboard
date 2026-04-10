import { getToken } from './google-auth';

export interface Task {
  id: string;
  listId: string;
  title: string;
  due?: string;
  completed: boolean;
  notes?: string;
  parent?: string;
}

export async function fetchTasks(): Promise<Task[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  // Fetch all task lists
  const listsRes = await fetch(
    'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listsRes.ok) throw new Error('Task lists fetch failed');
  const listsData = await listsRes.json();
  const lists: { id: string }[] = listsData.items ?? [];
  if (lists.length === 0) return [];

  // Fetch tasks from all lists in parallel
  const results = await Promise.all(
    lists.map(async (list) => {
      const res = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        listId: list.id,
        title: (item.title as string) || '(Kein Titel)',
        due: item.due as string | undefined,
        completed: item.status === 'completed',
        notes: item.notes as string | undefined,
        parent: item.parent as string | undefined,
      }));
    })
  );

  return results.flat();
}

export async function completeTask(taskId: string, listId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

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
