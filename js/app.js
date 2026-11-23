/* Maxi3D Studio · lógica de la tienda (usa las variables de config.js) */
const ls={g:k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}},s:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},d:k=>{try{localStorage.removeItem(k)}catch(e){}}};
const U=SUPABASE_URL,K=SUPABASE_KEY;
let sb=null;try{if(U&&K)sb=supabase.createClient(U,K)}catch(e){console.error(e)}
const WA=/^\d{8,15}$/.test(WHATSAPP);
const waUrl=t=>`https://wa.me/${WHATSAPP}${t?"?text="+encodeURIComponent(t):""}`;

/* ===== Utilidades ===== */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n||0);
let tt;const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),3200)};
const byId=id=>prods.find(p=>String(p.id)===String(id));

/* ===== Datos ===== */
let mqKey="",cats=[],prods=[],cat="all",q="",sort="new",cart={};const lights={};
try{cart=JSON.parse(ls.g("lf_cart")||"{}")}catch(e){}
const DC=[["lamparas","Lámparas 3D",38],["decoracion","Decoración de Interior",190],["juguetes","Juguetes & Gadgets",150],["otros","Otros Modelos (STL / .3MF)",270]].map(c=>({id:c[0],nombre:c[1],hue:c[2]}));
const DP=[["Lámpara de espiral E27","lamparas",24990,2800,1,"Pantalla de líneas en espiral que difunde una luz cálida."],["Luz nocturna de hadas","lamparas",14990,3700,1,"Figura calada que proyecta puntos de luz en la pared."],["Lámpara Luna 3D","lamparas",19990,2600,1,"Esfera con relieve de cráteres que se ilumina desde dentro."],["Luna doble","lamparas",29990,2500,1,"Dos lunas de distinto tamaño para escritorio o repisa."],["Lámpara de suspensión","lamparas",27990,4900,1,"Pantalla colgante de textura tejida para sobre mesa."],["Sujetalibros geométrico","decoracion",12990,9700,0,"Par de sujetalibros de líneas geométricas, livianos y firmes."],["Dragón articulado flexi","juguetes",8990,2800,0,"Dragón que se imprime ya articulado, listo para jugar."],["Soporte de auriculares","otros",9990,640,0,"Soporte simple para dejar tus auriculares a mano."]].map((p,i)=>({id:"d"+i,nombre:p[0],categoria_id:p[1],precio:p[2],likes:p[3],con_luz:!!p[4],descripcion:p[5],luz_on:true,imagen_url:null,created_at:new Date(2026,0,i+1).toISOString()}));

function status(k,t){const s=$("#status");s.className="top "+k;$("#stTxt").textContent=t;if(k!=="live")console.warn("Maxi3D Studio:",t)}
async function load(anim){
  if(!sb){cats=DC;prods=DP;status("demo","Catálogo en modo demo");return draw(anim)}
  const [c,p]=await Promise.all([sb.from("categorias").select("*").order("orden"),sb.from("productos").select("*").eq("activo",true).order("created_at",{ascending:false})]);
  if(c.error||p.error){console.error(c.error||p.error);cats=DC;prods=DP;status("err","No se pudo leer Supabase. Revisa URL, clave y SQL");return draw(anim)}
  cats=c.data;prods=p.data;status("live","Catálogo en vivo desde Supabase");draw(anim);
}

