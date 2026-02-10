const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

let orders = [];
let clients = [];

/* 🔴 SSE CONNECTION */
app.get('/events', (req,res)=>{
  res.set({
    'Content-Type':'text/event-stream',
    'Cache-Control':'no-cache',
    'Connection':'keep-alive'
  });
  res.flushHeaders();

  clients.push(res);

  // send current state
  res.write(`data: ${JSON.stringify({
    type:'init',
    orders
  })}\n\n`);

  req.on('close', ()=>{
    clients = clients.filter(c=>c!==res);
  });
});

/* SEND EVENT */
function sendEvent(data){
  clients.forEach(c=>{
    c.write(`data: ${JSON.stringify(data)}\n\n`);
    c.flush && c.flush();   // ✅ force send
  });
}

/* ADD ORDER */
app.post('/ready-order',(req,res)=>{
  const order = {
    id: Date.now().toString(),
    order: req.body.order,
    note: req.body.note,
    ts: Date.now()
  };

  orders.push(order);
  sendEvent({ type:'add', order });
  res.sendStatus(200);
});

/* REMOVE ONE */
app.post('/remove-order',(req,res)=>{
  orders = orders.filter(o=>o.id !== req.body.id);
  sendEvent({ type:'remove', id: req.body.id });
  res.sendStatus(200);
});

/* 🔥 CLEAR ALL */
app.post('/clear-orders',(req,res)=>{
  orders = [];
  sendEvent({ type:'clear' });
  res.sendStatus(200);
});

app.listen(3000,()=>{
  console.log('Running → http://localhost:3000');
});
