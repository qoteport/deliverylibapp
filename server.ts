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

// Twilio server credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_SMS_FROM = process.env.TWILIO_SMS_FROM || '+19842547128';
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const TWILIO_DISPATCH_WHATSAPP = process.env.TWILIO_DISPATCH_WHATSAPP || 'whatsapp:+233555279160';
const TWILIO_WHATSAPP_CONTENT_SID = process.env.TWILIO_WHATSAPP_CONTENT_SID || 'HXb5b62575e6e4ff6129ad7c8efe1f983e';

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
    dispatchWhatsAppNumber: TWILIO_DISPATCH_WHATSAPP,
    features: {
      smsEnabled: Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
      whatsappEnabled: Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN),
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

/**
 * Secure Server-side Twilio SMS Endpoint
 */
app.post('/api/notifications/sms', async (req: Request, res: Response) => {
  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Recipient phone number and message are required.' });
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return res.status(200).json({ success: false, skipped: true, error: 'Twilio credentials not configured.' });
  }

  let cleanTo = String(to).trim();
  if (!cleanTo.startsWith('+')) {
    if (cleanTo.startsWith('0')) {
      cleanTo = '+231' + cleanTo.substring(1);
    } else {
      cleanTo = '+' + cleanTo;
    }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', cleanTo);
    formData.append('From', TWILIO_SMS_FROM);
    formData.append('Body', message);

    const twilioRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: formData.toString(),
    });

    const data = (await twilioRes.json().catch(() => ({}))) as Record<string, any>;
    if (twilioRes.ok) {
      console.log(`✅ [Twilio SMS Server] Sent to ${cleanTo}: SID ${data.sid}`);
      return res.json({ success: true, sid: data.sid, message: `SMS successfully sent to ${cleanTo}` });
    } else {
      console.warn('⚠️ [Twilio SMS Notice]:', data.message || 'Rate limit / quota');
      return res.status(200).json({ success: false, error: data.message || 'Twilio SMS notice' });
    }
  } catch (err: any) {
    console.warn('⚠️ [Twilio SMS Network Exception]:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Network exception' });
  }
});

/**
 * Secure Server-side Twilio WhatsApp Endpoint
 */
app.post('/api/notifications/whatsapp', async (req: Request, res: Response) => {
  const { to, message, contentVariables, contentSid } = req.body || {};

  if (!message && !contentVariables) {
    return res.status(400).json({ success: false, error: 'Message body or template variables required.' });
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return res.status(200).json({ success: false, skipped: true, error: 'Twilio credentials not configured.' });
  }

  let cleanTo = String(to || TWILIO_DISPATCH_WHATSAPP).trim();
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

  const fromNumber = TWILIO_WHATSAPP_FROM.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_FROM
    : `whatsapp:${TWILIO_WHATSAPP_FROM}`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('To', cleanTo);
    formData.append('From', fromNumber);

    const targetContentSid = contentSid || TWILIO_WHATSAPP_CONTENT_SID;
    if (targetContentSid && contentVariables) {
      formData.append('ContentSid', targetContentSid);
      formData.append('ContentVariables', typeof contentVariables === 'string' ? contentVariables : JSON.stringify(contentVariables));
    } else {
      formData.append('Body', message || 'New AURA Monrovia Notification');
    }

    const twilioRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      },
      body: formData.toString(),
    });

    const data = (await twilioRes.json().catch(() => ({}))) as Record<string, any>;
    if (twilioRes.ok) {
      console.log(`✅ [Twilio WhatsApp Server] Sent to ${cleanTo}: SID ${data.sid}`);
      return res.json({ success: true, sid: data.sid, message: `WhatsApp message sent to ${cleanTo}` });
    } else {
      console.warn('⚠️ [Twilio WhatsApp Notice]:', data.message || 'Rate limit / quota');
      return res.status(200).json({ success: false, error: data.message || 'Twilio WhatsApp notice' });
    }
  } catch (err: any) {
    console.warn('⚠️ [Twilio WhatsApp Exception]:', err.message);
    return res.status(200).json({ success: false, error: err.message || 'Network exception' });
  }
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