/* ===== Render ===== */
function art(p,c,on){return `<div class="art ${on?"on":""}" style="--h:${c.hue??150}">${p.imagen_url?`<img src="${esc(p.imagen_url)}" alt="${esc(p.nombre)}" loading="lazy">`:'<div class="orb"></div>'}`}
function card(p,i,anim){
  const c=cats.find(x=>x.id===p.categoria_id)||{},on=p.con_luz?(lights[p.id]??p.luz_on??true):true;
  return `<article class="card ${anim?"":"still"}" style="--i:${Math.min(i,12)}" data-id="${esc(p.id)}">
  ${art(p,c,on)}<span class="ctag">${esc((c.nombre||"").split(" ")[0])}</span>
  ${p.con_luz?`<button class="tg" data-t aria-pressed="${on}" aria-label="Luz de vista previa"><b></b><span>${on?"ON":"OFF"}</span></button>`:""}</div>
  <div class="cb"><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion||"")}</p>
  <div class="foot"><span class="price">${money(p.precio)}</span><button class="add" data-add>+ Agregar</button></div></div></article>`;
}
function draw(anim=true){
  $("#pills").innerHTML=[{id:"all",nombre:"Todos"},...cats].map(c=>`<button class="pill ${cat===c.id?"on":""}" data-c="${esc(c.id)}">${esc(c.nombre)}</button>`).join("");
  const f={new:(a,b)=>new Date(b.created_at)-new Date(a.created_at),pop:(a,b)=>b.likes-a.likes,pa:(a,b)=>a.precio-b.precio,pd:(a,b)=>b.precio-a.precio}[sort];
  const l=prods.filter(p=>(cat==="all"||p.categoria_id===cat)&&p.nombre.toLowerCase().includes(q.toLowerCase())).sort(f);
  $("#grid").innerHTML=l.map((p,i)=>card(p,i,anim)).join("");$("#empty").hidden=l.length>0;
  const m=[...prods,...prods,...prods,...prods].slice(0,Math.max(prods.length*2,10)),pol=m.map(p=>{const c=cats.find(x=>x.id===p.categoria_id)||{};return `<figure class="pol">${art(p,c,true)}</div><figcaption>${esc(p.nombre)}</figcaption></figure>`}).join("");
  const key=prods.map(p=>p.id+p.imagen_url).join();if(key!==mqKey){mqKey=key;$("#mt").innerHTML=pol+pol}drawCart();
}

/* ===== Carrito ===== */
function drawCart(){
  const ids=Object.keys(cart).filter(id=>byId(id));let n=0,t=0;
  ids.forEach(id=>{n+=cart[id];t+=cart[id]*byId(id).precio});
  $("#cnt").textContent=n;$("#ct").textContent=money(t);$("#send").disabled=!n;
  $("#cl").innerHTML=n?ids.map(id=>{const p=byId(id);return `<div class="ci"><div><b>${esc(p.nombre)}</b><br><span class="mute">${money(p.precio)}</span></div><div class="qty"><button data-q="-1" data-id="${esc(id)}" aria-label="Quitar uno">−</button><span>${cart[id]}</span><button data-q="1" data-id="${esc(id)}" aria-label="Agregar uno">+</button></div></div>`}).join(""):'<p class="mute" style="padding:32px 0">Tu carrito está vacío. Agrega un modelo para empezar.</p>';
}
const saveCart=()=>ls.s("lf_cart",JSON.stringify(cart));
function openCart(o){$("#cart").classList.toggle("show",o);$("#ov").classList.toggle("show",o);$("#cart").inert=!o}
$("#openCart").onclick=()=>openCart(true);$("#closeCart").onclick=$("#ov").onclick=()=>openCart(false);
document.addEventListener("keydown",e=>{if(e.key==="Escape")openCart(false)});
$("#cl").onclick=e=>{const b=e.target.closest("[data-q]");if(!b)return;const id=b.dataset.id;cart[id]=(cart[id]||0)+ +b.dataset.q;if(cart[id]<=0)delete cart[id];saveCart();drawCart()};
$("#send").onclick=async()=>{
  const nombre=$("#cn").value.trim(),contacto=$("#cc").value.trim();
  if(!nombre||contacto.length<3){toast("Escribe tu nombre y un contacto");return}
  const ids=Object.keys(cart).filter(byId),items=ids.map(id=>({id,nombre:byId(id).nombre,precio:byId(id).precio,cantidad:cart[id]})),total=items.reduce((s,i)=>s+i.precio*i.cantidad,0),nota=$("#cx").value.trim();
  let done=false;
  if(sb){const {error}=await sb.from("ordenes").insert({nombre,contacto,nota:nota||null,items,total});if(error)console.error(error);else done=true}
  const msg=`Hola, quiero hacer un pedido en Maxi3D Studio:\n${items.map(i=>`- ${i.cantidad} x ${i.nombre} (${money(i.precio*i.cantidad)})`).join("\n")}\nTotal estimado: ${money(total)}\nNombre: ${nombre}\nContacto: ${contacto}${nota?"\nDetalles: "+nota:""}`;
  if(WA){window.open(waUrl(msg),"_blank","noopener");done=true}else toast("Falta tu número: edita WHATSAPP en js/config.js");
  if(done){cart={};saveCart();drawCart();openCart(false);if(!WA)toast("Pedido guardado en Supabase")}
};

