// অ্যাডমিন UI অ্যানিমেশন/চার্ট — প্রতিবার পেজ রেন্ডারের পর window.initAdminUI() কল হয়
window.initAdminUI=function(){
var D=window.ADMIN_DATA||{},C=['#e4262c','#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#94a3b8'];
var bn=function(n){return String(n).replace(/\d/g,function(d){return '০১২৩৪৫৬৭৮৯'[d]})};
var NS='http://www.w3.org/2000/svg';
function el(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
// sidebar toggle
var bg=document.querySelector('.burger'),ov=document.querySelector('.ov');
if(bg)bg.onclick=function(){document.body.classList.toggle('menu-open')};if(ov)ov.onclick=function(){document.body.classList.remove('menu-open')};
// count-up
document.querySelectorAll('[data-count]').forEach(function(n){var to=+n.dataset.count,t0=null;function f(ts){t0=t0||ts;var p=Math.min((ts-t0)/1100,1),e=1-Math.pow(1-p,3);n.textContent=bn(Math.round(to*e));if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)});
// bar chart (last 14 days)
var bc=document.getElementById('barChart');
if(bc&&D.days){var W=640,H=240,pl=30,pb=28,pt=14,mx=Math.max.apply(null,D.days.map(function(d){return d[1]}).concat([4])),n=D.days.length,bw=(W-pl)/n,s=el('svg',{viewBox:'0 0 '+W+' '+H,preserveAspectRatio:'none'},bc);
 var df=el('defs',{},s),g=el('linearGradient',{id:'bg1',x1:0,y1:0,x2:0,y2:1},df);el('stop',{offset:'0','stop-color':'#ff6b4a'},g);el('stop',{offset:'1','stop-color':'#e4262c'},g);
 for(var i=0;i<=4;i++){var y=pt+(H-pb-pt)*i/4;el('line',{x1:pl,x2:W,y1:y,y2:y,stroke:'#e8ecf3'},s);var tx=el('text',{x:pl-6,y:y+4,'text-anchor':'end','font-size':11,fill:'#94a3b8'},s);tx.textContent=bn(Math.round(mx*(1-i/4)))}
 if(!D.days.some(function(d){return d[1]>0})){var em=el('text',{x:W/2,y:H/2,'text-anchor':'middle','font-size':14,fill:'#94a3b8'},s);em.textContent='গত ১৪ দিনে কোনো খবর প্রকাশিত হয়নি'}
 D.days.forEach(function(d,i){var h=(H-pb-pt)*d[1]/mx,x=pl+i*bw+bw*.18,w=bw*.64;
  var r=el('rect',{x:x,width:w,rx:5,fill:'url(#bg1)',y:H-pb,height:0},s);var t=el('title',{},r);t.textContent=d[0]+': '+bn(d[1])+' টি খবর';
  setTimeout(function(){r.style.transition='all .9s cubic-bezier(.2,.8,.2,1)';r.setAttribute('y',H-pb-h);r.setAttribute('height',Math.max(h,d[1]?3:0))},80+i*45);
  if(i%2==0||n<8){var l=el('text',{x:x+w/2,y:H-8,'text-anchor':'middle','font-size':10.5,fill:'#94a3b8'},s);l.textContent=d[0]}})}
// donut
var dc=document.getElementById('donut');
if(dc&&D.sections){var tot=D.sections.reduce(function(a,b){return a+b[1]},0)||1,R=64,Cc=2*Math.PI*R,off=0,s=el('svg',{viewBox:'0 0 180 180'},dc);
 el('circle',{cx:90,cy:90,r:R,fill:'none',stroke:'#eef1f7','stroke-width':26},s);
 var leg=document.getElementById('donutLeg');
 D.sections.forEach(function(d,i){var len=Cc*d[1]/tot,c=el('circle',{cx:90,cy:90,r:R,fill:'none',stroke:C[i%C.length],'stroke-width':26,'stroke-dasharray':'0 '+Cc,'stroke-dashoffset':-off,transform:'rotate(-90 90 90)'},s);
  (function(c,len){setTimeout(function(){c.style.transition='stroke-dasharray 1s ease';c.setAttribute('stroke-dasharray',Math.max(len-1.5,0)+' '+Cc)},150+i*120)})(c,len);off+=len;
  var sp=document.createElement('span');sp.innerHTML='<i style="background:'+C[i%C.length]+'"></i>'+d[0]+'<em>'+bn(d[1])+'</em>';leg.appendChild(sp)});
 var t=el('text',{x:90,y:88,'text-anchor':'middle','font-size':26,'font-weight':700,fill:'#1e293b'},s);t.textContent=bn(tot);var t2=el('text',{x:90,y:108,'text-anchor':'middle','font-size':11,fill:'#94a3b8'},s);t2.textContent='মোট খবর'}
// horizontal bars
document.querySelectorAll('.hb .tr i').forEach(function(i,k){setTimeout(function(){i.style.width=i.dataset.w+'%'},200+k*100)});
// image live preview + char counters
var fi=document.querySelector('input[name=file]'),pv=document.getElementById('imgPrev');
if(fi&&pv)fi.onchange=function(){if(fi.files[0]){pv.src=URL.createObjectURL(fi.files[0]);pv.style.display='block'}};
var im=document.querySelector('input[name=image]');if(im&&pv)im.onchange=function(){if(im.value){pv.src=im.value;pv.style.display='block'}};
document.querySelectorAll('[data-max]').forEach(function(i){var s=document.createElement('span');s.className='cnt';i.previousElementSibling.appendChild(s);function u(){s.textContent=bn(i.value.length)+'/'+bn(i.dataset.max)}i.oninput=u;u()});
};
