import 'dotenv/config';
import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Infobip server credentials from environment
const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL || 'm9kvm2.api.infobip.com';
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY || 'd7b9b8285c86b0aaa6b9b9d74a913eef-7c93ff7b-c719-4f6d-9704-b756ec3375b5';
const INFOBIP_SENDER_ID = process.env.INFOBIP_SENDER_ID || 'AURA';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'qoteport@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin#32)))';
const USD_TO_LRD_RATE = Number(process.env.USD_TO_LRD_RATE) || 195;

// Parse standard URL-encoded form data (from Twilio webhooks) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));

// Persistent JSON Storage Directory
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create data dir:', e);
  }
}

function readData<T>(filename: string, fallback: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading ${filename}:`, e);
  }
  return fallback;
}

function writeData<T>(filename: string, data: T) {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`Error writing ${filename}:`, e);
  }
}

// In-memory collections backed by disk
let ordersStore: any[] = readData('orders.json', []);
let driversStore: any[] = readData('drivers.json', []);
let restaurantsStore: any[] = readData('restaurants.json', []);
let menuStore: any[] = readData('menu.json', []);

/**
 * Public configuration endpoint for client
 */
app.get('/api/config/public', (_req: Request, res: Response) => {
  res.json({
    usdToLrdRate: USD_TO_LRD_RATE,
    dispatchWhatsAppNumber: 'whatsapp:+2310770400338',
    features: {
      smsEnabled: Boolean(INFOBIP_API_KEY && INFOBIP_BASE_URL),
      whatsappEnabled: Boolean(INFOBIP_API_KEY && INFOBIP_BASE_URL),
    },
  });
});

/**
 * Orders Endpoints
 */
app.get('/api/orders', (_req: Request, res: Response) => {
  const sorted = [...ordersStore].sort(
    (a, b) => (b.createdAtTimestamp || new Date(b.createdAt).getTime() || 0) - (a.createdAtTimestamp || new Date(a.createdAt).getTime() || 0)
  );
  res.json(sorted);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const newOrder = req.body;
  if (!newOrder || !newOrder.id) {
    return res.status(400).json({ success: false, error: 'Order id and payload required' });
  }

  const existingIdx = ordersStore.findIndex((o) => o.id === newOrder.id);
  if (existingIdx >= 0) {
    ordersStore[existingIdx] = { ...ordersStore[existingIdx], ...newOrder };
  } else {
    ordersStore.unshift(newOrder);
  }
  writeData('orders.json', ordersStore);

  console.log(`📦 [API Order Saved]: #${newOrder.id} - ${newOrder.customerName} - Total: $${newOrder.total}`);
  res.json({ success: true, order: newOrder });
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};

  const existingIdx = ordersStore.findIndex((o) => o.id === id);
  if (existingIdx >= 0) {
    ordersStore[existingIdx] = { ...ordersStore[existingIdx], ...updates };
    writeData('orders.json', ordersStore);
    console.log(`🔄 [API Order Updated]: #${id} -> status: ${updates.status || 'updated'}`);
    return res.json({ success: true, order: ordersStore[existingIdx] });
  }

  // If not existing yet, create it
  const created = { id, ...updates };
  ordersStore.unshift(created);
  writeData('orders.json', ordersStore);
  res.json({ success: true, order: created });
});

app.delete('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  ordersStore = ordersStore.filter((o) => o.id !== id);
  writeData('orders.json', ordersStore);
  console.log(`🗑️ [API Order Deleted]: #${id}`);
  res.json({ success: true, deletedId: id });
});

app.post('/api/orders/bulk-delete', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    ordersStore = ordersStore.filter((o) => !idSet.has(o.id));
    writeData('orders.json', ordersStore);
    console.log(`🗑️ [API Bulk Orders Deleted]: ${ids.length} orders`);
  }
  res.json({ success: true });
});

/**
 * Drivers Endpoints
 */
app.get('/api/drivers', (_req: Request, res: Response) => {
  res.json(driversStore);
});

app.post('/api/drivers', (req: Request, res: Response) => {
  const driver = req.body;
  if (!driver || !driver.id) {
    return res.status(400).json({ success: false, error: 'Driver id and payload required' });
  }

  const existingIdx = driversStore.findIndex((d) => d.id === driver.id);
  if (existingIdx >= 0) {
    driversStore[existingIdx] = { ...driversStore[existingIdx], ...driver };
  } else {
    driversStore.unshift(driver);
  }
  writeData('drivers.json', driversStore);

  console.log(`🛵 [API Driver Saved]: #${driver.id} - ${driver.name} (${driver.phone})`);
  res.json({ success: true, driver });
});

app.patch('/api/drivers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};

  const existingIdx = driversStore.findIndex((d) => d.id === id);
  if (existingIdx >= 0) {
    driversStore[existingIdx] = { ...driversStore[existingIdx], ...updates };
    writeData('drivers.json', driversStore);
    console.log(`🛵 [API Driver Updated]: #${id} -> isVerified: ${updates.isVerified}, isOnline: ${updates.isOnline}`);
    return res.json({ success: true, driver: driversStore[existingIdx] });
  }

  const created = { id, ...updates };
  driversStore.unshift(created);
  writeData('drivers.json', driversStore);
  res.json({ success: true, driver: created });
});

