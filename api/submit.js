export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const data = await parseForm(req);
  const { site_secret, name, contact, link, message } = data;

  if (!process.env.SITE_SECRET || site_secret !== process.env.SITE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!name || !message) return res.status(400).json({ error: 'Missing required fields' });

  const text = `🟢 New Appeal Submission\n\nName: ${escapeText(name)}\nContact: ${escapeText(contact || '-')}\nLink: ${escapeText(link || '-')}\n\nMessage:\n${escapeText(message)}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.NOTIFY_CHAT_ID, text })
    });
    const tgJson = await tgRes.json();
    if (!tgJson.ok) throw new Error('Telegram API error');

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Send failed', err);
    return res.status(500).json({ error: 'Send failed' });
  }
}

function escapeText(s) {
  return String(s).replace(/[<&>]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
}

async function parseForm(req) {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) return req.body || {};
  if (contentType.includes('application/x-www-form-urlencoded')) return req.body || {};
  try {
    const text = await getRawBody(req);
    const params = new URLSearchParams(text);
    const obj = {};
    for (const [k,v] of params) obj[k]=v;
    return obj;
  } catch(e){
    return req.body || {};
  }
}

function getRawBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', err => reject(err));
  });
}
