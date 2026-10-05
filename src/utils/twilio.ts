import { Order, USD_TO_LRD_RATE } from '../types';
import { normalizeLiberianPhoneNumber } from './phoneUtils';

export interface TwilioConfig {
  enableWhatsApp: boolean;
  enableSms: boolean;
  autoSendOnOrder: boolean;
  targetWhatsAppNumber?: string;
}

export const DEFAULT_TWILIO_CONFIG: TwilioConfig = {
  enableWhatsApp: true,
  enableSms: true,
  autoSendOnOrder: true,
  targetWhatsAppNumber: 'whatsapp:+233555279160',
};

const TWILIO_STORAGE_KEY = 'aura_twilio_config_v3';

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
  const spotName = restaurantName || order.restaurantName || 'AURA Monrovia';

  if (order.status === 'received') {
    return `AURA Order #${order.id} received! Kitchen: ${spotName}. Total: $${order.total.toFixed(2)}. Transmitted to kitchen for preparation. Track live in app!`;
  }
  
  if (order.status === 'cancelled') {
    if (order.cancelledBy === 'customer') {
      return `AURA Notice: Order #${order.id} was cancelled by you (customer request). No charges were incurred. Feel free to reorder anytime!`;
    }
    if (order.cancelledBy === 'restaurant') {
      const reason = order.cancellationReason ? ` Reason: ${order.cancellationReason}.` : '';
      return `AURA Alert: Order #${order.id} was declined/cancelled by ${spotName}.${reason} We apologize for the inconvenience. Please choose another spot in the app.`;
    }
    return `AURA Notice: Order #${order.id} was cancelled by dispatch (${order.cancellationReason || 'Admin request'}).`;
  }

  return `AURA Order #${order.id} is ${order.status}! Kitchen: ${spotName}. Total: $${order.total.toFixed(2)}. ETA: ${order.estimatedDeliveryTime || '25 mins'}. Track live in app!`;
}

export function getWhatsAppDispatchUrl(phoneNumber: string, order: Order, restaurantName?: string): string {
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const text = generateOrderWhatsAppText(order, restaurantName);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Send an SMS via secure Backend API endpoint
 */
export async function sendTwilioSms(
  toNumber: string,
  message: string
): Promise<{ success: boolean; sid?: string; message: string }> {
  const cleanTo = normalizeLiberianPhoneNumber(toNumber);

  try {
    const res = await fetch('/api/notifications/sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: cleanTo, message }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, sid: data.sid, message: data.message || `SMS sent to ${cleanTo}` };
    } else {
      return { success: false, message: data.error || `SMS dispatch failed (${res.status})` };
    }
  } catch (err: any) {
    console.warn('Backend SMS dispatch notice:', err);
    return { success: false, message: err.message || 'Network error connecting to notification server' };
  }
}

/**
 * Send a WhatsApp Message via secure Backend API endpoint
 */
export async function sendTwilioWhatsApp(
  toNumber: string,
  message: string,
  contentVariables?: Record<string, string>
): Promise<{ success: boolean; sid?: string; message: string }> {
  try {
    const res = await fetch('/api/notifications/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: toNumber,
        message,
        contentVariables,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, sid: data.sid, message: data.message || `WhatsApp sent to ${toNumber}` };
    } else {
      return { success: false, message: data.error || `WhatsApp dispatch failed (${res.status})` };
    }
  } catch (err: any) {
    console.warn('Backend WhatsApp dispatch notice:', err);
    return { success: false, message: err.message || 'Network error connecting to notification server' };
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

  let smsResult: { success: boolean; message: string } = { success: false, message: 'SMS skipped' };
  let waResult: { success: boolean; message: string } = { success: false, message: 'WhatsApp skipped' };

  // 1. Send SMS to customer or kitchen
  if (config.enableSms && order.customerPhone) {
    const smsText = generateOrderSmsText(order, restaurantName);
    smsResult = await sendTwilioSms(order.customerPhone, smsText);
  }

  // 2. Send WhatsApp to kitchen manager / dispatch destination
  if (config.enableWhatsApp) {
    const waText = generateOrderWhatsAppText(order, restaurantName);
    const destination = config.targetWhatsAppNumber || 'whatsapp:+233555279160';
    waResult = await sendTwilioWhatsApp(
      destination,
      waText,
      { "1": order.id, "2": order.estimatedDeliveryTime || "25 mins" }
    );
  }

  return {
    success: smsResult.success || waResult.success,
    smsStatus: smsResult.message,
    whatsappStatus: waResult.message,
  };
}