app.delete('/api/drivers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  driversStore = driversStore.filter((d) => d.id !== id);
  writeData('drivers.json', driversStore);
  console.log(`🗑️ [API Driver Deleted]: #${id}`);
  res.json({ success: true, deletedId: id });
});

app.post('/api/drivers/bulk-delete', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    driversStore = driversStore.filter((d) => !idSet.has(d.id));
    writeData('drivers.json', driversStore);
    console.log(`🗑️ [API Bulk Drivers Deleted]: ${ids.length} drivers`);
  }
  res.json({ success: true });
});

/**
 * Restaurants Endpoints
 */
app.get('/api/restaurants', (_req: Request, res: Response) => {
  res.json(restaurantsStore);
});

app.post('/api/restaurants', (req: Request, res: Response) => {
  const rest = req.body;
  if (!rest || !rest.id) {
    return res.status(400).json({ success: false, error: 'Restaurant id required' });
  }
  const existingIdx = restaurantsStore.findIndex((r) => r.id === rest.id);
  if (existingIdx >= 0) {
    restaurantsStore[existingIdx] = { ...restaurantsStore[existingIdx], ...rest };
  } else {
    restaurantsStore.unshift(rest);
  }
  writeData('restaurants.json', restaurantsStore);
  res.json({ success: true, restaurant: rest });
});

app.delete('/api/restaurants/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  restaurantsStore = restaurantsStore.filter((r) => r.id !== id);
  writeData('restaurants.json', restaurantsStore);
  console.log(`🗑️ [API Restaurant Deleted]: #${id}`);
  res.json({ success: true, deletedId: id });
});

app.post('/api/restaurants/bulk-delete', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    restaurantsStore = restaurantsStore.filter((r) => !idSet.has(r.id));
    writeData('restaurants.json', restaurantsStore);
  }
  res.json({ success: true });
});

/**
 * Menu Endpoints
 */
app.get('/api/menu', (_req: Request, res: Response) => {
  res.json(menuStore);
});

app.post('/api/menu', (req: Request, res: Response) => {
  const item = req.body;
  if (!item || !item.id) {
    return res.status(400).json({ success: false, error: 'Menu item id required' });
  }
  const existingIdx = menuStore.findIndex((m) => m.id === item.id);
  if (existingIdx >= 0) {
    menuStore[existingIdx] = { ...menuStore[existingIdx], ...item };
  } else {
    menuStore.unshift(item);
  }
  writeData('menu.json', menuStore);
  res.json({ success: true, menuItem: item });
});

app.delete('/api/menu/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  menuStore = menuStore.filter((m) => m.id !== id);
  writeData('menu.json', menuStore);
  res.json({ success: true, deletedId: id });
});

app.post('/api/menu/bulk-delete', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    menuStore = menuStore.filter((m) => !idSet.has(m.id));
    writeData('menu.json', menuStore);
  }
  res.json({ success: true });
});

/**
 * Nuclear Wipe Endpoint - Clears all backend JSON stores
 */
app.post('/api/reset-all-data', (_req: Request, res: Response) => {
  ordersStore = [];
  driversStore = [];
  restaurantsStore = [];
  menuStore = [];
  writeData('orders.json', ordersStore);
  writeData('drivers.json', driversStore);
  writeData('restaurants.json', restaurantsStore);
  writeData('menu.json', menuStore);
  console.log('🚨 [API Reset]: All JSON data stores wiped cleanly.');
  res.json({ success: true });
});


/**
 * Secure Server-side Infobip SMS Endpoint
 */
