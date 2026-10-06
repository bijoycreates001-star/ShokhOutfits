import dotenv from 'dotenv';
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim();

const SUPABASE_KEY = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''
).trim();

const isServerSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('your-project') &&
  !SUPABASE_KEY.includes('your-publishable-key') &&
  !SUPABASE_KEY.includes('your-key')
);

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { apiRouter } from './server/routes.ts';
import { seedSupabaseCatalog } from './server/seedSupabase.ts';

const supabaseServer = isServerSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

interface StoredDesign {
  id: string;
  originalName: string;
  mimeType: string;
  bufferBase64: string;
  sizeBytes: number;
  uploadedAt: number;
}

// In-memory persistent cache for custom designs
const designStorage = new Map<string, StoredDesign>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser with 25MB limit to allow high-res artwork / PDF
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Transparent Supabase Proxy Route to bypass browser sandbox / iframe CORS issues
  app.all('/api/supabase/*', async (req, res) => {
    if (!isServerSupabaseConfigured || !SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(503).json({
        error: 'Supabase is not configured',
        message: 'No active Supabase connection. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to reconnect.',
      });
    }

    let targetUrl = '';
    try {
      const targetBase = SUPABASE_URL;
      const publishableKey = SUPABASE_KEY;

      const subPath = req.url.replace(/^\/api\/supabase/, '');
      targetUrl = new URL(subPath, targetBase).toString();

      const forwardHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey !== 'host' &&
          lowerKey !== 'connection' &&
          lowerKey !== 'content-length' &&
          !lowerKey.startsWith('x-supabase-') &&
          typeof value === 'string'
        ) {
          forwardHeaders[key] = value;
        }
      }

      forwardHeaders['apikey'] = publishableKey;
      if (!forwardHeaders['authorization'] && !forwardHeaders['Authorization']) {
        forwardHeaders['Authorization'] = `Bearer ${publishableKey}`;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.body && (typeof req.body === 'string' || Object.keys(req.body).length > 0)) {
          fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          if (!forwardHeaders['content-type'] && !forwardHeaders['Content-Type']) {
            forwardHeaders['content-type'] = 'application/json';
          }
        }
      }

      const response = await fetch(targetUrl, fetchOptions);

      response.headers.forEach((val, key) => {
        const lower = key.toLowerCase();
        if (lower !== 'content-encoding' && lower !== 'transfer-encoding') {
          res.setHeader(key, val);
        }
      });

      res.status(response.status);
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error('[Supabase Proxy Error]:', err.message || err, err.cause);
      res.status(502).json({
        error: 'Supabase proxy request failed',
        details: err.message,
        cause: err.cause ? (err.cause.message || String(err.cause)) : undefined,
        targetUrl
      });
    }
  });

  // Mount central enterprise e-commerce API router
  app.use('/api', apiRouter);

  // API 1: Upload endpoint
  app.post('/api/reset-data', (_req, res) => {
    try {
      designStorage.clear();
      return res.json({ success: true, message: 'Server temporary design storage cleared.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/upload-custom-design', async (req, res) => {
    try {
      const { fileName, fileType, fileData, notes } = req.body;

      if (!fileName || !fileData) {
        return res.status(400).json({
          success: false,
          error: 'Missing file data. Please upload your custom design first.'
        });
      }

      // Check allowed mime types
      const normalizedType = (fileType || '').toLowerCase();
      const isAllowed = 
        normalizedType.includes('png') ||
        normalizedType.includes('jpeg') ||
        normalizedType.includes('jpg') ||
        normalizedType.includes('pdf') ||
        fileName.match(/\.(png|jpe?g|pdf)$/i);

      if (!isAllowed) {
        return res.status(400).json({
          success: false,
          error: 'Unsupported file format. Please upload a PNG, JPG, JPEG, or PDF.'
        });
      }

      // Strip data URL prefix if present
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Max size: 15MB
      const MAX_SIZE = 15 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds 15MB limit. Please upload a smaller file.'
        });
      }

      // Generate a secure, non-guessable random design ID
      const designId = crypto.randomBytes(12).toString('hex'); // 24 chars random hex

      const mimeType = normalizedType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      // Store in memory
      designStorage.set(designId, {
        id: designId,
        originalName: fileName,
        mimeType,
        bufferBase64: base64Data,
        sizeBytes: buffer.length,
        uploadedAt: Date.now()
      });

      // Construct public HTTPS URL - NEVER use localhost in public links
      let baseUrl = process.env.PUBLIC_BASE_URL || process.env.APP_URL || '';

      if (!baseUrl) {
        // Check forwarded headers
        const forwardedHost = req.get('x-forwarded-host') || req.get('host') || '';
        const forwardedProto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
        
        // If forwardedHost is a real public domain or cloud run domain, use it with HTTPS
        if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
          baseUrl = `https://${forwardedHost}`;
        } else if (req.body.clientOrigin && !req.body.clientOrigin.includes('localhost') && !req.body.clientOrigin.includes('127.0.0.1')) {
          baseUrl = req.body.clientOrigin;
        } else {
          // Public fallback to current hosted AI Studio Cloud Run domain
          baseUrl = 'https://ais-pre-rnzn3rq474weznerrzgqmv-408412630075.asia-southeast1.run.app';
        }
      }

      // Ensure baseUrl does NOT contain trailing slash and uses https
      baseUrl = baseUrl.trim().replace(/\/+$/, '');
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }

      const viewUrl = `${baseUrl}/view-design/${designId}`;

      // Server-side direct Supabase Storage persistent upload if connected
      let rawUrl = '';
      if (supabaseServer) {
        try {
          const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
          const storagePath = `catalog/${Date.now()}_${cleanName}`;
          const { data: uploadData, error: uploadErr } = await supabaseServer.storage
            .from('product-images')
            .upload(storagePath, buffer, {
              contentType: mimeType,
              upsert: true,
              cacheControl: '31536000',
            });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabaseServer.storage
              .from('product-images')
              .getPublicUrl(storagePath);
            if (publicUrlData?.publicUrl) {
              rawUrl = publicUrlData.publicUrl;
              console.log('[Server Supabase Auto-Upload Success]:', rawUrl);
            }
          } else if (uploadErr) {
            console.error('[Server Supabase Auto-Upload Error]:', uploadErr);
          }
        } catch (storageErr) {
          console.error('[Server Supabase Auto-Upload Exception]:', storageErr);
        }
      }

      return res.json({
        success: true,
        designId,
        viewUrl,
        rawUrl: rawUrl || viewUrl,
        fileName,
        sizeBytes: buffer.length
      });
    } catch (err: any) {
      console.error('Upload handler error:', err);
      return res.status(500).json({
        success: false,
        error: 'Upload failed. Please try again.'
      });
    }
  });

  // API 2: Raw file download/display
  app.get('/api/raw-design/:id', (req, res) => {
    const { id } = req.params;
    const item = designStorage.get(id);

    if (!item) {
      return res.status(404).send('Design not found or expired.');
    }

    const buffer = Buffer.from(item.bufferBase64, 'base64');
    res.setHeader('Content-Type', item.mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // Display inline for images and PDFs
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(item.originalName)}"`);
    return res.send(buffer);
  });

  // Web View 3: Clean, mobile & desktop responsive Viewer Page
  app.get('/view-design/:id', (req, res) => {
    const { id } = req.params;
    const item = designStorage.get(id);

    if (!item) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Design Not Found | Shokh Studio</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #faf9f5; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
              .card { background: white; border: 1px solid #e5e5e5; border-radius: 16px; padding: 32px; max-width: 440px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
              h1 { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; }
              p { font-size: 14px; color: #666; margin: 0 0 20px 0; }
              a { display: inline-block; background: black; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Design Not Found</h1>
              <p>This custom design link does not exist or has expired.</p>
              <a href="/">Go to Shokh Store</a>
            </div>
          </body>
        </html>
      `);
    }

    const rawFileUrl = `/api/raw-design/${item.id}`;
    const isPdf = item.mimeType === 'application/pdf' || item.originalName.toLowerCase().endsWith('.pdf');
    const sizeMb = (item.sizeBytes / (1024 * 1024)).toFixed(2);
    const uploadDateStr = new Date(item.uploadedAt).toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Custom Design - ${escapeHtml(item.originalName)} | Shokh</title>
          <meta name="robots" content="noindex, nofollow" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background-color: #faf9f5;
              color: #0a0a0a;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            header {
              background: #ffffff;
              border-bottom: 1px solid #e5e5e5;
              padding: 16px 24px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 12px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .brand-badge {
              background: #0a0a0a;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              letter-spacing: 0.1em;
              padding: 4px 10px;
              border-radius: 6px;
              text-transform: uppercase;
            }
            .brand-sub {
              font-size: 13px;
              font-weight: 700;
              color: #404040;
            }
            .actions {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              text-decoration: none;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            .btn-black {
              background: #0a0a0a;
              color: #ffffff;
              border: 1px solid #0a0a0a;
            }
            .btn-black:hover {
              background: #262626;
            }
            .btn-outline {
              background: #ffffff;
              color: #0a0a0a;
              border: 1px solid #d4d4d4;
            }
            .btn-outline:hover {
              border-color: #0a0a0a;
            }
            main {
              flex: 1;
              max-width: 1000px;
              width: 100%;
              margin: 24px auto;
              padding: 0 16px;
            }
            .viewer-card {
              background: #ffffff;
              border: 1px solid #e5e5e5;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0,0,0,0.04);
            }
            .meta-bar {
              padding: 16px 20px;
              border-bottom: 1px solid #f0f0f0;
              background: #fafafa;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 8px;
            }
            .meta-title {
              font-size: 14px;
              font-weight: 800;
              color: #0a0a0a;
              word-break: break-all;
            }
            .meta-info {
              font-size: 12px;
              color: #737373;
            }
            .preview-container {
              padding: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f5f5f4;
              min-height: 420px;
            }
            .preview-img {
              max-width: 100%;
              max-height: 70vh;
              object-fit: contain;
              border-radius: 8px;
              background: #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .pdf-frame {
              width: 100%;
              height: 75vh;
              border: none;
              border-radius: 8px;
              background: #ffffff;
            }
            .footer-note {
              padding: 14px 20px;
              background: #ffffff;
              border-top: 1px solid #e5e5e5;
              font-size: 12px;
              color: #525252;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 8px;
            }
            .status-badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #eef2ff;
              color: #3730a3;
              font-size: 11px;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 999px;
            }
            .status-dot {
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #4f46e5;
            }
          </style>
        </head>
        <body>
          <header>
            <div class="brand">
              <span class="brand-badge">SHOKH</span>
              <span class="brand-sub">Custom Order Design Review</span>
            </div>
            <div class="actions">
              <a href="${rawFileUrl}" download="${escapeHtml(item.originalName)}" class="btn btn-outline">
                Download Original File
              </a>
              <a href="https://wa.me/8801346068854" target="_blank" class="btn btn-black">
                Reply on WhatsApp
              </a>
            </div>
          </header>

          <main>
            <div class="viewer-card">
              <div class="meta-bar">
                <div class="meta-title">${escapeHtml(item.originalName)}</div>
                <div class="meta-info">${sizeMb} MB · Uploaded: ${uploadDateStr}</div>
              </div>

              <div class="preview-container">
                ${
                  isPdf
                    ? `<iframe src="${rawFileUrl}" class="pdf-frame" title="Custom Design PDF"></iframe>`
                    : `<img src="${rawFileUrl}" alt="Customer Design" class="preview-img" />`
                }
              </div>

              <div class="footer-note">
                <div class="status-badge">
                  <span class="status-dot"></span>
                  Verified High-Resolution Asset
                </div>
                <div>Printed &amp; Customized by Shokh Studio (Dhaka, Bangladesh)</div>
              </div>
            </div>
          </main>
        </body>
      </html>
    `;

    return res.send(html);
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    
    if (supabaseServer) {
      // Auto-seed Supabase database if catalog is empty or has minimal items
      (async () => {
        try {
          const { count, error } = await supabaseServer
            .from('products')
            .select('id', { count: 'exact', head: true });
          if (!error && (count === null || count < 3)) {
            console.log(`[Supabase Auto-Sync] Detected ${count} products in Supabase. Running seed...`);
            await seedSupabaseCatalog();
          } else {
            console.log(`[Supabase Auto-Sync] Supabase is online with ${count} products ready.`);
          }
        } catch (e: any) {
          console.warn('[Supabase Auto-Sync Notice]:', e.message || e);
        }
      })();
    } else {
      console.log('[Database] Running with local high-performance store database. Supabase connections removed.');
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