/* ===== Eventos del catálogo ===== */
$("#pills").onclick=e=>{const b=e.target.closest(".pill");if(b){cat=b.dataset.c;draw()}};
$("#q").oninput=e=>{q=e.target.value;draw()};$("#sort").onchange=e=>{sort=e.target.value;draw()};
$("#grid").onclick=e=>{
  const c=e.target.closest("[data-id]");if(!c)return;const id=c.dataset.id;
  const t=e.target.closest("[data-t]");
  if(t){const on=t.getAttribute("aria-pressed")!=="true";lights[id]=on;t.setAttribute("aria-pressed",on);t.lastChild.textContent=on?"ON":"OFF";c.querySelector(".art").classList.toggle("on",on);return}
  const a=e.target.closest("[data-add]");
  if(a){cart[id]=(cart[id]||0)+1;saveCart();drawCart();const n=$("#cnt");n.classList.remove("bump");void n.offsetWidth;n.classList.add("bump");a.classList.add("ok");a.textContent="Agregado";setTimeout(()=>{a.classList.remove("ok");a.textContent="+ Agregar"},1200)}
};

/* ===== Hero: lámpara que se enciende ===== */
const room=$("#room"),ht=$("#heroT");
function lamp(on){room.classList.toggle("on",on);ht.setAttribute("aria-pressed",on);ht.lastChild.textContent=on?"Apagar":"Encender"}
ht.onclick=()=>lamp(!room.classList.contains("on"));
setTimeout(()=>lamp(true),900);

/* ===== WhatsApp ===== */
const wq=$("#waQuote"),wf=$("#waFloat");
if(WA){wq.href=waUrl("Hola, quiero cotizar un diseño personalizado en Maxi3D Studio.");wq.target=wf.target="_blank";wq.rel=wf.rel="noopener";wf.href=waUrl()}
else[wq,wf].forEach(a=>a.onclick=e=>{e.preventDefault();toast("Falta tu número: edita WHATSAPP en js/config.js")});

/* ===== Logo de la empresa (LOGO_URL en config.js) ===== */
if(typeof LOGO_URL!=="undefined"&&LOGO_URL){
  document.querySelectorAll(".logo-img").forEach(i=>{i.src=LOGO_URL;i.hidden=false});
  const ic=document.createElement("link");ic.rel="icon";ic.href=LOGO_URL;document.head.appendChild(ic);
}

/* ===== Inicio ===== */
// Carrito: se mantiene entre pestañas abiertas del mismo navegador
window.addEventListener("storage",e=>{if(e.key==="lf_cart"){try{cart=JSON.parse(e.newValue||"{}")}catch(x){cart={}}drawCart()}});
// Barra de estado solo para ti: abre el sitio con ?debug al final de la dirección
if(/[?&]debug\b/.test(location.search))$("#status").hidden=false;
load(true).then(()=>{if(sb)sb.channel("productos-live").on("postgres_changes",{event:"*",schema:"public",table:"productos"},()=>load(false)).subscribe()});
const LOGO_URL = "https://agqzeweerovhtciyxghu.supabase.co/storage/v1/object/public/Marca/logo.jpg";