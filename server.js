const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req,res)=>{
  res.sendFile(path.join(__dirname,'public/index.html'));
});

let orders = [];
let clients = [];

/* SSE */
app.get('/events',(req,res)=>{
  res.set({
    'Content-Type':'text/event-stream',
    'Cache-Control':'no-cache',
    'Connection':'keep-alive'
  });
  res.flushHeaders();

  clients.push(res);

  res.write(`data: ${JSON.stringify({ type:'init', orders })}\n\n`);

  req.on('close',()=>{
    clients = clients.filter(c=>c!==res);
  });
});

function sendEvent(data){
  clients.forEach(c=>{
    c.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

app.post('/ready-order',(req,res)=>{
  const order = {
    id: Date.now().toString(),
    order: req.body.order,
    note: req.body.note,
    ts: Date.now()
  };
  orders.unshift(order);
  sendEvent({ type:'add', order });
  res.sendStatus(200);
});

app.post('/remove-order',(req,res)=>{
  orders = orders.filter(o=>o.id !== req.body.id);
  sendEvent({ type:'remove', id:req.body.id });
  res.sendStatus(200);
});

app.post('/clear-orders',(req,res)=>{
  orders = [];
  sendEvent({ type:'clear' });
  res.sendStatus(200);
});

app.listen(3000,()=>console.log('Running on http://localhost:3000'));
