const http=require('http'),fs=require('fs'),path=require('path');
const {WebSocketServer,WebSocket}=require('ws');
const PORT=Number(process.env.PORT)||3000;
const server=http.createServer((req,res)=>{
 const file=req.url.split('?')[0]==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,'');
 if(!['index.html'].includes(file)){res.writeHead(404);return res.end('Not found')}
 fs.readFile(path.join(__dirname,file),(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(data)})
});
const wss=new WebSocketServer({server});let nextId=1;const clients=new Map();
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj))}
function broadcast(room,obj,except){for(let [ws,c] of clients)if(ws!==except&&c.room===room)send(ws,obj)}
wss.on('connection',ws=>{
 let joined=false;
 ws.on('message',raw=>{
  if(raw.length>2048)return;
  let m;try{m=JSON.parse(raw.toString())}catch{return}
  if(m.type==='join'&&!joined){
   let room=String(m.room||'greece').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,24)||'greece',name=String(m.name||'Παίκτης').slice(0,18).replace(/[<>]/g,'');
   if([...clients.values()].filter(c=>c.room===room).length>=24)return send(ws,{type:'error',message:'Το δωμάτιο είναι γεμάτο'});
   let id=nextId++;clients.set(ws,{id,room,name,state:null});joined=true;send(ws,{type:'welcome',id});
   for(let [other,c] of clients)if(other!==ws&&c.room===room&&c.state)send(ws,{type:'state',id:c.id,name:c.name,...c.state});
  }else if(m.type==='state'&&joined){
   let c=clients.get(ws);if(!c)return;
   let x=Number(m.x),z=Number(m.z),rot=Number(m.rot);
   if(![x,z,rot].every(Number.isFinite)||Math.abs(x)>2000||Math.abs(z)>2000)return;
   c.state={x,z,rot,inside:!!m.inside,vehicle:typeof m.vehicle==='string'?m.vehicle.slice(0,12):null};
   broadcast(c.room,{type:'state',id:c.id,name:c.name,...c.state},ws);
  }
 });
 ws.on('close',()=>{let c=clients.get(ws);if(c){clients.delete(ws);broadcast(c.room,{type:'leave',id:c.id},ws)}})
});
server.listen(PORT,'0.0.0.0',()=>console.log(`GTA 6 RP: http://localhost:${PORT}`));
