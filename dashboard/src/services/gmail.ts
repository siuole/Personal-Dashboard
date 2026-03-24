import { getToken } from './google-auth';

export interface GmailMessage {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

function parseFromName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.split('@')[0];
}

export async function fetchInboxMessages(maxResults = 8): Promise<GmailMessage[]> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error('Gmail list failed');
  const listData = await listRes.json();

  const messages: GmailMessage[] = await Promise.all(
    (listData.messages ?? []).map(async (msg: { id: string }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msgData = await msgRes.json();
      const headers: { name: string; value: string }[] = msgData.payload?.headers ?? [];
      const from = parseHeader(headers, 'From');
      return {
        id: msg.id,
        from,
        fromName: parseFromName(from),
        subject: parseHeader(headers, 'Subject') || '(Kein Betreff)',
        snippet: msgData.snippet ?? '',
        date: parseHeader(headers, 'Date'),
        isUnread: (msgData.labelIds ?? []).includes('UNREAD'),
      };
    })
  );

  return messages;
}
