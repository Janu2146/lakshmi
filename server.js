const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store
const RECENT_MAX = 60;
let orders = [];
let clients = [];

/* ===== SSE ===== */
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'init', orders })}\n\n`);
  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcast(data) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

/* ===== APIs ===== */
app.post('/ready-order', (req, res) => {
  const now = Date.now();
  const entry = {
    id: 'o' + now,
    order: String(req.body.order || '').trim(),
    note: req.body.note || '',
    ts: now
  };

  orders.unshift(entry);
  if (orders.length > RECENT_MAX) orders.pop();

  broadcast({ type: 'add', order: entry });
  res.json({ success: true });
});

app.post('/remove-order', (req, res) => {
  const { id, order } = req.body;
  orders = orders.filter(o => (id ? o.id !== id : o.order !== order));

  broadcast({ type: 'remove', id, order });
  res.json({ success: true });
});

app.post('/clear-orders',(req,res)=>{
  orders = [];
  sendEvent({ type:'clear' });
  res.sendStatus(200);
});


app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
});
