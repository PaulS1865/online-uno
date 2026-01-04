const ws = new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host);
let myHand=[];

ws.onmessage = e => {
  const d = JSON.parse(e.data);
  if(d.type==="room"){
    document.getElementById("menu").hidden=true;
    document.getElementById("game").hidden=false;
    document.getElementById("room").innerText="Raum: "+d.code;
  }
  if(d.type==="start"){
    myHand = d.hands.shift();
    render();
  }
  if(d.type==="update"){
    document.getElementById("turn").innerText="Spieler am Zug: "+d.turn;
  }
};

function create(){ ws.send(JSON.stringify({type:"create"})); }
function join(){ ws.send(JSON.stringify({type:"join", code:document.getElementById("code").value})); }
function ready(){ ws.send(JSON.stringify({type:"ready"})); }

function render(){
  const hand = document.getElementById("hand");
  hand.innerHTML="";
  myHand.forEach(c=>{
    const el=document.createElement("div");
    el.className="card";
    el.innerText=c.c+" "+c.v;
    el.onclick=()=>play(c);
    hand.appendChild(el);
  });
}

function play(card){ ws.send(JSON.stringify({type:"play", card})); }