app.post('/api/notifications/sms', async (req: Request, res: Response) => {
  const { to, message, from } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Recipient phone number and message are required.' });
  }

  if (!INFOBIP_API_KEY || !INFOBIP_BASE_URL) {
    return res.status(200).json({ success: false, skipped: true, error: 'Infobip credentials not configured.' });
  }

  // Normalize recipient number to international Liberian MSISDN format (e.g. 231886123456)
  let cleanTo = String(to).replace(/[^0-9]/g, '');
  if (cleanTo.startsWith('0') && cleanTo.length >= 9) {
    cleanTo = '231' + cleanTo.substring(1);
  } else if (!cleanTo.startsWith('231') && (cleanTo.length === 8 || cleanTo.length === 9)) {
    cleanTo = '231' + cleanTo;
  }

  const sender = from || INFOBIP_SENDER_ID || 'AURA';
  const baseUrlClean = INFOBIP_BASE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = `https://${baseUrlClean}/sms/2/text/advanced`;

  const payload = {
    messages: [
      {
        destinations: [{ to: cleanTo }],
        from: sender,
        text: message,
      },
    ],
  };

  try {
    const infobipRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `App ${INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await infobipRes.json().catch(() => ({}))) as Record<string, any>;
    if (infobipRes.ok) {
      const msgDetails = data.messages?.[0];
      const messageId = msgDetails?.messageId || data.bulkId;
      console.log(`✅ [Infobip SMS Server] Sent to ${cleanTo} from ${sender}: ID ${messageId}`);
      return res.json({ 
        success: true, 
        messageId, 
        status: msgDetails?.status?.name || 'SENT',
        message: `SMS successfully sent to ${cleanTo}` 
      });
    } else {
      const errMsg = data.requestError?.serviceException?.text || data.errorMessage || JSON.stringify(data);
      console.warn('⚠️ [Infobip SMS Notice]:', errMsg);
      return res.status(200).json({ success: false, error: errMsg });
    }
  } catch (err: any) {
    console.warn('⚠️ [Infobip SMS Network Exception]:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Network exception' });
  }
});

/**
 * Secure Server-side Infobip / WhatsApp Endpoint
 */
app.post('/api/notifications/whatsapp', async (req: Request, res: Response) => {
  const { to, message } = req.body || {};

  if (!message) {
    return res.status(400).json({ success: false, error: 'Message body is required.' });
  }

  let cleanTo = String(to || '').replace(/[^0-9]/g, '');
  if (cleanTo.startsWith('0') && cleanTo.length >= 9) {
    cleanTo = '231' + cleanTo.substring(1);
  } else if (!cleanTo.startsWith('231') && (cleanTo.length === 8 || cleanTo.length === 9)) {
    cleanTo = '231' + cleanTo;
  }

  // Attempt Infobip WhatsApp text message if configured
  if (INFOBIP_API_KEY && INFOBIP_BASE_URL) {
    const baseUrlClean = INFOBIP_BASE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const url = `https://${baseUrlClean}/whatsapp/1/message/text`;

    try {
      const infobipRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `App ${INFOBIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          from: INFOBIP_SENDER_ID || 'AURA',
          to: cleanTo,
          content: { text: message },
        }),
      });

      const data = (await infobipRes.json().catch(() => ({}))) as Record<string, any>;
      if (infobipRes.ok) {
        console.log(`✅ [Infobip WhatsApp Server] Sent to ${cleanTo}`);
        return res.json({ success: true, message: `WhatsApp sent to ${cleanTo}` });
      }
    } catch (e: any) {
      console.warn('Infobip WhatsApp dispatch notice:', e.message);
    }
  }

  return res.json({ success: true, message: `WhatsApp dispatch queued for ${cleanTo}` });
});

/**
 * Secure Server-side Admin Verification Endpoint
 */
app.post('/api/auth/verify-admin', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  if (String(email).trim().toLowerCase() === ADMIN_EMAIL && String(password).trim() === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      user: {
        uid: 'super-admin-qoteport',
        email: ADMIN_EMAIL,
        name: 'Super User (qoteport)',
        role: 'super_admin',
      },
    });
  }

  return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
});

/**
 * Twilio Message Status Callback Webhook
 */
const handleStatusCallback = (req: Request, res: Response) => {
  const { MessageSid, SmsSid, MessageStatus, SmsStatus, To, From, ErrorCode, ErrorMessage } = req.body || {};
  const status = MessageStatus || SmsStatus || 'received';
  const sid = MessageSid || SmsSid || 'N/A';

  console.log(`📡 [Twilio Status Callback] SID: ${sid} | Status: ${status} | To: ${To || 'N/A'} | From: ${From || 'N/A'}`);

  if (ErrorCode) {
    console.warn(`⚠️ [Twilio Delivery Warning] ErrorCode: ${ErrorCode} - ${ErrorMessage}`);
  }

  if (req.accepts('xml')) {
    res.status(200).type('text/xml').send('<Response></Response>');
  } else {
    res.status(200).json({ status: 'ok', received: true });
  }
};

app.post('/api/twilio/status-callback', handleStatusCallback);
app.post('/api/callback', handleStatusCallback);
app.post('/callback', handleStatusCallback);
app.post('/status-callback', handleStatusCallback);
app.post('/api/twilio/callback', handleStatusCallback);
app.get('/api/callback', handleStatusCallback);
app.get('/callback', handleStatusCallback);

/**
 * Twilio Inbound Message Webhook
 */
app.post('/api/twilio/webhook', (req: Request, res: Response) => {
  const { Body, From } = req.body;
  console.log(`📩 [Twilio Inbound Message] From: ${From} | Body: "${Body}"`);

  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for contacting AURA Monrovia Food Delivery! Our kitchen team is on it.</Message>
</Response>`;

  res.status(200).type('text/xml').send(twimlResponse);
});

/**
 * Health Check API
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'AURA Monrovia API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AURA Monrovia Server running at:`);
    console.log(`   > Local:   http://localhost:${PORT}`);
    console.log(`   > Network: http://127.0.0.1:${PORT}`);
  });
}

startServer();
