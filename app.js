var CV_DESC = {};
(RAW_CATS || []).forEach(function(c){ if(c.cv && c.cd) CV_DESC[c.cv]=c.cd; });
(RAW_MAT || []).forEach(function(m){ if(m.cv && m.cd) CV_DESC[m.cv]=m.cd; });

var MAT = RAW_MAT.map(function(r){
  return {
    mc:r.mc, md:r.md, tc:r.tc, td:r.td, gc:r.gc, gd:r.gd, cv:r.cv,
    cd:r.cd||CV_DESC[r.cv]||'',
    gcc_raw:r.gcc,
    gcc:(r.gcc&&r.resp)?r.gcc+' \u2013 '+r.resp:(r.gcc||r.resp||''),
    txc:r.txc||''
  };
});
var TIPOS  = RAW_TIPOS;
var CATS   = RAW_CATS;
var TB     = RAW_TB;
var GRUPOS = RAW_GRUPOS.map(function(g){
  return {tc:g.tc,td:g.td,gc:g.gc,gd:g.gd,
    gcc:(g.gcc&&g.resp)?g.gcc+' \u2013 '+g.resp:(g.gcc||g.resp||'')};
});

document.getElementById('home-cnt').textContent=MAT.length.toLocaleString()+' materiales · '+TIPOS.length+' tipos';
(function fillDataAsOf(){
  var txt='';
  if(typeof DATA_AS_OF==='string'&&DATA_AS_OF){
    var p=DATA_AS_OF.split('-');
    var nice=p.length===3?(p[2]+'/'+p[1]+'/'+p[0]):DATA_AS_OF;
    txt='Datos a '+nice;
  }
  var home=document.getElementById('home-data-as-of');
  var app=document.getElementById('app-data-as-of');
  if(home) home.textContent=txt;
  if(app) app.textContent=txt;
})();

var matByTipo={}, matByCat={};
MAT.forEach(function(m){
  matByTipo[m.tc]=(matByTipo[m.tc]||0)+1;
  matByCat[m.cv]=(matByCat[m.cv]||0)+1;
});

var filtered=MAT.slice(), sortCol=-1, sortDir=1, page=0, selMc=null, selGcc=null, selTipo=null;
var gccOpenTipos={};
var activeTab='mat', PAGE=50;
var SD={tipo:'',grupo:'',gcc:'',cv:'',txc:''};

