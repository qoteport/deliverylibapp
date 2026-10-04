import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse standard URL-encoded form data (from Twilio webhooks) and JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Twilio Message Status Callback Webhook
 * Twilio posts updates here when SMS / WhatsApp messages are queued, sent, delivered, undelivered, or failed.
 * Supported paths: /api/twilio/status-callback, /api/callback, /callback, /status-callback, /api/twilio/callback
 */
const handleStatusCallback = (req: Request, res: Response) => {
  const { MessageSid, SmsSid, MessageStatus, SmsStatus, To, From, ErrorCode, ErrorMessage } = req.body || {};
  const status = MessageStatus || SmsStatus || 'received';
  const sid = MessageSid || SmsSid || 'N/A';

  console.log(`📡 [Twilio Status Callback] SID: ${sid} | Status: ${status} | To: ${To || 'N/A'} | From: ${From || 'N/A'}`);

  if (ErrorCode) {
    console.warn(`⚠️ [Twilio Delivery Warning] ErrorCode: ${ErrorCode} - ${ErrorMessage}`);
  }

  // Respond immediately with HTTP 200 XML/JSON so Twilio confirms callback delivery
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
 * Handles incoming customer SMS or WhatsApp replies.
 */
app.post('/api/twilio/webhook', (req: Request, res: Response) => {
  const { Body, From, To } = req.body;
  console.log(`📩 [Twilio Inbound Message] From: ${From} | Body: "${Body}"`);

  // Return standard TwiML response acknowledging receipt
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
  res.json({ status: 'ok', service: 'AURA Monrovia API', timestamp: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AURA Monrovia Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
