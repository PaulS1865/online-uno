const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = {};

function createDeck() {
  const colors = ["R","G","B","Y"];
  const deck = [];
  colors.forEach(c => {
    for(let i=0;i<=9;i++) deck.push({id: `${c}${i}`, c, v:i});
    ["skip","reverse","draw2"].forEach(v=>{
      deck.push({id:`${c}${v}1`, c, v});
      deck.push({id:`${c}${v}2`, c, v});
    });
  });
  for(let i=0;i<4;i++){
    deck.push({id:`W${i}wild`,c:"W",v:"wild"});
    deck.push({id:`W${i}draw4`,c:"W",v:"draw4"});
  }
  return deck.sort(()=>Math.random()-0.5);
}

function broadcast(room, data){
  room.players.forEach(p=>{
    if(p.ws.readyState===1) p.ws.send(JSON.stringify(data));
  });
}

wss.on("connection", ws=>{
  ws.on("message", msg=>{
    const data = JSON.parse(msg);

    // Raum erstellen
    if(data.type==="create"){
      const code = Math.random().toString(36).substring(2,6).toUpperCase();
      rooms[code] = {players:[], deck:[], discard:[], turn:0, direction:1, started:false};
      ws.send(JSON.stringify({type:"room", code}));
    }

    // Raum beitreten
    if(data.type==="join"){
      const room = rooms[data.code];
      if(!room || room.players.length>=4) return;
      const player = {ws, hand:[], ready:false};
      room.players.push(player);
      ws.room = data.code;
      ws.playerIndex = room.players.length-1;
      broadcast(room, {type:"players", count: room.players.length});
    }

    // Ready-Status
    if(data.type==="ready"){
      const room = rooms[ws.room];
      room.players[ws.playerIndex].ready=true;
      if(room.players.every(p=>p.ready)&&room.players.length>=2){
        room.started=true;
        room.deck=createDeck();
        room.players.forEach(p=>{
          p.hand=room.deck.splice(0,7);
        });
        room.discard.push(room.deck.pop());
        broadcast(room,{
          type:"start",
          hands: room.players.map(p=>p.hand),
          top: room.discard.at(-1),
          turn: room.turn
        });
      }
    }

    // Karte spielen
    if(data.type==="play"){
      const room = rooms[ws.room];
      const player = room.players[ws.playerIndex];
      const card = data.card;
      const top = room.discard.at(-1);

      if(card.c!==top.c && card.v!==top.v && card.c!=="W") return;
      player.hand = player.hand.filter(c=>c.id!==card.id);
      room.discard.push(card);

      if(card.v==="reverse") room.direction*=-1;
      if(card.v==="skip") room.turn+=room.direction;
      if(card.v==="draw2") room.players[(room.turn+room.direction+4)%4].hand.push(...room.deck.splice(0,2));

      room.turn=(room.turn+room.direction+4)%room.players.length;

      broadcast(room,{
        type:"update",
        hands: room.players.map(p=>p.hand.length),
        top: card,
        turn: room.turn
      });
    }
  });
});

server.listen(process.env.PORT || 3000, ()=>{
  console.log("UNO Server läuft!");
});
