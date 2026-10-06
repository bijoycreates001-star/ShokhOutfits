import crypto from 'crypto';

export interface MetaCapiEventData {
  eventName: string;
  eventTime?: number;
  eventSourceUrl?: string;
  userData?: {
    clientIpAddress?: string;
    clientUserAgent?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    contentType?: string;
    orderId?: string;
    numItems?: number;
    status?: boolean;
    contents?: Array<{
      id: string;
      quantity: number;
      item_price?: number;
    }>;
  };
  testEventCode?: string;
}

/**
 * SHA-256 hash helper as required by Meta Conversions API for user data
 */
function hashData(input?: string): string | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

/**
 * Sends a server-side event to Meta Conversions API (Graph API)
 */
export async function sendMetaCapiEvent(
  pixelId: string,
  accessToken: string,
  event: MetaCapiEventData
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!pixelId || !accessToken) {
    return { success: false, error: 'Meta Pixel ID or Access Token missing.' };
  }

  const url = `https://graph.facebook.com/v19.0/${pixelId.trim()}/events?access_token=${accessToken.trim()}`;

  const payloadUserData: Record<string, any> = {
    client_ip_address: event.userData?.clientIpAddress || undefined,
    client_user_agent: event.userData?.clientUserAgent || undefined,
  };

  if (event.userData?.email) payloadUserData.em = [hashData(event.userData.email)];
  if (event.userData?.phone) payloadUserData.ph = [hashData(event.userData.phone.replace(/[^0-9]/g, ''))];
  if (event.userData?.firstName) payloadUserData.fn = [hashData(event.userData.firstName)];
  if (event.userData?.lastName) payloadUserData.ln = [hashData(event.userData.lastName)];
  if (event.userData?.externalId) payloadUserData.external_id = [hashData(event.userData.externalId)];

  const eventPayload: Record<string, any> = {
    event_name: event.eventName,
    event_time: event.eventTime || Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: event.eventSourceUrl || 'https://shokhoutfits.com',
    user_data: payloadUserData,
  };

  if (event.customData) {
    eventPayload.custom_data = {
      currency: event.customData.currency || 'BDT',
      value: event.customData.value,
      content_name: event.customData.contentName,
      content_category: event.customData.contentCategory,
      content_ids: event.customData.contentIds,
      content_type: event.customData.contentType || 'product',
      order_id: event.customData.orderId,
      num_items: event.customData.numItems,
      contents: event.customData.contents,
    };
  }

  const requestBody: Record<string, any> = {
    data: [eventPayload],
  };

  if (event.testEventCode && event.testEventCode.trim()) {
    requestBody.test_event_code = event.testEventCode.trim();
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.warn('[Meta CAPI Error Response]:', data.error || data);
      return {
        success: false,
        error: data.error?.message || 'Failed to dispatch Meta CAPI event',
        data,
      };
    }

    console.log(`[Meta CAPI Success] Event "${event.eventName}" dispatched (events_received: ${data.events_received || 1})`);
    return { success: true, data };
  } catch (err: any) {
    console.error('[Meta CAPI Request Exception]:', err.message || err);
    return { success: false, error: err.message || 'Meta CAPI network error' };
  }
}
