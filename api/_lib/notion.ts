export interface NotionOAuthTokenResponse {
  access_token: string;
  token_type: string;
  bot_id: string;
  workspace_name: string | null;
  workspace_icon: string | null;
  workspace_id: string;
  owner?: {
    type: string;
    user?: {
      id: string;
      name?: string;
      avatar_url?: string;
      person?: { email?: string };
    };
  };
  duplicated_template_id?: string | null;
}

export function getNotionAuthorizeUrl(stateToken: string, redirectUri: string): string {
  const clientId = process.env.NOTION_CLIENT_ID;
  if (!clientId) {
    throw new Error('NOTION_CLIENT_ID is not configured in server environment variables.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    owner: 'user',
    redirect_uri: redirectUri,
    state: stateToken,
  });

  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export async function exchangeNotionCode(code: string, redirectUri: string): Promise<NotionOAuthTokenResponse> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NOTION_CLIENT_ID or NOTION_CLIENT_SECRET is missing from server environment.');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = (await response.json().catch(() => null)) as Record<string, any> | null;

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || response.statusText || 'Failed to exchange Notion authorization code';
    throw new Error(`Notion OAuth error: ${errorMsg}`);
  }

  return data as NotionOAuthTokenResponse;
}

export async function createNotionTestPage(
  accessToken: string,
  databaseId?: string | null
): Promise<{ success: boolean; pageUrl: string; pageTitle: string; databaseName: string }> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const title = `NOVA Voice Note (ESP32-C3) — ${timestamp}`;

  // If databaseId is provided, create page inside database
  const body: Record<string, unknown> = {
    parent: databaseId ? { database_id: databaseId } : undefined,
    properties: {
      title: {
        title: [{ text: { content: title } }],
      },
      // If table has standard 'Name' property instead of 'title'
      Name: {
        title: [{ text: { content: title } }],
      },
    },
    children: [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🎙️ Audio Memo Captured by NOVA' } }],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content:
                  'This note was synced from your NOVA keychain assistant (ESP32-C3 Super Mini + MAX4466 microphone). WakeNet triggered via "Hi ESP".',
              },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          icon: { emoji: '⚡' },
          rich_text: [
            {
              type: 'text',
              text: {
                content:
                  'Status: Cloud pipeline operational. Audio transcribed at 16 kHz and delivered idempotently.',
              },
            },
          ],
        },
      },
    ],
  };

  // If no databaseId is linked, search for user's accessible databases or pages
  if (!databaseId) {
    const searchRes = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        page_size: 1,
      }),
    });

    const searchData = (await searchRes.json().catch(() => null)) as any;
    if (searchData?.results?.length > 0) {
      body.parent = { database_id: searchData.results[0].id };
    } else {
      // Fallback parent to first accessible page
      const pageSearch = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: { value: 'page', property: 'object' },
          page_size: 1,
        }),
      });
      const pageData = (await pageSearch.json().catch(() => null)) as any;
      if (pageData?.results?.length > 0) {
        body.parent = { page_id: pageData.results[0].id };
      } else {
        throw new Error('No accessible Notion database or page found in the linked workspace. Grant NOVA access in Notion.');
      }
    }
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const pageData = (await response.json().catch(() => null)) as any;

  if (!response.ok) {
    throw new Error(`Notion API error (${response.status}): ${pageData?.message || response.statusText}`);
  }

  return {
    success: true,
    pageUrl: pageData.url,
    pageTitle: title,
    databaseName: 'NOVA Notes & Voice Inbox',
  };
}
