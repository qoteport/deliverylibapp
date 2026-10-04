import { Order, USD_TO_LRD_RATE } from '../types';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  smsFromNumber: string;
  whatsappFromNumber: string;
  targetWhatsAppNumber: string;
  whatsappContentSid: string;
  enableWhatsApp: boolean;
  enableSms: boolean;
  autoSendOnOrder: boolean;
}

export const DEFAULT_TWILIO_CONFIG: TwilioConfig = {
  accountSid: 'ACb3a80531ce7a4b9bf4c6d76f109ce98c',
  authToken: 'bcee5ebe4ec0044e3f4bdbe4966e5198',
  smsFromNumber: '+19842547128',
  whatsappFromNumber: 'whatsapp:+14155238886',
  targetWhatsAppNumber: 'whatsapp:+233555279160',
  whatsappContentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
  enableWhatsApp: true,
  enableSms: true,
  autoSendOnOrder: true,
};

const TWILIO_STORAGE_KEY = 'aura_twilio_config_v2';

export function getSavedTwilioConfig(): TwilioConfig {
  try {
    const saved = localStorage.getItem(TWILIO_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_TWILIO_CONFIG, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_TWILIO_CONFIG;
}

export function saveTwilioConfig(config: TwilioConfig) {
  try {
    localStorage.setItem(TWILIO_STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

export function generateOrderWhatsAppText(order: Order, restaurantName?: string): string {
  const itemsText = order.items
    .map((i) => `• ${i.quantity}x ${i.menuItem.name} ${i.selectedSpiceLevel ? `[${i.selectedSpiceLevel}]` : ''}`)
    .join('\n');

  const lrdPrice = Math.round(order.total * USD_TO_LRD_RATE).toLocaleString();
  const address = order.deliveryAddress || order.deliveryArea || 'Monrovia, LR';
  const table = order.tableNumber ? ` (Table: ${order.tableNumber})` : '';

  return `🔥 *NEW ORDER #${order.id}*
📍 *Spot:* ${restaurantName || 'AURA Monrovia'}
🛵 *Type:* ${order.diningMode.toUpperCase()}${table}
👤 *Customer:* ${order.customerName} (${order.customerPhone})
📌 *Address:* ${address}

🍽️ *ITEMS:*
${itemsText}

💰 *TOTAL:* $${order.total.toFixed(2)} USD (~L$${lrdPrice} LRD)
💳 *Payment:* ${order.paymentMethod.toUpperCase()} ${order.paymentNumber ? `(${order.paymentNumber})` : ''}
⏱️ *ETA:* ${order.estimatedDeliveryTime || '25 mins'}`;
}

export function generateOrderSmsText(order: Order, restaurantName?: string): string {
  return `AURA Food Order #${order.id} confirmed! Kitchen: ${restaurantName || 'AURA Monrovia'}. Total: $${order.total.toFixed(2)}. ETA: ${order.estimatedDeliveryTime || '25 mins'}. Delivery to: ${order.deliveryArea || 'Monrovia'}. Track live in app!`;
}

export function getWhatsAppDispatchUrl(phoneNumber: string, order: Order, restaurantName?: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const text = generateOrderWhatsAppText(order, restaurantName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Send an SMS via Twilio API
 */
export async function sendTwilioSms(
  toNumber: string,
  message: string,
  config?: TwilioConfig
): Promise<{ success: boolean; sid?: string; message: string }> {
  const cfg = config || getSavedTwilioConfig();

  if (!cfg.accountSid || !cfg.authToken) {
    return { success: false, message: 'Twilio Account SID or Auth Token missing.' };
  }

  // Normalize phone number (ensure + prefix if standard intl)
  let cleanTo = toNumber.trim();
  if (!cleanTo.startsWith('+')) {
    if (cleanTo.startsWith('0')) {
      // Liberian local number (088 / 077 -> +231)
      cleanTo = '+231' + cleanTo.substring(1);
    } else {
      cleanTo = '+' + cleanTo;
    }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('To', cleanTo);
  formData.append('From', cfg.smsFromNumber);
  formData.append('Body', message);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${cfg.accountSid}:${cfg.authToken}`),
      },
      body: formData.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('✅ Twilio SMS sent successfully:', data.sid);
      return { success: true, sid: data.sid, message: `SMS sent to ${cleanTo}` };
    } else {
      console.error('❌ Twilio SMS error:', data);
      return { success: false, message: data.message || `Twilio error ${res.status}` };
    }
  } catch (err) {
    console.error('❌ Network error sending Twilio SMS:', err);
    return { success: false, message: (err as Error).message || 'Network error' };
  }
}

/**
 * Send a WhatsApp Message via Twilio API
 */
export async function sendTwilioWhatsApp(
  toNumber: string,
  message: string,
  contentVariables?: Record<string, string>,
  config?: TwilioConfig
): Promise<{ success: boolean; sid?: string; message: string }> {
  const cfg = config || getSavedTwilioConfig();

  if (!cfg.accountSid || !cfg.authToken) {
    return { success: false, message: 'Twilio Account SID or Auth Token missing.' };
  }

  let cleanTo = toNumber.trim();
  if (!cleanTo.startsWith('whatsapp:')) {
    if (!cleanTo.startsWith('+')) {
      if (cleanTo.startsWith('0')) {
        cleanTo = '+231' + cleanTo.substring(1);
      } else {
        cleanTo = '+' + cleanTo;
      }
    }
    cleanTo = `whatsapp:${cleanTo}`;
  }

  const fromNumber = cfg.whatsappFromNumber.startsWith('whatsapp:')
    ? cfg.whatsappFromNumber
    : `whatsapp:${cfg.whatsappFromNumber}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('To', cleanTo);
  formData.append('From', fromNumber);

  if (cfg.whatsappContentSid && contentVariables) {
    formData.append('ContentSid', cfg.whatsappContentSid);
    formData.append('ContentVariables', JSON.stringify(contentVariables));
  } else if (cfg.whatsappContentSid) {
    formData.append('ContentSid', cfg.whatsappContentSid);
    formData.append('ContentVariables', JSON.stringify({ "1": "Order Dispatch", "2": "Immediate" }));
  } else {
    formData.append('Body', message);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${cfg.accountSid}:${cfg.authToken}`),
      },
      body: formData.toString(),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('✅ Twilio WhatsApp sent successfully:', data.sid);
      return { success: true, sid: data.sid, message: `WhatsApp sent to ${cleanTo}` };
    } else {
      console.error('❌ Twilio WhatsApp error:', data);
      return { success: false, message: data.message || `Twilio error ${res.status}` };
    }
  } catch (err) {
    console.error('❌ Network error sending Twilio WhatsApp:', err);
    return { success: false, message: (err as Error).message || 'Network error' };
  }
}

/**
 * Dispatch automatic notifications for a newly placed order
 */
export async function sendTwilioOrderNotification(
  order: Order,
  restaurantName?: string
): Promise<{ success: boolean; smsStatus?: string; whatsappStatus?: string }> {
  const config = getSavedTwilioConfig();
  if (!config.autoSendOnOrder) {
    return { success: true, smsStatus: 'Auto-send disabled in settings' };
  }

  let smsResult: { success: boolean; message: string } = { success: false, message: 'SMS disabled' };
  let waResult: { success: boolean; message: string } = { success: false, message: 'WhatsApp disabled' };

  // 1. Send SMS to customer or kitchen
  if (config.enableSms && order.customerPhone) {
    const smsText = generateOrderSmsText(order, restaurantName);
    smsResult = await sendTwilioSms(order.customerPhone, smsText, config);
  }

  // 2. Send WhatsApp to kitchen manager / dispatch destination
  if (config.enableWhatsApp) {
    const waText = generateOrderWhatsAppText(order, restaurantName);
    const destination = config.targetWhatsAppNumber || 'whatsapp:+233555279160';
    waResult = await sendTwilioWhatsApp(
      destination,
      waText,
      { "1": order.id, "2": order.estimatedDeliveryTime || "25 mins" },
      config
    );
  }

  return {
    success: smsResult.success || waResult.success,
    smsStatus: smsResult.message,
    whatsappStatus: waResult.message,
  };
}