function openModule(){
  document.getElementById('home').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('hdr-stats').textContent=MAT.length.toLocaleString()+' materiales';
  filtered=MAT.slice(); sortCol=-1; sortDir=1; page=0; selMc=null;
  buildMainDropdowns(); buildCatDropdowns(); applyFilters(); switchTab('mat');
}
function goHome(){
  document.getElementById('app').style.display='none';
  document.getElementById('home').style.display='flex';
}
function switchTab(name){
  activeTab=name;
  var names=['mat','gcc','tipos','grupos','cats','tb'];
  document.querySelectorAll('.tab').forEach(function(t,i){t.classList.toggle('active',names[i]===name);});
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.getElementById('view-'+name).classList.add('active');
  if(name==='gcc') renderCompradores();
  else if(name==='tipos') renderTipos();
  else if(name==='grupos') renderGrupos();
  else if(name==='cats') renderCats();
  else if(name==='tb') renderTb();
}
function goToMateriales(opts){
  opts=opts||{};
  document.getElementById('s-desc').value='';
  SD.tipo=opts.tipo||'';
  SD.grupo=opts.grupo||'';
  SD.gcc=opts.gcc||'';
  SD.cv=opts.cv||'';
  SD.txc='';
  document.querySelectorAll('#txc-filter .chip').forEach(function(c){
    c.classList.toggle('active',(c.getAttribute('data-txc')||'')==='');
  });
  ['tipo','grupo','gcc','cv'].forEach(function(n){
    var el=document.getElementById('sd-'+n+'-search');
    if(el) el.value='';
    filterSD(n);
  });
  function tipoLabel(code){
    var t=TIPOS.filter(function(x){return x.code===code;})[0];
    return t?t.code+' \u2013 '+t.desc:code;
  }
  function grupoLabel(code){
    var m=MAT.filter(function(x){return x.gc===code;})[0];
    return m?m.gc+' \u2013 '+m.gd:code;
  }
  function gccLabel(code){
    var m=MAT.filter(function(x){return x.gcc_raw===code;})[0];
    return m?m.gcc:code;
  }
  function cvLabel(code){
    return code+(CV_DESC[code]?' \u2013 '+CV_DESC[code]:'');
  }
  document.getElementById('sd-tipo-input').value=SD.tipo?tipoLabel(SD.tipo):'';
  document.getElementById('sd-gcc-input').value=SD.gcc?gccLabel(SD.gcc):'';
  document.getElementById('sd-cv-input').value=SD.cv?cvLabel(SD.cv):'';
  updateGrupoDD();
  document.getElementById('sd-grupo-input').value=SD.grupo?grupoLabel(SD.grupo):'';
  selMc=null;
  document.getElementById('detail-panel').innerHTML='<div class="detail-ph">\u2190 Selecciona un material para ver el detalle</div>';
  switchTab('mat');
  applyFilters();
}
function buildMainDropdowns(){
  var tl=document.getElementById('sd-tipo-list');
  tl.innerHTML='<div class="sd-item none-opt" onclick="selectSD(\'tipo\',\'\',\'\')">Todos los tipos</div>';
  TIPOS.forEach(function(t){
    var d=document.createElement('div'); d.className='sd-item';
    d.textContent=t.code+' \u2013 '+t.desc;
    d.onclick=(function(c,l){return function(){selectSD('tipo',c,l);};})(t.code,t.code+' \u2013 '+t.desc);
    tl.appendChild(d);
  });
  var seen={},ga=[];
  MAT.forEach(function(m){if(m.gcc_raw&&!seen[m.gcc_raw]){seen[m.gcc_raw]=true;ga.push({raw:m.gcc_raw,label:m.gcc});}});
  ga.sort(function(a,b){return a.raw.localeCompare(b.raw);});
  var gl=document.getElementById('sd-gcc-list');
  gl.innerHTML='<div class="sd-item none-opt" onclick="selectSD(\'gcc\',\'\',\'\')">Todos</div>';
  ga.forEach(function(g){
    var d=document.createElement('div'); d.className='sd-item'; d.textContent=g.label;
    d.onclick=(function(r,l){return function(){selectSD('gcc',r,l);};})(g.raw,g.label);
    gl.appendChild(d);
  });
  var cvSeen={},cvArr=[];
  MAT.forEach(function(m){if(m.cv&&!cvSeen[m.cv]){cvSeen[m.cv]=true;cvArr.push(m.cv);}});
  cvArr.sort();
  var cvl=document.getElementById('sd-cv-list');
  cvl.innerHTML='<div class="sd-item none-opt" onclick="selectSD(\'cv\',\'\',\'\')">Todas las cat.</div>';
  cvArr.forEach(function(c){
    var label=c+' – '+(CV_DESC[c]||'');
    var d=document.createElement('div'); d.className='sd-item'; d.textContent=label;
    d.onclick=(function(cc,l){return function(){selectSD('cv',cc,l);};})(c,label);
    cvl.appendChild(d);
  });
  updateGrupoDD();
}
function updateGrupoDD(){
  var tc=SD.tipo, rel={};
  MAT.forEach(function(m){if(!tc||m.tc===tc) rel[m.gc]=m.gc+' \u2013 '+m.gd;});
  var arr=Object.keys(rel).sort().map(function(k){return {code:k,label:rel[k]};});
  var gl=document.getElementById('sd-grupo-list');
  gl.innerHTML='<div class="sd-item none-opt" onclick="selectSD(\'grupo\',\'\',\'\')">Todos los grupos</div>';
  arr.forEach(function(g){
    var d=document.createElement('div'); d.className='sd-item'; d.textContent=g.label;
    d.onclick=(function(c,l){return function(){selectSD('grupo',c,l);};})(g.code,g.label);
    gl.appendChild(d);
  });
}
function toggleSD(name){
  var dr=document.getElementById('sd-'+name+'-drop'), open=dr.classList.contains('open');
  document.querySelectorAll('.sd-dropdown').forEach(function(d){d.classList.remove('open');});
  if(!open) dr.classList.add('open');
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.sd-wrap')) document.querySelectorAll('.sd-dropdown').forEach(function(d){d.classList.remove('open');});
});
function filterSD(name){
  var q=document.getElementById('sd-'+name+'-search').value.toLowerCase();
  document.querySelectorAll('#sd-'+name+'-list .sd-item').forEach(function(el){
    el.style.display=el.textContent.toLowerCase().includes(q)?'':'none';
  });
}
function selectSD(name,val,label){
  SD[name]=val;
  document.getElementById('sd-'+name+'-input').value=val?label:'';
  document.getElementById('sd-'+name+'-drop').classList.remove('open');
  if(name==='tipo'){SD.grupo='';document.getElementById('sd-grupo-input').value='';updateGrupoDD();}
  page=0; applyFilters();
}
function setTxcFilter(btn){
  SD.txc=btn.getAttribute('data-txc')||'';
  document.querySelectorAll('#txc-filter .chip').forEach(function(c){c.classList.toggle('active',c===btn);});
  page=0; applyFilters();
}
function applyFilters(){
  var q=document.getElementById('s-desc').value.toLowerCase();
  var tc=SD.tipo, gc=SD.grupo, gcc=SD.gcc, cv=SD.cv, txc=SD.txc;
  filtered=MAT.filter(function(m){
    if(tc&&m.tc!==tc) return false;
    if(gc&&m.gc!==gc) return false;
    if(gcc&&m.gcc_raw!==gcc) return false;
    if(cv&&m.cv!==cv) return false;
    if(txc==='con'&&!m.txc) return false;
    if(txc==='sin'&&m.txc) return false;
    if(q&&!m.mc.toLowerCase().includes(q)&&!m.md.toLowerCase().includes(q)) return false;
    return true;
  });
  if(sortCol>=0) sortFiltered();
  page=0; renderTable();
}
function clearFilters(){
  document.getElementById('s-desc').value='';
  SD.tipo=''; SD.grupo=''; SD.gcc=''; SD.cv=''; SD.txc='';
  ['tipo','grupo','gcc','cv'].forEach(function(n){
    document.getElementById('sd-'+n+'-input').value='';
    document.getElementById('sd-'+n+'-search').value='';
    filterSD(n);
  });
  document.querySelectorAll('#txc-filter .chip').forEach(function(c){
    c.classList.toggle('active',(c.getAttribute('data-txc')||'')==='');
  });
  updateGrupoDD(); page=0; applyFilters();
}
function copyCode(code){
  var btn=document.getElementById('btn-copy-code');
  function done(){
    if(!btn) return;
    var prev=btn.textContent;
    btn.textContent='Copiado';
    btn.classList.add('ok');
    setTimeout(function(){btn.textContent=prev;btn.classList.remove('ok');},1500);
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(done).catch(function(){fallbackCopy(code);done();});
  } else {
    fallbackCopy(code); done();
  }
}
function fallbackCopy(code){
  var ta=document.createElement('textarea');
  ta.value=code; ta.style.position='fixed'; ta.style.left='-9999px';
  document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy');}catch(e){}
  document.body.removeChild(ta);
}
function sortBy(col){
  if(sortCol===col) sortDir*=-1; else{sortCol=col;sortDir=1;}
  sortFiltered(); renderTable();
}
function sortFiltered(){
  var keys=['mc','md','tc','td','gc','gd','gcc','cv'];
  var k=keys[sortCol];
  filtered.sort(function(a,b){return String(a[k]).localeCompare(String(b[k]),undefined,{numeric:true})*sortDir;});
}
function renderTable(){
  var total=filtered.length, pages=Math.max(1,Math.ceil(total/PAGE));
  if(page>=pages) page=pages-1;
  var sl=filtered.slice(page*PAGE,(page+1)*PAGE);
  var from=total?page*PAGE+1:0, to=Math.min((page+1)*PAGE,total);
  document.getElementById('stat-range').textContent=from+'\u2013'+to;
  document.getElementById('stat-total').textContent=total;
  document.getElementById('stat-page').textContent=page+1;
  document.getElementById('stat-pages').textContent=pages;
  document.getElementById('btn-prev').disabled=(page===0);
  document.getElementById('btn-next').disabled=(page>=pages-1);
  document.getElementById('mat-body').innerHTML=sl.map(function(m){
    return '<tr onclick="selectMat(\''+m.mc.replace(/'/g,"\\'")+'\')" class="'+(selMc===m.mc?'sel':'')+'">'
      +'<td><span class="tag t-code">'+m.mc+'</span></td>'
      +'<td>'+m.md+'</td>'
      +'<td><span class="tag t-tipo">'+m.tc+'</span></td>'
      +'<td style="color:#555">'+m.td+'</td>'
      +'<td><span class="tag t-grp">'+m.gc+'</span></td>'
      +'<td>'+m.gd+'</td>'
      +'<td><span class="tag t-gcc">'+m.gcc+'</span></td>'
      +'<td><span class="tag t-cat">'+m.cv+'</span></td>'
      +'<td style="color:#555;font-size:12px">'+(m.cd||'')+'</td>'
      +'</tr>';
  }).join('');
}
function prevPage(){page--;renderTable();}
function nextPage(){page++;renderTable();}
function selectMat(mc){
  selMc=mc;
  var m=MAT.find(function(x){return x.mc===mc;});
  if(!m) return;
  var cvDesc=m.cd||'';
  document.getElementById('detail-panel').innerHTML=
    '<div class="mat-code-row">'
    +'<div class="mat-code">'+m.mc+'</div>'
    +'<button type="button" class="btn-copy" id="btn-copy-code" onclick="event.stopPropagation();copyCode(\''+m.mc.replace(/'/g,"\\'")+'\')">Copiar c\u00f3digo</button>'
    +'</div>'
    +'<div class="mat-desc">'+m.md+'</div>'
    +'<div class="sec"><div class="sec-title">Tipo</div>'
    +'<div class="fr"><div class="fl">C\u00f3digo</div><div class="fv"><span class="tag t-tipo">'+m.tc+'</span></div></div>'
    +'<div class="fr"><div class="fl">Descripci\u00f3n</div><div class="fv">'+m.td+'</div></div></div>'
    +'<div class="sec"><div class="sec-title">Grupo art\u00edculos</div>'
    +'<div class="fr"><div class="fl">C\u00f3digo</div><div class="fv"><span class="tag t-grp">'+m.gc+'</span></div></div>'
    +'<div class="fr"><div class="fl">Descripci\u00f3n</div><div class="fv">'+m.gd+'</div></div></div>'
    +'<div class="sec"><div class="sec-title">Comprador</div>'
    +'<div class="fr"><div class="fl">Grupo Compras</div><div class="fv"><span class="tag t-gcc">'+m.gcc+'</span></div></div></div>'
    +'<div class="sec"><div class="sec-title">Cat. Valoraci\u00f3n</div>'
    +'<div class="fr"><div class="fl">C\u00f3digo</div><div class="fv"><span class="tag t-cat">'+m.cv+'</span></div></div>'
    +(cvDesc?'<div class="fr"><div class="fl">Descripci\u00f3n</div><div class="fv">'+cvDesc+'</div></div>':'')
    +'</div>'
    +(m.txc?'<div class="sec"><div class="sec-title">Texto compra</div>'
    +'<div class="fr"><div class="fv" style="min-width:0">'+m.txc+'</div></div></div>':'');
  renderTable();
}
function buildCatDropdowns(){
  var tipoOpts=['f-grp-tipo','f-cat-tipo','f-tb-tipo','f-gcc-tipo'];
  tipoOpts.forEach(function(id){
    document.getElementById(id).innerHTML='<option value="">Todos los tipos</option>';
  });
  TIPOS.forEach(function(t){
    var o=new Option(t.code+' \u2013 '+t.desc,t.code);
    tipoOpts.forEach(function(id){document.getElementById(id).add(o.cloneNode(true));});
  });
  var gccSel=document.getElementById('f-grp-gcc');
  gccSel.innerHTML='<option value="">Todos los compradores</option>';
  var seen2={};
  GRUPOS.forEach(function(g){if(g.gcc&&!seen2[g.gcc]){seen2[g.gcc]=true;gccSel.add(new Option(g.gcc,g.gcc));}});
  var catSel=document.getElementById('f-tb-cat');
  catSel.innerHTML='<option value="">Todas las cat.</option>';
  var cs=[];
  TB.forEach(function(r){if(r.cv&&!cs.includes(r.cv)) cs.push(r.cv);});
  cs.sort().forEach(function(c){catSel.add(new Option(c,c));});
}
function listTipos(){
  var q=document.getElementById('f-tipos-q').value.toLowerCase();
  return TIPOS.filter(function(t){
    return !q||t.code.toLowerCase().includes(q)||t.desc.toLowerCase().includes(q);
  }).map(function(t){
    var fam={}, buyers={};
    MAT.forEach(function(m){
      if(m.tc!==t.code) return;
      if(m.gc) fam[m.gc]=1;
      if(m.gcc_raw) buyers[m.gcc_raw]=1;
    });
    return {code:t.code, desc:t.desc, n:matByTipo[t.code]||0, nFam:Object.keys(fam).length, nBuyers:Object.keys(buyers).length};
  });
}
function tipoTree(tc){
  var map={};
  MAT.forEach(function(m){
    if(m.tc!==tc) return;
    var k=(m.gc||'')+'|'+(m.gcc_raw||'');
    if(!map[k]) map[k]={gc:m.gc||'', gd:m.gd||'', gcc:m.gcc_raw||'', buyer:buyerName(m.gcc, m.gcc_raw), n:0};
    map[k].n++;
  });
  return Object.keys(map).sort().map(function(k){return map[k];});
}
function selectTipo(code){
  selTipo=code;
  renderTipos();
}
function renderTipoDetail(){
  var box=document.getElementById('tipo-detail');
  if(!selTipo){
    box.innerHTML='<div class="gcc-detail-ph">\u2190 Selecciona un tipo para ver sus familias</div>';
    return;
  }
  var t=TIPOS.filter(function(x){return x.code===selTipo;})[0];
  var rows=tipoTree(selTipo);
  var fams={}, buyers={};
  rows.forEach(function(r){ if(r.gc) fams[r.gc]=1; if(r.gcc) buyers[r.gcc]=1; });
  var n=matByTipo[selTipo]||0;
  var html='<div class="gcc-hd">'
    +'<span class="badge" style="background:#dbeafe;color:#1e40af">'+selTipo+'</span>'
    +'<div><div class="gcc-hd-name">'+(t?t.desc:selTipo)+'</div>'
    +'<div class="gcc-hd-stats"><b>'+n.toLocaleString()+'</b> c\u00f3digos \u00b7 <b>'+Object.keys(fams).length+'</b> familias \u00b7 <b>'+Object.keys(buyers).length+'</b> compradores</div></div>'
    +'<button type="button" class="btn-export" style="margin-left:auto" onclick="goToMateriales({tipo:\''+selTipo+'\'})">Ver c\u00f3digos</button>'
    +'</div>';
  if(!rows.length){
    html+='<div class="gcc-detail-ph">Sin materiales en este tipo</div>';
    box.innerHTML=html;
    return;
  }
  html+='<div class="tipo-cols"><span>Familia</span><span class="gcc-fam-buyer">Comprador</span><span>C\u00f3digos</span></div>';
  rows.forEach(function(r){
    var click=r.gc
      ?'goToMateriales({tipo:\''+selTipo+'\',grupo:\''+r.gc+'\'})'
      :'goToMateriales({tipo:\''+selTipo+'\'})';
    html+='<div class="gcc-fam" onclick="'+click+'" style="background:#fff;margin:0 12px;border:1px solid #eaedf3;border-top:none;padding-left:12px">'
      +'<span class="badge" style="background:#fef3c7;color:#92400e">'+(r.gc||'\u2014')+'</span>'
      +'<span class="gcc-fam-desc">'+(r.gd||'Sin familia')+'</span>'
      +'<span class="gcc-fam-buyer"><span class="badge" style="background:#f3e8ff;color:#6b21a8">'+(r.gcc||'\u2014')+'</span> '
      +'<span style="color:#555;font-size:11px">'+r.buyer+'</span></span>'
      +'<span class="gcc-fam-n">'+r.n.toLocaleString()+'</span>'
      +'</div>';
  });
  box.innerHTML=html;
}
function renderTipos(){
  var rows=listTipos();
  document.getElementById('cnt-tipos').textContent=rows.length+' tipos';
  if(!selTipo&&rows.length) selTipo=rows[0].code;
  var still=false;
  rows.forEach(function(r){ if(r.code===selTipo) still=true; });
  if(!still) selTipo=rows.length?rows[0].code:null;
  document.getElementById('tipo-list').innerHTML=rows.map(function(t){
    return '<div class="gcc-item'+(selTipo===t.code?' sel':'')+'" onclick="selectTipo(\''+t.code+'\')">'
      +'<span class="badge" style="background:#dbeafe;color:#1e40af">'+t.code+'</span>'
      +'<div class="gcc-item-meta"><div class="gcc-item-name">'+t.desc+'</div>'
      +'<div class="gcc-item-sub">'+t.nFam+' familias \u00b7 '+t.nBuyers+' compradores</div></div>'
      +'<div class="gcc-item-n">'+t.n.toLocaleString()+'</div></div>';
  }).join('');
  renderTipoDetail();
}
function renderGrupos(){
  var q=document.getElementById('f-grp-q').value.toLowerCase();
  var tc=document.getElementById('f-grp-tipo').value;
  var gcc=document.getElementById('f-grp-gcc').value;
  var rows=GRUPOS.filter(function(g){
    if(tc&&g.tc!==tc) return false;
    if(gcc&&g.gcc!==gcc) return false;
    if(q&&!(g.tc+g.td+g.gc+g.gd+g.gcc).toLowerCase().includes(q)) return false;
    return true;
  });
  var matByGrupo = {};
  MAT.forEach(function(m){ matByGrupo[m.gc] = (matByGrupo[m.gc]||0)+1; });
  document.getElementById('cnt-grupos').textContent=rows.length+' grupos';
  document.getElementById('tb-grupos').innerHTML=rows.map(function(g){
    return '<tr class="clickable" title="Ver materiales" onclick="goToMateriales({tipo:\''+g.tc+'\',grupo:\''+g.gc+'\'})">'
      +'<td><span class="badge" style="background:#dbeafe;color:#1e40af">'+g.tc+'</span></td>'
      +'<td style="color:#555">'+g.td+'</td>'
      +'<td><span class="badge" style="background:#fef3c7;color:#92400e">'+g.gc+'</span></td>'
      +'<td>'+g.gd+'</td>'
      +'<td><span class="badge" style="background:#f3e8ff;color:#6b21a8">'+g.gcc+'</span></td>'
      +'<td style="text-align:center"><b>'+(matByGrupo[g.gc]||0).toLocaleString()+'</b> mat.</td></tr>';
  }).join('');
}
function renderCats(){
  var q=document.getElementById('f-cat-q').value.toLowerCase();
  var tc=document.getElementById('f-cat-tipo').value;
  var rows=CATS.filter(function(c){
    if(tc&&c.tc!==tc) return false;
    if(q&&!(c.tc+c.td+c.cv+(c.cd||'')).toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById('cnt-cats').textContent=rows.length+' categor\u00edas';
  document.getElementById('tb-cats').innerHTML=rows.map(function(c){
    return '<tr class="clickable" title="Ver materiales" onclick="goToMateriales({tipo:\''+c.tc+'\',cv:\''+c.cv+'\'})">'
      +'<td><span class="badge" style="background:#dbeafe;color:#1e40af">'+c.tc+'</span></td>'
      +'<td style="color:#555">'+c.td+'</td>'
      +'<td><span class="badge" style="background:#d1fae5;color:#065f46;font-family:monospace">'+c.cv+'</span></td>'
      +'<td style="color:#555">'+(c.cd||CV_DESC[c.cv]||'')+'</td>'
      +'<td style="text-align:center">'+(matByCat[c.cv]||0).toLocaleString()+' mat.</td></tr>';
  }).join('');
}
function buyerName(label, gcc){
  var n=(label||'').replace(/^.*\u2013\s*/,'');
  return n||gcc||'Sin comprador';
}
function listCompradores(){
  var q=document.getElementById('f-gcc-q').value.toLowerCase();
  var tc=document.getElementById('f-gcc-tipo').value;
  var map={};
  MAT.forEach(function(m){
    if(tc&&m.tc!==tc) return;
    var k=m.gcc_raw||'';
    if(!map[k]) map[k]={gcc:k, label:m.gcc||'', name:buyerName(m.gcc,k), fam:{}, tipos:{}, n:0};
    map[k].n++;
    if(m.gc) map[k].fam[m.gc]=1;
    if(m.tc) map[k].tipos[m.tc]=1;
  });
  return Object.keys(map).sort().map(function(k){
    var o=map[k];
    return {gcc:o.gcc, label:o.label, name:o.name, nFam:Object.keys(o.fam).length, nTipos:Object.keys(o.tipos).length, n:o.n};
  }).filter(function(r){
    return !q||(r.gcc+' '+r.label+' '+r.name).toLowerCase().includes(q);
  });
}
function compradorTree(gcc, tc){
  var tipos={};
  MAT.forEach(function(m){
    if((m.gcc_raw||'')!==(gcc||'')) return;
    if(tc&&m.tc!==tc) return;
    if(!m.tc) return;
    if(!tipos[m.tc]) tipos[m.tc]={tc:m.tc, td:m.td||'', n:0, fam:{}};
    tipos[m.tc].n++;
    var fk=m.gc||'';
    if(!tipos[m.tc].fam[fk]) tipos[m.tc].fam[fk]={gc:fk, gd:m.gd||'', n:0};
    tipos[m.tc].fam[fk].n++;
  });
  return Object.keys(tipos).sort().map(function(k){
    var t=tipos[k];
    t.familias=Object.keys(t.fam).sort().map(function(fk){return t.fam[fk];});
    return t;
  });
}
function selectComprador(gcc){
  selGcc=gcc;
  gccOpenTipos={};
  renderCompradores();
}
function toggleGccTipo(tc, ev){
  if(ev) ev.stopPropagation();
  gccOpenTipos[tc]=gccOpenTipos[tc]===false;
  renderGccDetail();
}
function renderGccDetail(){
  var box=document.getElementById('gcc-detail');
  if(selGcc===null){
    box.innerHTML='<div class="gcc-detail-ph">\u2190 Selecciona un comprador para ver sus tipos y familias</div>';
    return;
  }
  var tc=document.getElementById('f-gcc-tipo').value;
  var rows=listCompradores();
  var info=null;
  rows.forEach(function(r){ if(r.gcc===selGcc) info=r; });
  if(!info){
    var all=MAT.filter(function(m){return (m.gcc_raw||'')===selGcc;})[0];
    info={gcc:selGcc, name:buyerName(all?all.gcc:'', selGcc), nFam:0, nTipos:0, n:0};
  }
  var tree=compradorTree(selGcc, tc);
  if(Object.keys(gccOpenTipos).length===0){
    tree.forEach(function(t){ gccOpenTipos[t.tc]=true; });
  }
  var gccArg=selGcc?('\''+selGcc+'\''):'\'\'';
  var tipoArg=tc?(',tipo:\''+tc+'\''):'';
  var html='<div class="gcc-hd">'
    +'<span class="badge" style="background:#f3e8ff;color:#6b21a8">'+(info.gcc||'\u2014')+'</span>'
    +'<div><div class="gcc-hd-name">'+info.name+'</div>'
    +'<div class="gcc-hd-stats"><b>'+info.n.toLocaleString()+'</b> c\u00f3digos \u00b7 <b>'+info.nFam+'</b> familias \u00b7 <b>'+tree.length+'</b> tipos</div></div>'
    +'<button type="button" class="btn-export" style="margin-left:auto" onclick="goToMateriales({gcc:'+gccArg+tipoArg+'})">Ver c\u00f3digos</button>'
    +'</div>';
  if(!tree.length){
    html+='<div class="gcc-detail-ph">Sin materiales con el filtro actual</div>';
    box.innerHTML=html;
    return;
  }
  tree.forEach(function(t){
    var open=gccOpenTipos[t.tc]!==false;
    html+='<div class="gcc-tipo">'
      +'<div class="gcc-tipo-row" onclick="goToMateriales({gcc:'+gccArg+',tipo:\''+t.tc+'\'})">'
      +'<span class="gcc-chev" onclick="toggleGccTipo(\''+t.tc+'\',event)">'+(open?'\u25bc':'\u25b6')+'</span>'
      +'<span class="badge" style="background:#dbeafe;color:#1e40af">'+t.tc+'</span>'
      +'<span class="gcc-tipo-desc">'+t.td+'</span>'
      +'<span class="gcc-tipo-n">'+t.n.toLocaleString()+'</span>'
      +'</div>';
    if(open){
      t.familias.forEach(function(f){
        var famClick=f.gc
          ?'goToMateriales({gcc:'+gccArg+',tipo:\''+t.tc+'\',grupo:\''+f.gc+'\'})'
          :'goToMateriales({gcc:'+gccArg+',tipo:\''+t.tc+'\'})';
        html+='<div class="gcc-fam" onclick="'+famClick+'">'
          +'<span class="badge" style="background:#fef3c7;color:#92400e">'+(f.gc||'\u2014')+'</span>'
          +'<span class="gcc-fam-desc">'+(f.gd||'Sin familia')+'</span>'
          +'<span class="gcc-fam-n">'+f.n.toLocaleString()+'</span>'
          +'</div>';
      });
    }
    html+='</div>';
  });
  box.innerHTML=html;
}
function renderCompradores(){
  var rows=listCompradores();
  document.getElementById('cnt-gcc').textContent=rows.length+' compradores';
  if(selGcc===null&&rows.length) selGcc=rows[0].gcc;
  var still=false;
  rows.forEach(function(r){ if(r.gcc===selGcc) still=true; });
  if(!still) selGcc=rows.length?rows[0].gcc:null;
  document.getElementById('gcc-list').innerHTML=rows.map(function(r){
    var key=r.gcc||'';
    return '<div class="gcc-item'+(selGcc===r.gcc?' sel':'')+'" onclick="selectComprador(\''+key+'\')">'
      +'<span class="badge" style="background:#f3e8ff;color:#6b21a8">'+(r.gcc||'\u2014')+'</span>'
      +'<div class="gcc-item-meta"><div class="gcc-item-name">'+r.name+'</div>'
      +'<div class="gcc-item-sub">'+r.nFam+' familias \u00b7 '+r.nTipos+' tipos</div></div>'
      +'<div class="gcc-item-n">'+r.n.toLocaleString()+'</div></div>';
  }).join('');
  renderGccDetail();
}
function onTbTipoChange(){
  var tc=document.getElementById('f-tb-tipo').value;
  var ftg=document.getElementById('f-tb-grupo');
  ftg.innerHTML='<option value="">Todos los grupos</option>';
  var s3={};
  TB.forEach(function(r){if((!tc||r.tc===tc)&&!s3[r.gc]){s3[r.gc]=r.gd;}});
  Object.keys(s3).sort().forEach(function(c){ftg.add(new Option(c+' \u2013 '+s3[c],c));});
  renderTb();
}
function renderTb(){
  var q=document.getElementById('f-tb-q').value.toLowerCase();
  var tc=document.getElementById('f-tb-tipo').value;
  var gc=document.getElementById('f-tb-grupo').value;
  var cv=document.getElementById('f-tb-cat').value;
  var rows=TB.filter(function(r){
    if(tc&&r.tc!==tc) return false;
    if(gc&&r.gc!==gc) return false;
    if(cv&&r.cv!==cv) return false;
    if(q&&!(r.tc+r.td+r.gc+r.gd+r.cv).toLowerCase().includes(q)) return false;
    return true;
  });
  document.getElementById('cnt-tb').textContent=rows.length+' relaciones';
  document.getElementById('tb-tb').innerHTML=rows.map(function(r){
    return '<tr><td><span class="badge" style="background:#dbeafe;color:#1e40af">'+r.tc+'</span></td>'
      +'<td style="color:#555">'+r.td+'</td>'
      +'<td><span class="badge" style="background:#fef3c7;color:#92400e">'+r.gc+'</span></td>'
      +'<td>'+r.gd+'</td>'
      +'<td><span class="badge" style="background:#d1fae5;color:#065f46;font-family:monospace">'+r.cv+'</span></td></tr>';
  }).join('');
}
function exportCurrent(){
  var rows=[],headers=[],filename='';
  if(activeTab==='mat'){
    headers=['C\u00f3digo','Descripci\u00f3n','Tipo','Desc. Tipo','Grupo Art\u00edculos','Desc. Grupo','Comprador','Cat. Valoraci\u00f3n','Desc. Cat. Valoraci\u00f3n'];
    rows=filtered.map(function(m){return[m.mc,m.md,m.tc,m.td,m.gc,m.gd,m.gcc,m.cv,m.cd||''];});
    filename='Servicios_Materiales';
  } else if(activeTab==='tipos'){
    if(selTipo){
      var tEx=TIPOS.filter(function(x){return x.code===selTipo;})[0];
      headers=['Tipo','Desc. Tipo','Familia','Desc. Familia','Grupo Compras','Comprador','N\u00ba C\u00f3digos'];
      rows=tipoTree(selTipo).map(function(r){
        return[selTipo, tEx?tEx.desc:'', r.gc, r.gd, r.gcc, r.buyer, r.n];
      });
      filename='Servicios_Tipo_'+selTipo;
    } else {
      headers=['C\u00f3digo Tipo','Descripci\u00f3n','N\u00ba Materiales'];
      rows=listTipos().map(function(t){return[t.code,t.desc,t.n];});
      filename='Servicios_Tipos';
    }
  } else if(activeTab==='gcc'){
    var tcGcc=document.getElementById('f-gcc-tipo').value;
    if(selGcc!==null){
      var infoEx=listCompradores().filter(function(r){return r.gcc===selGcc;})[0];
      var nm=infoEx?infoEx.name:selGcc;
      headers=['Comprador','Grupo Compras','Tipo','Desc. Tipo','Familia','Desc. Familia','N\u00ba C\u00f3digos'];
      rows=[];
      compradorTree(selGcc, tcGcc).forEach(function(t){
        t.familias.forEach(function(f){
          rows.push([nm, selGcc, t.tc, t.td, f.gc, f.gd, f.n]);
        });
      });
      filename='Servicios_Comprador_'+(selGcc||'SIN');
    } else {
      headers=['Grupo Compras','Comprador','N\u00ba Familias','N\u00ba Tipos','N\u00ba C\u00f3digos'];
      rows=listCompradores().map(function(r){return[r.gcc,r.name,r.nFam,r.nTipos,r.n];});
      filename='Servicios_Compradores';
    }
  } else if(activeTab==='grupos'){
    headers=['Tipo','Desc. Tipo','Grupo Art\u00edculos','Desc. Grupo','Comprador'];
    var q3=document.getElementById('f-grp-q').value.toLowerCase();
    var tc3=document.getElementById('f-grp-tipo').value;
    var gcc3=document.getElementById('f-grp-gcc').value;
    rows=GRUPOS.filter(function(g){
      if(tc3&&g.tc!==tc3) return false;
      if(gcc3&&g.gcc!==gcc3) return false;
      if(q3&&!(g.tc+g.td+g.gc+g.gd+g.gcc).toLowerCase().includes(q3)) return false;
      return true;
    }).map(function(g){return[g.tc,g.td,g.gc,g.gd,g.gcc];});
    filename='Servicios_GruposArticulos';
  } else if(activeTab==='cats'){
    headers=['Tipo','Desc. Tipo','Cat. Valoraci\u00f3n','Desc. Cat. Valoraci\u00f3n','N\u00ba Materiales'];
    var q4=document.getElementById('f-cat-q').value.toLowerCase();
    var tc4=document.getElementById('f-cat-tipo').value;
    rows=CATS.filter(function(c){
      if(tc4&&c.tc!==tc4) return false;
      if(q4&&!(c.tc+c.td+c.cv+(c.cd||'')).toLowerCase().includes(q4)) return false;
      return true;
    }).map(function(c){return[c.tc,c.td,c.cv,c.cd||CV_DESC[c.cv]||'',matByCat[c.cv]||0];});
    filename='Servicios_CatValoracion';
  } else if(activeTab==='tb'){
    headers=['Tipo','Desc. Tipo','Grupo Art\u00edculos','Desc. Grupo','Cat. Valoraci\u00f3n'];
    var q5=document.getElementById('f-tb-q').value.toLowerCase();
    var tc5=document.getElementById('f-tb-tipo').value;
    var gc5=document.getElementById('f-tb-grupo').value;
    var cv5=document.getElementById('f-tb-cat').value;
    rows=TB.filter(function(r){
      if(tc5&&r.tc!==tc5) return false;
      if(gc5&&r.gc!==gc5) return false;
      if(cv5&&r.cv!==cv5) return false;
      if(q5&&!(r.tc+r.td+r.gc+r.gd+r.cv).toLowerCase().includes(q5)) return false;
      return true;
    }).map(function(r){return[r.tc,r.td,r.gc,r.gd,r.cv];});
    filename='Servicios_TablaMaestra';
  }
  var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var hr=headers.map(function(h){return'<Cell ss:StyleID="h"><Data ss:Type="String">'+esc(h)+'</Data></Cell>';}).join('');
  var dr=rows.map(function(row){return'<Row>'+row.map(function(v){var n=typeof v==='number';return'<Cell><Data ss:Type="'+(n?'Number':'String')+'">'+esc(v)+'</Data></Cell>';}).join('')+'</Row>';}).join('');
  var xml='<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F3864" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Servicios"><Table><Row>'+hr+'</Row>'+dr+'</Table></Worksheet></Workbook>';
  var blob=new Blob([xml],{type:'application/vnd.ms-excel'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url; a.download=filename+'.xls'; a.click();
  URL.revokeObjectURL(url);
  var note=document.getElementById('export-note');
  if(note){note.textContent='\u2713 '+rows.length+' filas exportadas';setTimeout(function(){note.textContent='';},3000);}
}
