// Planejamento de Obra A|W — v6.03.42
const SB_URL='https://ejneanfveoctdlltjnrs.supabase.co';
const SB_KEY='sb_publishable_vZApDmF_C-heCrm8fXJ_XA_ATmMO3YP';
const SB_HDR={'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
const _CRONO_ID=sessionStorage.getItem('aw_crono_id')||'';
// ── Congelamento (v6.03.00 · Fase 1: estado + snapshot) ───────────
// Estado unificado com a 1ª página: status 'frozen' no Supabase.
function _isFrozen(){
  try{ if(sessionStorage.getItem('aw_crono_status')==='frozen')return true; }catch(e){}
  // Fallback robusto: flag persistida no próprio ESTADO (viaja junto no estado salvo no Supabase),
  // imune a dessincronização do sessionStorage entre sessões/reloads.
  try{ if(typeof ESTADO!=='undefined'&&ESTADO&&ESTADO.congelado===true)return true; }catch(e){}
  return false;
}
// Captura datas macro travadas: ARQ (todas etapas), TEC (todas etapas), OBRA (início/fim da fase).
// Datas gravadas como strings ISO para estabilidade (evita NaN em gPx/G.diff).
function _capturarSnapshotCongelamento(){
  if(typeof gSt==='undefined'||!gSt)return null;
  const snap={arq:{},tec:{},obra:{},ts:Date.now()};
  (gSt.projFases||[]).forEach(function(ph){
    snap.arq[ph.id]={};snap.tec[ph.id]={};
    G.SUB_IDS.forEach(function(id){var s=ph.rows&&ph.rows.arq&&ph.rows.arq.subs&&ph.rows.arq.subs[id];if(s)snap.arq[ph.id][id]={start:G.fmtISO(s.start),end:G.fmtISO(s.end)};});
    G.TEC_IDS.forEach(function(id){var s=ph.rows&&ph.rows.tec&&ph.rows.tec.subs&&ph.rows.tec.subs[id];if(s)snap.tec[ph.id][id]={start:G.fmtISO(s.start),end:G.fmtISO(s.end)};});
  });
  (gSt.obraFases||[]).forEach(function(of){if(of.obra)snap.obra[of.id]={start:G.fmtISO(of.obra.start),end:G.fmtISO(of.obra.end)};});
  return snap;
}
// Fase 3 — Decide se um alvo de arraste/edição de DATA deve ser bloqueado quando congelado.
// Regra: ARQ e TEC (datas), barra da fase de OBRA e pré-obra e fornecedores técnicos = travados.
// Disciplinas/módulos de obra (obraSub) e percentuais = livres. Vínculos ARQ/TEC = livres (não passam por aqui).
function _congBloqueiaAlvo(t){
  if(!_isFrozen())return false;
  if(!t||!t.type)return false;
  if(t.type==='proj')return true;                 // ARQ e TEC (com/sem subId)
  if(t.type==='obra')return true;                 // barra da fase de obra
  if(t.type==='obraSub')return false;             // disciplina/módulo — livre
  if(t.type==='preObra')return true;              // pré-obra trava junto
  if(typeof t.type==='string'&&t.type.indexOf('tecForn')===0)return true; // fornecedores técnicos
  return false;
}
var _congToastTs=0;
function _congAvisar(){
  var now=Date.now();
  if(now-_congToastTs<1500)return; // evita spam de toast em arrastes repetidos
  _congToastTs=now;
  if(typeof showToast==='function')showToast('❄ Cronograma congelado — datas macro travadas');
}
// Fase 4 — Aparência "congelada": filtro acinzentado no Gantt inteiro. As bolinhas de virada
// V1/V2/V3 são reposicionadas por cima, lendo a posição real de cada marcador (.g-virada-mark)
// e desenhando um clone num overlay sem filtro, alinhado por getBoundingClientRect.
function _congAplicarVisual(){
  var root=document.getElementById('gantt-root');
  if(!root)return;
  var frozen=_isFrozen();
  var col=root.querySelector('#g-tl-col');
  var inner=root.querySelector('#g-tl-inner');
  var ovOld=col&&col.querySelector('#g-virada-overlay');
  if(ovOld)ovOld.remove();
  if(inner){
    inner.style.filter=frozen?'grayscale(1) brightness(1.16) opacity(.95)':'';
    inner.style.transition='filter .2s';
  }
  if(frozen&&col&&inner){
    var marks=inner.querySelectorAll('.g-virada-mark');
    if(marks.length){
      if(getComputedStyle(col).position==='static')col.style.position='relative';
      var colRect=col.getBoundingClientRect();
      var ov=document.createElement('div');
      ov.id='g-virada-overlay';
      ov.style.cssText='position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:9;overflow:hidden;';
      marks.forEach(function(m){
        var r=m.getBoundingClientRect();
        if(r.width===0&&r.height===0)return;
        var c=m.cloneNode(true);
        c.style.filter='none';
        c.style.position='absolute';
        // posição relativa ao col, compensando o scroll interno
        c.style.left=(r.left-colRect.left+col.scrollLeft)+'px';
        c.style.top=(r.top-colRect.top+col.scrollTop)+'px';
        ov.appendChild(c);
      });
      col.appendChild(ov);
    }
  }
  // classe controla os cursores via CSS (clique p/ ver dados quando congelado)
  root.classList.toggle('gantt-congelado', frozen);
}
async function salvarDados(){try{lerUIparaEstado();const ts=Date.now(),payload={ts,estado:ESTADO};sessionStorage.setItem('aw_estado_atual',JSON.stringify(payload));if(_CRONO_ID){const el=document.getElementById('save-info');if(el)el.textContent='Salvando…';const r=await fetch(SB_URL+'/rest/v1/cronogramas?id=eq.'+_CRONO_ID,{method:'PATCH',headers:SB_HDR,body:JSON.stringify({codigo:ESTADO.meta.codigo||'',nome:ESTADO.meta.nome||'',gi:ESTADO.meta.gi||'',gp:ESTADO.meta.gp||'',estado_json:JSON.stringify(payload),atualizado_em:new Date().toISOString()})});const dt=new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});if(el)el.textContent=r.ok?'Salvo às '+dt:'Erro ao salvar';}}catch(e){console.error('salvarDados',e);}}
async function carregarDadosSB(){if(!_CRONO_ID)return false;const _cachedId=sessionStorage.getItem('aw_crono_id_cached');if(_cachedId&&_cachedId!==_CRONO_ID){sessionStorage.removeItem('aw_estado_atual');}sessionStorage.setItem('aw_crono_id_cached',_CRONO_ID);const cached=sessionStorage.getItem('aw_estado_atual');if(cached){try{const d=JSON.parse(cached);if(d.estado){const _hasPlano=d.estado.cfg&&d.estado.cfg.equipeARQ&&d.estado.cfg.equipeARQ.planoAloc&&Object.keys(d.estado.cfg.equipeARQ.planoAloc||{}).length>0;console.log('[App] carregando cache | ts:',d.ts,'| planoAloc:',_hasPlano?'presente':'AUSENTE');ESTADO=d.estado;window.__AW_ESTADO=ESTADO;estadoParaUI();fetch(SB_URL+'/rest/v1/cronogramas?id=eq.'+_CRONO_ID+'&select=status,nome',{headers:SB_HDR}).then(function(r){return r.json();}).then(function(data){if(data&&data[0]){sessionStorage.setItem('aw_crono_status',data[0].status||'sim');sessionStorage.setItem('aw_crono_nome',data[0].nome||'');var _st=data[0].status||'sim';if(_st==='frozen'){var _b=document.getElementById('btn-plano-fino');if(_b)_b.style.display='none';var _w=document.getElementById('pf-watermark');if(_w)_w.style.display='none'/*plano fino removido v6.03.08*/;var _ht=document.querySelector('.hdr-title');if(_ht&&data[0].nome){var _nm=data[0].nome;_ht.innerHTML='Planejamento<em> de Obra</em> · <span style="opacity:.6;">'+_nm+'</span> <span style="font-size:9px;background:rgba(0,185,80,.2);color:#00B950;padding:1px 6px;border-radius:8px;">❄ Congelado</span>';}};}}).catch(function(){});return true;}}catch{}}try{const r=await fetch(SB_URL+'/rest/v1/cronogramas?id=eq.'+_CRONO_ID+'&select=*',{headers:SB_HDR});const data=await r.json();if(data&&data[0]){const row=data[0];sessionStorage.setItem('aw_crono_status',row.status||'sim');sessionStorage.setItem('aw_crono_nome',row.nome||'');if(row.estado_json){try{const d=JSON.parse(row.estado_json);if(d.estado){ESTADO=d.estado;window.__AW_ESTADO=ESTADO;estadoParaUI();sessionStorage.setItem('aw_estado_atual',row.estado_json);const dt=new Date(row.atualizado_em);const el=document.getElementById('save-info');if(el)el.textContent='Salvo: '+dt.toLocaleDateString('pt-BR');return true;}}catch{}}ESTADO.meta.codigo=row.codigo||'';ESTADO.meta.nome=row.nome||'';ESTADO.meta.gi=row.gi||'';ESTADO.meta.gp=row.gp||'';window.__AW_ESTADO=ESTADO;estadoParaUI();return true;}}catch(e){console.error('carregarDadosSB',e);}return false;}


let ESTADO={meta:{codigo:"",nome:"",gi:"",gp:""},cfg:{nProj:1,nObra:1,dnn:"",visita:"",kickoffTec:"",vinculoObraProj:!1,limiteArq:5,projFases:[{etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""}],obraFases:[{inicio:"",prazo:"56",andares:"",preObra:{ativo:false,templateId:"pre-obra-padrao",du:5}}]},alocacaoARQ:{}};function confirmarReset(){document.getElementById("modal-confirm").classList.add("open")}function fecharConfirm(){document.getElementById("modal-confirm").classList.remove("open")}function executarReset(){localStorage.removeItem(LS_KEY),ESTADO={meta:{codigo:"",nome:"",gi:"",gp:""},cfg:{nProj:1,nObra:1,dnn:"",visita:"",kickoffTec:"",vinculoObraProj:!1,limiteArq:5,projFases:[{etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""}],obraFases:[{inicio:"",prazo:"56",andares:"",preObra:{ativo:false,templateId:"pre-obra-padrao",du:5}}]},alocacaoARQ:{}},window.__AW_ESTADO=ESTADO,gSt.projFases=[],gSt.obraFases=[],gSt.axisStart=null,gSt.totalDays=0,gSt.zoom=1,gSt._obraVinculadaCond=!0,gSt._obraArqSrc="aprovCond",gSt._visitaVinculada=!0,gSt._visitaDate=null,CFG_ANDARES=["5º","6º","7º"],CFG_PERFIL_SEL="proj+obra",_nFasesProj=1,_nFasesObra=1,_cfgAndarModo="inteiro",_cfgEntregaveis={};const t=document.getElementById("cfg-vinculo-obra-proj");t&&(t.checked=!1);const e=document.getElementById("cfg-pre-obra-on");e&&(e.checked=!1);const o=document.getElementById("cfg-pre-obra-wrap");o&&(o.style.display="none");const a=document.getElementById("cfg-vinculo-obra-wrap");a&&(a.style.display="none"),document.querySelectorAll("#cfg-seg-nproj .cfg-seg-btn").forEach((t,e)=>t.classList.toggle("sel",0===e)),document.querySelectorAll("#cfg-seg-nobra .cfg-seg-btn").forEach((t,e)=>t.classList.toggle("sel",0===e)),cfgRenderAndares(),cfgRenderPerfil(),cfgAplicarPerfil(),cfgInitEntregaveis(),cfgBuildEntregaveis(),estadoParaUI(),motorRecalc(),"function"==typeof gRender&&gRender(),document.getElementById("save-info").textContent="Dados zerados",fecharConfirm(),showToast("Dados zerados — protótipo no estado inicial")}function lerUIparaEstado(){ESTADO.meta.codigo=v("meta-codigo"),ESTADO.meta.nome=v("meta-nome"),ESTADO.meta.gi=v("meta-gi"),ESTADO.meta.gp=v("meta-gp"),ESTADO.cfg.dnn=v("cfg-dnn"),ESTADO.cfg.visita=v("cfg-visita"),ESTADO.cfg.kickoffTec=v("cfg-kickofftec");const t=ESTADO.cfg.nProj;for(let e=0;e<t;e++){const t=ESTADO.cfg.projFases[e]||{};["ep1","ep2","ap","ex","cond"].forEach(o=>{const a=document.getElementById(`proj-f${e}-${o}`);a&&(t.etapas[o]=a.checked)});const o=document.getElementById(`proj-f${e}-andares`);o&&(t.andares=o.value),ESTADO.cfg.projFases[e]=t}const e=ESTADO.cfg.nObra;for(let t=0;t<e;t++){const e=ESTADO.cfg.obraFases[t]||{},o=document.getElementById(`obra-f${t}-inicio`),a=document.getElementById(`obra-f${t}-prazo`),n=document.getElementById(`obra-f${t}-andares`);o&&(e.inicio=o.value),a&&(e.prazo=a.value),n&&(e.andares=n.value),ESTADO.cfg.obraFases[t]=e}}function estadoParaUI(){set("meta-codigo",ESTADO.meta.codigo),set("meta-nome",ESTADO.meta.nome),set("meta-gi",ESTADO.meta.gi),set("meta-gp",ESTADO.meta.gp),set("cfg-dnn",ESTADO.cfg.dnn),set("cfg-visita",ESTADO.cfg.visita),set("cfg-kickofftec",ESTADO.cfg.kickoffTec);const t=document.getElementById("cfg-vinculo-obra-proj");if(t){t.checked=!!ESTADO.cfg.vinculoObraProj;const e=document.getElementById("cfg-vinculo-obra-wrap");e&&(e.style.display=t.checked?"":"none")}if(ESTADO.equipeARQ){const t=ESTADO.equipeARQ,e=document.getElementById("earq-ch-arq");e&&(e.value=t.chArq??120);const o=document.getElementById("earq-ch-dir");o&&(o.value=t.chDir??280);const a=document.getElementById("earq-ch-ger");a&&(a.value=t.chGer??180)}const e=document.getElementById("cfg-limite-arq");e&&(e.value=ESTADO.cfg?.limiteArq??5);const o=document.getElementById("val-nproj");o&&(o.textContent=ESTADO.cfg.nProj);const a=document.getElementById("val-nobra");a&&(a.textContent=ESTADO.cfg.nObra),renderProjFases(),renderObraFases(),atualizarHeaderBadge(),motorRecalc(),atualizarResumoDatas()}function v(t){return document.getElementById(t)?.value??""}function set(t,e){const o=document.getElementById(t);o&&(o.value=e)}function onMetaChange(){atualizarHeaderBadge()}function onCfgChange(){lerUIparaEstado(),motorRecalc(),atualizarResumoDatas(),"function"==typeof gRender&&gRender()}function atualizarHeaderBadge(){const t=v("meta-codigo"),e=v("meta-nome"),o=document.getElementById("hdr-badge");t||e?(o.textContent=[t,e].filter(Boolean).join(" — "),o.style.display=""):o.style.display="none"}function stepperChange(t,e){ESTADO.cfg[t]=Math.min(4,Math.max(1,(ESTADO.cfg[t]||1)+e));const o=document.getElementById("nProj"===t?"val-nproj":"val-nobra");if(o&&(o.textContent=ESTADO.cfg[t]),"nProj"===t){for(;ESTADO.cfg.projFases.length<ESTADO.cfg.nProj;)ESTADO.cfg.projFases.push({etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""});ESTADO.cfg.projFases.length=ESTADO.cfg.nProj,renderProjFases()}else{for(;ESTADO.cfg.obraFases.length<ESTADO.cfg.nObra;)ESTADO.cfg.obraFases.push({inicio:"",prazo:"56",andares:"",preObra:{ativo:false,templateId:"pre-obra-padrao",du:5}});ESTADO.cfg.obraFases.length=ESTADO.cfg.nObra,renderObraFases()}}window.__AW_ESTADO=ESTADO;const ETAPAS_ARQ=[{id:"ep1",label:"EP1"},{id:"ep2",label:"EP2"},{id:"ap",label:"AP"},{id:"ex",label:"EX"},{id:"cond",label:"Cond."}];function renderProjFases(){const t=document.getElementById("proj-fases-container"),e=ESTADO.cfg.nProj;let o="";for(let t=0;t<e;t++){const e=ESTADO.cfg.projFases[t]||{},a=e.etapas||{};o+=`\n <div class="p-fase"><div class="p-fase-hdr"><span class="p-fase-num">Fase ${t+1}</span></div><div class="p-fase-body"><div class="p-field"><label class="p-label">Etapas ARQ</label><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px;">\n ${ETAPAS_ARQ.map(e=>` <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);letter-spacing:.05em;text-transform:uppercase;"> <input type="checkbox" id="proj-f${t}-${e.id}" ${!1!==a[e.id]?"checked":""} onchange="onCfgChange()" style="accent-color:var(--accent);width:12px;height:12px;"> ${e.label} </label> `).join("")}\n </div></div>
<div class="p-field"><label class="p-label" style="color:#D4A017;">★ Aprovação do Cliente</label>
<table style="width:100%;border-collapse:collapse;margin-top:4px;font-size:10px;">
<thead><tr style="background:var(--bg-surface2);">
<th style="padding:5px 8px;text-align:left;font-family:var(--font);font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:1px solid var(--border);">Etapa</th>
<th style="padding:5px 8px;text-align:center;font-family:var(--font);font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:1px solid var(--border);width:80px;">Ativa ★</th>
<th style="padding:5px 8px;text-align:center;font-family:var(--font);font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:1px solid var(--border);width:60px;">Dias</th>
</tr></thead>
<tbody>
${ETAPAS_ARQ.map(e=>{const aprCfg=ESTADO.cfg&&ESTADO.cfg.aprovaCliente&&ESTADO.cfg.aprovaCliente[e.id];const defAtiv=(_ativListas.arq.find(a=>a.id===e.id)||{}).aprovaCliente||false;const defDias=(_ativListas.arq.find(a=>a.id===e.id)||{}).diasAprova||1;const ativo=aprCfg?aprCfg.ativo:defAtiv;const dias=aprCfg?aprCfg.dias:defDias;return`<tr style="border-bottom:1px solid var(--border);"><td style="padding:6px 8px;font-family:var(--font);font-weight:700;color:var(--txt);">${e.label}</td><td style="padding:6px 8px;text-align:center;"><input type="checkbox" id="proj-f${t}-aprova-${e.id}" ${ativo?"checked":""} onchange="onAprovaChange(${t},'${e.id}')" style="accent-color:#D4A017;width:15px;height:15px;cursor:pointer;"></td><td style="padding:6px 8px;text-align:center;"><input type="number" id="proj-f${t}-aprova-dias-${e.id}" value="${dias}" min="1" max="10" onchange="onAprovaChange(${t},'${e.id}')" style="width:44px;padding:3px 5px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface);color:var(--txt);font-size:11px;text-align:center;" ${ativo?"":"disabled"}></td></tr>`;}).join("")}
</tbody></table></div>
<div class="p-field"><label class="p-label">Andares</label><input class="p-input" type="text" id="proj-f${t}-andares"\n placeholder="ex: 10º e 11º" value="${e.andares||""}" oninput="onCfgChange()"></div></div></div>`}t.innerHTML=o}
// ═══════════════════════════════════════════════════════════
// VÍNCULO TEMPLATE ↔ FASE DE OBRA
// ═══════════════════════════════════════════════════════════

// Retorna cópia limpa das disciplinas de um template (sem flags de UI)
function _tplGetDiscsCopy(templateId) {
  if (!templateId) return null;
  // Tentar custom primeiro
  const custom = _tplCarregarCustom().find(t => t.id === templateId);
  if (custom && custom.disciplinas) {
    return JSON.parse(JSON.stringify(custom.disciplinas.map(d => {
      const {_ouExpanded, ...rest} = d;
      return rest;
    })));
  }
  // Template padrão
  return obraTemplateGetDiscs(templateId);
}

// Detecta se as disciplinas da fase foram modificadas em relação ao template vinculado
function _tplFaseModificada(faseIdx) {
  const cfg = ESTADO.cfg.obraFases[faseIdx];
  if (!cfg || !cfg.templateId) return false;
  const fase = gSt.obraFases[faseIdx];
  if (!fase || !fase.disciplinas) return false;
  const tplDiscs = _tplGetDiscsCopy(cfg.templateId);
  if (!tplDiscs) return false;
  // Comparação por JSON simplificado (ignora _ouExpanded e outras flags de UI)
  const normalizar = discs => JSON.stringify(discs.map(d => ({
    id: d.id, label: d.label, ativo: d.ativo,
    tasks: (d.tasks||[]).map(t => ({ n: t.n, prep: t.prep, prof: t.prof, m: t.m }))
  })));
  return normalizar(fase.disciplinas) !== normalizar(tplDiscs);
}

// Vincula um template a uma fase — com aviso se houver modificações
function _tplVincularFase(faseIdx, templateId, selectEl) {
  const cfg = ESTADO.cfg.obraFases[faseIdx] || {};
  const fase = gSt.obraFases[faseIdx];
  const templateAnterior = cfg.templateId || '';

  // Se selecionou o mesmo template E as disciplinas já estão aplicadas, não faz nada
  if (templateId === templateAnterior && templateId && fase && fase.disciplinas?.length) return;

  // Verificar se há disciplinas modificadas em relação ao template ANTERIOR
  const temModificacao = templateAnterior && fase && _tplFaseModificada(faseIdx);

  // Se está removendo o vínculo (selecionou "sem template")
  if (!templateId) {
    if (temModificacao) {
      if (!confirm('Remover o vínculo de template da Fase ' + (faseIdx+1) + '?\n\nAs disciplinas já lançadas no cronograma serão mantidas como estão.')) {
        // Restaurar select para o valor anterior
        if (selectEl) selectEl.value = templateAnterior;
        return;
      }
    }
    if (!ESTADO.cfg.obraFases[faseIdx]) ESTADO.cfg.obraFases[faseIdx] = {};
    ESTADO.cfg.obraFases[faseIdx].templateId = '';
    renderObraFases();
    return;
  }

  const todos = typeof tplGetTodos === 'function' ? tplGetTodos() : OBRA_TEMPLATES;
  const novoTpl = todos.find(t => t.id === templateId);
  if (!novoTpl) return;

  // Montar mensagem de aviso
  let msg = '';
  if (temModificacao) {
    msg = `A Fase ${faseIdx+1} tem disciplinas e tarefas que foram modificadas manualmente no cronograma.\n\n`;
    msg += `Ao vincular o template "${novoTpl.label}", todos esses lançamentos serão substituídos pelas configurações do template.\n\n`;
    msg += `Deseja continuar?`;
  } else if (templateAnterior && templateAnterior !== templateId) {
    msg = `Trocar o template da Fase ${faseIdx+1} para "${novoTpl.label}"?\n\nAs disciplinas do cronograma serão atualizadas com as configurações do novo template.`;
  }

  if (msg && !confirm(msg)) {
    // Restaurar select para o valor anterior
    if (selectEl) selectEl.value = templateAnterior;
    return;
  }

  // Aplicar template
  const novasDiscs = _tplGetDiscsCopy(templateId);
  if (!novasDiscs) { showToast('Erro ao carregar template'); return; }

  if (!ESTADO.cfg.obraFases[faseIdx]) ESTADO.cfg.obraFases[faseIdx] = {};
  ESTADO.cfg.obraFases[faseIdx].templateId = templateId;

  if (fase) {
    fase.disciplinas = novasDiscs;
    ativSincronizarG();
    gRender();
    if (typeof renderEfetivo === 'function' && abaAtiva === 'efetivo') renderEfetivo();
    if (typeof renderHistograma === 'function' && abaAtiva === 'histograma') renderHistograma();
  }

  showToast('Template "' + novoTpl.label + '" aplicado à Fase ' + (faseIdx+1));
  renderObraFases(); // atualiza status
}

// Ressincroniza disciplinas da fase com o template (descarta modificações manuais)
function _tplRessincronizar(faseIdx) {
  const cfg = ESTADO.cfg.obraFases[faseIdx];
  if (!cfg || !cfg.templateId) return;
  const todos = typeof tplGetTodos === 'function' ? tplGetTodos() : OBRA_TEMPLATES;
  const tpl = todos.find(t => t.id === cfg.templateId);
  if (!tpl) return;
  if (!confirm('Ressincronizar a Fase ' + (faseIdx+1) + ' com o template "' + tpl.label + '"?\n\nTodas as modificações feitas manualmente no cronograma serão descartadas.')) return;
  const novasDiscs = _tplGetDiscsCopy(cfg.templateId);
  if (!novasDiscs) return;
  const fase = gSt.obraFases[faseIdx];
  if (fase) {
    fase.disciplinas = novasDiscs;
    ativSincronizarG();
    gRender();
    if (typeof renderEfetivo === 'function' && abaAtiva === 'efetivo') renderEfetivo();
    if (typeof renderHistograma === 'function' && abaAtiva === 'histograma') renderHistograma();
  }
  showToast('Fase ' + (faseIdx+1) + ' ressincronizada com o template');
  renderObraFases();
}

function renderObraFases(){
  const cont = document.getElementById('obra-fases-cfg') || document.getElementById('obra-fases-container');
  if (!cont) return;
  const n = ESTADO.cfg.nObra || 1;
  const todos = typeof tplGetTodos === 'function' ? tplGetTodos() : OBRA_TEMPLATES;
  const todosPreObra = typeof _preObraGetTodos === 'function' ? _preObraGetTodos() : PREOBRA_TEMPLATES_DEFAULT;

  for (let i = 0; i < n; i++) {
    if (!ESTADO.cfg.obraFases[i]) ESTADO.cfg.obraFases[i] = {};
    const cfg = ESTADO.cfg.obraFases[i];
    if (!cfg.preObra) cfg.preObra = {ativo:false,templateId:'pre-obra-padrao',du:5};
    if (!cfg.templateId) {
      cfg.templateId = 'escritorio-padrao';
      const faseGst = gSt.obraFases[i];
      if (faseGst && typeof _tplGetDiscsCopy === 'function') {
        const novas = _tplGetDiscsCopy('escritorio-padrao');
        if (novas) faseGst.disciplinas = novas;
      }
    }
  }

  let html = '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
    + '<thead><tr style="background:var(--bg-surface2);">'
    + '<th style="padding:7px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);width:44px;">Fase</th>'
    + '<th style="padding:7px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);width:210px;">Pré-Obra</th>'
    + '<th style="padding:7px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);">Template de Obra</th>'
    + '<th style="padding:7px 10px;text-align:center;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);width:32px;"></th>'
    + '</tr></thead><tbody>';

  for (let i = 0; i < n; i++) {
    const cfg = ESTADO.cfg.obraFases[i];
    const tplSel = cfg.templateId || 'escritorio-padrao';
    const poSel = cfg.preObra.templateId || 'pre-obra-padrao';
    const poAtivo = cfg.preObra.ativo || false;
    const faseMod = typeof _tplFaseModificada === 'function' && _tplFaseModificada(i);
    const statusDot = '<span title="'+(faseMod?'Modificado manualmente':'Sincronizado')+'" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+(faseMod?'#E07000':'#2A7A30')+';flex-shrink:0;"></span>';

    const tplOpts = todos.map(t => '<option value="'+t.id+'" '+(t.id===tplSel?'selected':'')+'>'+t.label+'</option>').join('');
    const poOpts = todosPreObra.map(t => '<option value="'+t.id+'" '+(t.id===poSel?'selected':'')+'>'+t.label+'</option>').join('');

    const ressincBtn = faseMod
      ? '<button onclick="_tplRessincronizar('+i+')" title="Ressincronizar" style="width:26px;height:26px;border:1px solid #C07820;background:rgba(192,120,32,.08);color:#C07820;border-radius:4px;cursor:pointer;font-size:13px;">↺</button>'
      : '<div style="width:26px;"></div>';

    const poTpl = todosPreObra.find(t => t.id===poSel);
    const poDiscs = poTpl ? poTpl.disciplinas.filter(d=>d.ativo!==false).length : 0;
    const oBadge = '<span style="font-size:10px;background:rgba(26,82,148,.12);color:#1A5294;padding:1px 7px;border-radius:10px;font-family:var(--font);font-weight:700;">'+tplSel+'</span>';
    const poBadge = poAtivo ? '<span style="font-size:10px;background:rgba(42,122,48,.12);color:#2A7A30;padding:1px 7px;border-radius:10px;font-family:var(--font);font-weight:700;">'+poDiscs+' disc · '+(cfg.preObra.du||5)+' DU</span>' : '';

    html += '<tr style="border-bottom:1px solid var(--border);">'
      + '<td style="padding:8px 10px;vertical-align:top;"><span style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">F'+(i+1)+'</span></td>'
      + '<td style="padding:6px 10px;border-right:1px solid var(--border);vertical-align:top;">'
      + '<div style="display:flex;align-items:center;gap:7px;">'
      + '<input type="checkbox" '+(poAtivo?'checked':'')+' onchange="_preObraToggle('+i+',this.checked)" style="width:14px;height:14px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;">'
      + (poAtivo
          ? '<select class="p-input" style="flex:1;height:28px;padding:0 6px;font-size:11px;" onchange="ESTADO.cfg.obraFases['+i+'].preObra.templateId=this.value;onCfgChange();renderObraFases();gRender();">'+poOpts+'</select>'
          : '<span style="font-size:11px;color:var(--txt-dim);font-style:italic;">sem pré-obra</span>')
      + '</div>'
      + (poAtivo ? '<div style="margin-top:5px;padding-left:21px;">'+poBadge+'</div>' : '')
      + '</td>'
      + '<td style="padding:6px 10px;vertical-align:top;">'
      + '<div style="display:flex;align-items:center;gap:7px;">'+statusDot
      + '<select class="p-input" style="flex:1;height:28px;padding:0 6px;font-size:11px;" onchange="_tplVincularFase('+i+',this.value,this)"><option value="">— sem template —</option>'+tplOpts+'</select>'
      + '</div>'
      + '<div style="margin-top:5px;padding-left:15px;">'+oBadge+'</div>'
      + '</td>'
      + '<td style="padding:6px 8px;text-align:center;vertical-align:top;padding-top:8px;">'+ressincBtn+'</td>'
      + '</tr>';
  }

  html += '</tbody></table>';
  cont.innerHTML = html;
}let CFG_ANDARES=["5º","6º","7º"];function cfgRenderAndares(){const t=document.getElementById("cfg-andares-lista");t&&(t.innerHTML=CFG_ANDARES.map((t,e)=>`<span class="cfg-andar-chip">${t}<button onclick="cfgRemoverAndar(${e})" title="Remover">×</button></span>`).join("")||'<span style="font-size:11px;color:var(--txt-dim);">Nenhum andar cadastrado</span>',cfgBuildAndaresTable())}function cfgAdicionarAndar(){const t=document.getElementById("cfg-andar-novo"),e=t.value.trim();e&&(CFG_ANDARES.push(e),t.value="",cfgRenderAndares())}function cfgRemoverAndar(t){CFG_ANDARES.splice(t,1),cfgRenderAndares()}const CFG_PERFIS=[{id:"proj+obra",label:"Projeto + Obra AW",desc:"Processo completo com projeto e execução de obra pela AW.",padrao:!0,hasProj:!0,hasObra:!0},{id:"apenas-proj",label:"Apenas Projeto AW",desc:"Somente desenvolvimento de projeto, sem obra.",padrao:!1,hasProj:!0,hasObra:!1},{id:"apenas-obra",label:"Apenas Obra AW",desc:"Execução de obra sem projeto arquitetônico AW.",padrao:!1,hasProj:!1,hasObra:!0},{id:"extra-obra",label:"Extra de Obra",desc:"Escopo adicional vinculado a processo já existente.",padrao:!1,hasProj:!1,hasObra:!0},{id:"ato",label:"ATO – Acomp. Técnico",desc:"Acompanhamento técnico sem projeto arquitetônico AW.",padrao:!1,hasProj:!1,hasObra:!0},{id:"garantia",label:"Garantia / Fechamento",desc:"Processo pós-entrega para garantias ou fechamento financeiro.",padrao:!1,hasProj:!1,hasObra:!1}];let CFG_PERFIL_SEL="proj+obra";function cfgRenderPerfil(){const t=document.getElementById("cfg-perfil-lista");t&&(t.innerHTML=CFG_PERFIS.map(t=>`\n <div class="cfg-perfil-row${t.id===CFG_PERFIL_SEL?" sel":""}${t.padrao?" padrao":""}" onclick="cfgSelectPerfil('${t.id}')"><div class="cfg-perfil-dot"></div><div><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);margin-bottom:2px;">${t.label}</div><div style="font-size:10px;color:var(--txt-muted);">${t.desc}</div></div></div>`).join(""))}function cfgSelectPerfil(t){CFG_PERFIL_SEL=t,cfgRenderPerfil(),cfgAplicarPerfil()}function cfgAplicarPerfil(){const t=CFG_PERFIS.find(t=>t.id===CFG_PERFIL_SEL)||CFG_PERFIS[0],e=document.getElementById("mcfg-proj-bloqueado"),o=document.getElementById("mcfg-proj-conteudo"),a=document.getElementById("mcfg-obra-bloqueado"),n=document.getElementById("mcfg-obra-conteudo");e&&(e.style.display=t.hasProj?"none":""),o&&(o.style.display=t.hasProj?"":"none"),a&&(a.style.display=t.hasObra?"none":""),n&&(n.style.display=t.hasObra?"":"none")}const CFG_ENTREGAVEIS=[{id:"lev",label:"LEV",desc:"Levantamento Físico",on:!0},{id:"ep1",label:"EP1",desc:"Estudo Preliminar 1",on:!0},{id:"ep2",label:"EP2",desc:"Estudo Preliminar 2",on:!0},{id:"baseAP",label:"BASE AP",desc:"Emissão Base AP",on:!0},{id:"ap",label:"AP",desc:"AP ARQ Aprovado",on:!0},{id:"compatAP",label:"COMPAT AP",desc:"Compatibilização AP",on:!0},{id:"baseEX",label:"BASE EX",desc:"Emissão Base EX",on:!0},{id:"ex",label:"EX",desc:"EX ARQ Aprovado",on:!0},{id:"aprovCond",label:"COND",desc:"Aprovação Condomínio",on:!0}];let _nFasesProj=1,_cfgAndarModo="inteiro",_cfgEntregaveis={};function cfgInitEntregaveis(){_cfgEntregaveis={},CFG_ENTREGAVEIS.forEach(t=>{_cfgEntregaveis[t.id]=Array.from({length:4},()=>t.on)})}function cfgSelectFasesProj(t){for(document.querySelectorAll("#cfg-seg-nproj .cfg-seg-btn").forEach(t=>t.classList.remove("sel")),t.classList.add("sel"),_nFasesProj=parseInt(t.dataset.n)||1,ESTADO.cfg.nProj=_nFasesProj;ESTADO.cfg.projFases.length<_nFasesProj;)ESTADO.cfg.projFases.push({etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""});ESTADO.cfg.projFases.length=_nFasesProj,cfgBuildEntregaveis(),cfgBuildAndaresTable(),cfgBuildVinculoObraProj(),motorRecalc(),"function"==typeof gRender&&gRender()}const ATIVS_DEF_ARQ=[{id:"lev",nome:"Lev. Físico",du:3,arqDia:1,hDir:0,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"ep1",nome:"EP1",du:2,arqDia:1,hDir:4,hGer:2,padrao:!0,aprovaCliente:true,diasAprova:1},{id:"ep2",nome:"EP2",du:10,arqDia:1,hDir:8,hGer:2,padrao:!0,aprovaCliente:true,diasAprova:1},{id:"baseAP",nome:"Base AP",du:1,arqDia:1,hDir:0,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"ap",nome:"AP ARQ",du:10,arqDia:1,hDir:4,hGer:2,padrao:!0,aprovaCliente:true,diasAprova:1},{id:"compatAP",nome:"Compat AP",du:2,arqDia:1,hDir:4,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"baseEX",nome:"Base EX",du:1,arqDia:1,hDir:0,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"ex",nome:"EX ARQ",du:8,arqDia:1,hDir:4,hGer:2,padrao:!0,aprovaCliente:true,diasAprova:1},{id:"compatEX",nome:"Compat EX",du:2,arqDia:1,hDir:4,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"aprovCond",nome:"Aprov. Cond.",du:10,arqDia:0,hDir:0,hGer:0,padrao:!0,aprovaCliente:false,diasAprova:1}],ATIVS_DEF_TEC=[{id:"koTec",nome:"Kickoff Proj. Téc.",du:1,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"epTec",nome:"EP Técnicos",du:10,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"apTec",nome:"AP Técnicos",du:10,padrao:!0,aprovaCliente:false,diasAprova:1},{id:"exTec",nome:"EX Técnicos",du:10,padrao:!0,aprovaCliente:false,diasAprova:1}],ATIVS_DEF_OBRA=[{id:"eletrica",nome:"Elétrica",padrao:!0},{id:"ac",nome:"Ar Condicionado",padrao:!0},{id:"gesso",nome:"Gesso / Drywall",padrao:!0},{id:"civil",nome:"Civil",padrao:!0},{id:"spk",nome:"SPK / Hidrante",padrao:!0},{id:"sdai",nome:"SDAI / Detecção",padrao:!0},{id:"dados",nome:"Dados / TI",padrao:!0},{id:"pintura",nome:"Pintura",padrao:!0},{id:"forro",nome:"Forro Modular",padrao:!0},{id:"piso",nome:"Piso / Carpete",padrao:!0},{id:"marcenaria",nome:"Marcenaria",padrao:!0},{id:"vidros",nome:"Vidros / DPT",padrao:!0},{id:"mobiliario",nome:"Mobiliário",padrao:!0},{id:"multimidia",nome:"Multimídia",padrao:!0}];let _ativListas={arq:ATIVS_DEF_ARQ.map(t=>({...t})),tec:ATIVS_DEF_TEC.map(t=>({...t})),obra:ATIVS_DEF_OBRA.map(t=>({...t}))};function getLimiteArq(){return Math.max(1,parseInt(ESTADO.cfg?.limiteArq)||5)}function getSubIds(){return _ativListas.arq.map(t=>t.id)}function getSubNames(){const t={};return _ativListas.arq.forEach(e=>{t[e.id]=e.nome}),t}function getSubLens(){return _ativListas.arq.map(t=>t.du)}function getSubDefRel(){return _ativListas.arq.map((t,e)=>{if(!t.padrao)return"FI";const o=ATIVS_DEF_ARQ.findIndex(e=>e.id===t.id);return o>=0&&["FI","FI","FI","II","FI","FI","FI","II","FI","II"][o]||"FI"})}function getSubDefSrc(){return _ativListas.arq.map((t,e)=>{if(!t.padrao||0===e)return null;const o=ATIVS_DEF_ARQ.findIndex(e=>e.id===t.id);if(o<0)return null;const a=[null,null,null,2,2,null,null,5,null,6][o];if(null===a)return null;const n=ATIVS_DEF_ARQ[a]?.id;if(!n)return null;const r=_ativListas.arq.findIndex(t=>t.id===n);return r>=0?r:null})}function getTecIds(){return _ativListas.tec.map(t=>t.id)}function getTecNames(){const t={};return _ativListas.tec.forEach(e=>{t[e.id]=e.nome}),t}function getTecLens(){return _ativListas.tec.map(t=>t.du)}function getDiscDefs(){return _ativListas.obra.map(t=>{const e=DISC_DEFS.find(e=>e.id===t.id);return e?{...e,label:t.nome}:{id:t.id,label:t.nome,start:1,end:8,tasks:[]}})}function ativSincronizarG(){G.SUB_IDS=getSubIds(),G.SUB_NAMES=getSubNames(),G.SUB_LENS=getSubLens(),G.SUB_DEF_REL=getSubDefRel(),G.SUB_DEF_SRC=getSubDefSrc(),G.TEC_IDS=getTecIds(),G.TEC_NAMES=getTecNames(),G.TEC_LENS=getTecLens(),(gSt?.projFases||[]).forEach(t=>{["arq"].forEach(e=>{const o="arq"===e?G.SUB_IDS:G.TEC_IDS,a=t.rows[e].subs,n=Object.values(a).reduce((t,e)=>e?.end&&G.ms(e.end)>G.ms(t)?e.end:t,t.rows[e].end||new Date);o.forEach(t=>{a[t]||(a[t]={start:G.clone(n),end:G.clone(n)})}),Object.keys(a).forEach(t=>{o.includes(t)||delete a[t]})});const e=G.SUB_IDS.length;if(t.chains.arq.length!==e-1){const o=t.chains.arq;t.chains.arq=Array(e-1).fill(!0).map((t,e)=>o[e]??!1)}if(t.chainTypes?.arq?.length!==e){const o=t.chainTypes?.arq||[];t.chainTypes||(t.chainTypes={}),t.chainTypes.arq=Array(e).fill("FI").map((t,e)=>o[e]??"FI")}if(t.chainSrc?.arq?.length!==e){const o=t.chainSrc?.arq||[];t.chainSrc||(t.chainSrc={}),t.chainSrc.arq=Array(e).fill(null).map((t,e)=>o[e]??null)}});const t=getDiscDefs(),e=t.map(t=>t.id);(gSt?.obraFases||[]).forEach((o,oIdx)=>{
  // Se a fase tem template vinculado E já tem disciplinas, não sobrescrever
  const cfgFase=ESTADO.cfg?.obraFases?.[oIdx];
  const temTemplate=!!(cfgFase?.templateId);
  const a=o.disciplinas||[];
  if(temTemplate && a.length>0){
    // Só atualizar labels, não adicionar disciplinas novas do padrão
    t.forEach(t=>{const e=a.find(e=>e.id===t.id);if(e)e.label=t.label;});
  } else {
    // Sem template: comportamento original — adiciona disciplinas faltantes do padrão
    t.forEach(t=>{const e=a.find(e=>e.id===t.id);e?e.label=t.label:a.push({id:t.id,label:t.label,ativo:!0,start:t.start??1,end:t.end??8,tasks:(t.tasks||[]).map(t=>({n:t.n,prep:t.prep,prof:t.prof||0,m:{...t.m}}))})});
  }
  // Só reordenar pela ordem do DISC_DEFS se a fase não tem template
  if(!temTemplate){
    o.disciplinas=e.map(t=>a.find(e=>e&&e.id===t)).filter(t=>null!=t);
  } else {
    o.disciplinas=a; // Manter a ordem e composição do template
  }
})}window.ativSetAloc=function(t,e,o,a){const n=Math.max(0,parseInt(a)||0);_ativListas[t][e][o]=n;const r=_ativListas[t][e];(gSt?.projFases||[]).forEach(t=>{const e=`${t.id}/arq/${r.id}`;ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}}),ESTADO.equipeARQ.cotas||(ESTADO.equipeARQ.cotas={});const a=ESTADO.equipeARQ.cotas[e]||{};if("hDir"===o&&(a.dir=n),"hGer"===o&&(a.ger=n),ESTADO.equipeARQ.cotas[e]=a,"arqDia"===o){ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});const e=`${t.id}/arq/${r.id}`;ESTADO.alocacaoARQ[e]?ESTADO.alocacaoARQ[e].default=n:ESTADO.alocacaoARQ[e]={default:n,override:{}}}}),salvarDados()};let _ativGrupo="arq",_ativEditId=null,_ativShowAdd={arq:!1,tec:!1,obra:!1},_ativDragIdx=null,_ativPendDel=null;const ATIV_RAMP={arq:["#5A8ACC","#4A7ABE","#3A6AAF","#2E5E9E","#24528E","#1A467E","#123A6E","#0C2E5E","#08244E","#041A3E","#6090D8","#507ABF","#3A68AA"],tec:["#5AAA8A","#4A9A7A","#3A8A6A","#348062","#2E765A","#286C52","#22624A","#1C5840"],obra:["#7A4A10","#8A5618","#9A6220","#AA6E28","#BA7A30","#CA8638","#DA9240","#C07828","#B06820","#A05818","#904810","#803808","#702808","#602000"]},ATIV_MOM={arq:"#1A5294",tec:"#2A7A5A",obra:"#7A4A10"};function ativSwitchGrupo(t){_ativGrupo=t,document.querySelectorAll(".ativ-gtab").forEach((e,o)=>{e.classList.toggle("active",["arq","tec"][o]===t)}),["arq","tec"].forEach(e=>{const o=document.getElementById("ativ-pane-"+e);o&&(o.style.display=e===t?"block":"none")}),ativRender(t)}function ativRender(t){const e=document.getElementById("ativ-pane-"+t);if(!e)return;const o=_ativListas[t],a="obra"!==t,n=ATIV_MOM[t],r=ATIV_RAMP[t],i="arq"===t||"tec"===t?_nFasesProj||1:0,s=["#1A5294","#2A5AA8","#8A3AA8","#2A8A5A"];let d="";"arq"===t&&(d+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">',d+='<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);white-space:nowrap;">Fases de projeto</span>',d+='<div class="cfg-seg-row" id="cfg-seg-nproj" style="margin:0;">',[1,2,3,4].forEach(t=>{d+=`<button class="cfg-seg-btn${t===(_nFasesProj||1)?" sel":""}" data-n="${t}" onclick="cfgSelectFasesProj(this)">${1===t?"Única":t+"F"}</button>`}),d+="</div></div>");let l="";if(i>1?(l=Array.from({length:i},(t,e)=>`<span style="width:32px;text-align:center;font-size:9px;font-weight:700;color:${s[e%s.length]};flex-shrink:0;white-space:nowrap;">${gSt?.projFases?.[e]?.nome?.trim()||`F${e+1}`}</span>`).join(""),d+='<div style="display:flex;align-items:center;gap:6px;padding:0 8px 6px;margin-bottom:2px;">',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="flex:1;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);">Atividade</span>',a&&(d+='<span style="width:50px;text-align:center;font-size:9px;font-weight:700;color:var(--txt-dim);flex-shrink:0;">DU</span>'),"arq"===t&&(d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#185FA5;flex-shrink:0;">Arq/dia</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#534AB7;flex-shrink:0;">Dir.(h)</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#0F6E56;flex-shrink:0;">Ger.(h)</span>'),d+=l,d+='<span style="width:20px;flex-shrink:0;"></span>',d+="</div>"):"arq"===t&&(d+='<div style="display:flex;align-items:center;gap:6px;padding:0 8px 5px;margin-bottom:2px;border-bottom:1px solid var(--border);">',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="flex:1;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);">Atividade</span>',d+='<span style="width:50px;text-align:center;font-size:9px;font-weight:700;color:var(--txt-dim);flex-shrink:0;">DU</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#185FA5;flex-shrink:0;">Arq/dia</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#534AB7;flex-shrink:0;">Dir. (h)</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#0F6E56;flex-shrink:0;">Ger. (h)</span>',d+='<span style="width:20px;flex-shrink:0;"></span>',d+="</div>"),d+='<div class="ativ-list-hdr">',d+=`<span class="ativ-list-hdr-lbl">${o.length} ${"obra"===t?"disciplinas":"atividades"}${a?" · "+o.reduce((t,e)=>t+e.du,0)+" DU":""}</span>`,_ativShowAdd[t]||(d+=`<button class="ativ-btn-add" onclick="ativMostrarAdd('${t}')">+ Adicionar</button>`),d+=`</div><div class="ativ-list" id="ativ-list-${t}">`,o.forEach((e,o)=>{d+=`<div class="ativ-item" draggable="true" ondragstart="ativDragStart(event,'${t}',${o})" ondragover="ativDragOver(event,'${t}',${o})" ondrop="ativDrop(event,'${t}',${o})" ondragend="ativDragEnd('${t}')" id="ativ-item-${t}-${o}">`,d+='<span class="ativ-drag-handle" title="Arrastar">⠿</span>',d+=`<div class="ativ-num" style="background:${n}">${o+1}</div>`,d+=_ativEditId===t+"-"+o?`<input class="ativ-nome-inp" id="ativ-inp-${t}-${o}" value="${e.nome.replace(/"/g,"\"")}" onblur="ativConfirmarRename('${t}',${o})" onkeydown="ativRenameKey(event,'${t}',${o})" onclick="event.stopPropagation()">`:`<span class="ativ-nome" onclick="ativIniciarRename('${t}',${o})" title="Clique para renomear">${e.nome}</span>`,e.padrao&&i<=1&&"arq"!==t&&(d+='<span class="ativ-badge-def">padrão</span>'),a&&(d+=`<div class="ativ-du-wrap" style="flex-shrink:0;width:50px;justify-content:center;"><input class="ativ-du-inp" type="number" min="1" max="999" value="${e.du}" onchange="ativDuChange('${t}',${o},this.value)" onclick="event.stopPropagation()"></div>`),"arq"===t&&(d+=`<input type="number" min="0" max="20" value="${e.arqDia??1}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'arqDia',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #B5D4F4;border-radius:4px;padding:3px 4px;text-align:center;background:#EEF2FA;color:#0C447C;">`,d+=`<input type="number" min="0" max="999" value="${e.hDir??0}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'hDir',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #AFA9EC;border-radius:4px;padding:3px 4px;text-align:center;background:#F5F0FC;color:#3C3489;">`,d+=`<input type="number" min="0" max="999" value="${e.hGer??0}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'hGer',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #5DCAA5;border-radius:4px;padding:3px 4px;text-align:center;background:#E8F6F0;color:#085041;">`),i>1&&Array.from({length:i},(t,o)=>{const a=!1!==_cfgEntregaveis[e.id]?.[o],n=s[o%s.length];d+=`<div class="cfg-mx-cb${a?" on":""}" style="flex-shrink:0;width:18px;height:18px;border-color:${n};${a?"background:"+n+";border-color:"+n+";":""}cursor:pointer;" onclick="ativToggleFase('${e.id}',${o},this,'${n}')" title="Fase ${o+1}${a?": ativo":": inativo"}"></div>`}),d+=`<button class="ativ-btn-del" onclick="ativPedirRemover('${t}',${o})" title="Remover">✕</button>`,d+="</div>"}),d+="</div>",i>1&&("arq"===t||"tec"===t)&&(d+='<div style="display:flex;justify-content:flex-end;margin-top:6px;"><button onclick="cfgReplicarFase1()" style="padding:4px 10px;background:var(--accent);color:#fff;border:none;border-radius:4px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.04em;">Replicar F1 → demais ▶</button></div>'),_ativShowAdd[t]&&(d+=`<div class="ativ-add-form"><input type="text" id="ativ-add-nome-${t}" placeholder="Nome da atividade..." onkeydown="ativAddKey(event,'${t}')">`,a&&(d+=`<input type="number" id="ativ-add-du-${t}" value="5" min="1" max="999" title="Duração em DU">`),d+=`<button class="ativ-btn-ok" onclick="ativConfirmarAdd('${t}')">+ Adicionar</button><button class="ativ-btn-cancel" onclick="ativCancelarAdd('${t}')">✕</button></div>`),a&&o.length>0){const t=o.reduce((t,e)=>t+e.du,0);d+=`<div class="ativ-preview"><div class="ativ-preview-lbl">Sequência — ${t} DU</div><div class="ativ-preview-strip">`,o.forEach((e,o)=>{const a=(e.du/t*100).toFixed(1),n=a>8?e.nome.substring(0,a>14?10:5)+"…":"";d+=`<div class="ativ-preview-seg" style="flex:${e.du};background:${r[o%r.length]};" title="${e.nome} — ${e.du} DU (${a}%)">${n}</div>`}),d+="</div></div>"}if(e.innerHTML=d,_ativEditId){const t=_ativEditId.split("-"),e=document.getElementById("ativ-inp-"+t[0]+"-"+t[1]);e&&(e.focus(),e.select())}if(_ativShowAdd[t]){const e=document.getElementById("ativ-add-nome-"+t);e&&e.focus()}}function ativMostrarAdd(t){_ativShowAdd[t]=!0,ativRender(t)}function ativCancelarAdd(t){_ativShowAdd[t]=!1,ativRender(t)}function ativConfirmarAdd(t){const e=document.getElementById("ativ-add-nome-"+t),o=e?.value?.trim();if(!o)return;const a=document.getElementById("ativ-add-du-"+t),n=parseInt(a?.value)||5;_ativListas[t].push({id:"custom_"+Date.now(),nome:o,du:n,padrao:!1}),_ativShowAdd[t]=!1,ativSincronizarG(),ativRender(t),motorRecalc(),gRender()}function ativAddKey(t,e){"Enter"===t.key&&ativConfirmarAdd(e),"Escape"===t.key&&ativCancelarAdd(e)}function ativIniciarRename(t,e){_ativEditId=t+"-"+e,ativRender(t)}function ativConfirmarRename(t,e){const o=document.getElementById("ativ-inp-"+t+"-"+e);if(!o)return;const a=o.value.trim();a&&(_ativListas[t][e].nome=a),_ativEditId=null,ativSincronizarG(),ativRender(t),gRender()}function ativRenameKey(t,e,o){"Enter"===t.key&&ativConfirmarRename(e,o),"Escape"===t.key&&(_ativEditId=null,ativRender(e))}function ativDuChange(t,e,o){_ativListas[t][e].du=Math.max(1,parseInt(o)||1),ativSincronizarG(),motorRecalc(),gRender()}function ativPedirRemover(t,e){const o=_ativListas[t][e],a=e>0&&e<_ativListas[t].length-1;_ativPendDel={g:t,idx:e},document.getElementById("ativ-dialog-body").innerHTML=`Remover <strong>${o.nome}</strong>?`+(a?"<br><br>Esta atividade tem atividades antes e depois. Como tratar os vínculos?":"<br><br>Esta atividade não tem vizinhos vinculados."),document.getElementById("ativ-btn-recon").style.display=a?"":"none",document.getElementById("ativ-btn-livre").textContent=a?"Remover vínculo":"Remover",document.getElementById("ativ-dialog-del").classList.add("open")}function ativFecharDialog(){document.getElementById("ativ-dialog-del").classList.remove("open"),_ativPendDel=null,document.getElementById("ativ-btn-recon").style.display="",document.getElementById("ativ-btn-livre").textContent="Remover vínculo"}function ativConfirmarDel(t){if(!_ativPendDel)return;const{g:e,idx:o}=_ativPendDel;_ativListas[e].splice(o,1),ativFecharDialog(),ativSincronizarG(),ativRender(e),motorRecalc(),gRender()}function ativDragStart(t,e,o){_ativDragIdx=o,t.currentTarget.classList.add("ativ-dragging"),t.dataTransfer.effectAllowed="move"}function ativDragOver(t,e,o){t.preventDefault(),document.querySelectorAll(`#ativ-list-${e} .ativ-item`).forEach(t=>t.classList.remove("ativ-drag-over")),o!==_ativDragIdx&&document.getElementById(`ativ-item-${e}-${o}`)?.classList.add("ativ-drag-over")}function ativDrop(t,e,o){if(t.preventDefault(),null===_ativDragIdx||_ativDragIdx===o)return;const a=_ativListas[e].splice(_ativDragIdx,1)[0];_ativListas[e].splice(o,0,a),_ativDragIdx=null,ativSincronizarG(),ativRender(e),motorRecalc(),gRender()}function ativDragEnd(t){_ativDragIdx=null,document.querySelectorAll(`#ativ-list-${t} .ativ-item`).forEach(t=>t.classList.remove("ativ-dragging","ativ-drag-over"))}function ativResetarPadrao(){confirm("Restaurar atividades padrão A|W? Atividades customizadas serão removidas.")&&(_ativListas={arq:ATIVS_DEF_ARQ.map(t=>({...t})),tec:ATIVS_DEF_TEC.map(t=>({...t})),obra:ATIVS_DEF_OBRA.map(t=>({...t}))},ativSincronizarG(),ativRender(_ativGrupo),motorRecalc(),gRender())}function ativInitEditor(t){if("obra"===t)return void ativRender("obra");_ativGrupo="arq",document.querySelectorAll(".ativ-gtab").forEach((t,e)=>{t.classList.toggle("active",0===e)}),["arq","tec"].forEach((t,e)=>{const o=document.getElementById("ativ-pane-"+t);o&&(o.style.display=0===e?"block":"none"),ativRender(t)});const e=document.getElementById("cfg-limite-arq");e&&(e.value=ESTADO.cfg?.limiteArq??5)}window.ativToggleFase=function(t,e,o,a){_cfgEntregaveis[t]||(_cfgEntregaveis[t]=Array(4).fill(!0)),_cfgEntregaveis[t][e]=!_cfgEntregaveis[t][e];const n=_cfgEntregaveis[t][e];o.classList.toggle("on",n),o.style.background=n?a:"",o.style.borderColor=a};let _alocDs=null,_alocDefault=1,_alocOverride={};const HORAS_DIA=8;function _alocKey(t){return`${t.phId}/${t.rowId}/${t.subId||"_row"}`}function alocGetDia(t){return void 0!==_alocOverride[t]?_alocOverride[t]:_alocDefault}function alocSalvar(){if(!_alocDs)return;ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});const t=_alocKey(_alocDs);ESTADO.alocacaoARQ[t]={default:_alocDefault,override:{..._alocOverride}};
  // Forçar save das cotas Dir/Ger com valores atuais do DOM
  const _s=`${_alocDs.phId}/${_alocDs.rowId}/${_alocDs.subId||'_row'}`;
  const _dir=parseFloat(document.getElementById('aloc-dir')?.value)||0;
  const _ger=parseFloat(document.getElementById('aloc-ger')?.value)||0;
  ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}});
  ESTADO.equipeARQ.cotas||(ESTADO.equipeARQ.cotas={});
  ESTADO.equipeARQ.cotas[_s]={dir:_dir,ger:_ger};
  salvarDados(),gClosePop(),"function"==typeof earqBuildTable&&(earqBuildTable(),earqRecalc())}function alocHtml(t){const e=gSt.projFases.find(e=>e.id==t.phId);if(!e)return"";const o=e.rows[t.rowId]?.subs?.[t.subId];if(!o)return"";const a=_alocKey(t),n=ESTADO.alocacaoARQ?.[a],r=_ativListas.arq.find(e=>e.id===t.subId);_alocDefault=n?.default??r?.arqDia??1,_alocOverride=n?.override?{...n.override}:{};
  // Dias de aprovação: override padrão = 0 (sem arquiteto)
  if(t&&t.subId){
    var _aprDias=getDiasAprovacao(t.subId);
    _aprDias.forEach(function(_dk){
      // Seta 0 se: sem override, ou override igual ao padrão (não foi ajuste manual)
      var _cur=_alocOverride[_dk];
      if(void 0===_cur||_cur===_alocDefault){
        _alocOverride[_dk]=0;
        ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});
        ESTADO.alocacaoARQ[a]||(ESTADO.alocacaoARQ[a]={default:_alocDefault,override:{}});
        ESTADO.alocacaoARQ[a].override[_dk]=0;
      }
    });
  }const i=ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}});
  const s=`${t.phId}/${t.rowId}/${t.subId}`;
  // Garantir que cotas tem os valores padrão ao abrir (se ainda não foram salvos)
  if(!i.cotas) i.cotas={};
  if(!i.cotas[s]){
    i.cotas[s]={dir:r?.hDir??0,ger:r?.hGer??0};
    salvarDados();
  }
  const d=i.cotas[s],l=d??{dir:r?.hDir??0,ger:r?.hGer??0},c="arq"===t.rowId?COR.ARQ_MOM:COR.TEC_MOM,p="tec"===t.rowId?G.TEC_NAMES[t.subId]||t.subId:G.SUB_NAMES[t.subId]||t.subId,dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),f=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],u=[1,2,3,4,5,6,0],g=[];let m=new Date(o.start);const b=new Date(o.end),x=m.getDay();let h=G.addD(m,-(0===x?6:x-1));for(;h<=b;){const t=[];for(let e=0;e<7;e++){const e=new Date(h),a=e>=new Date(o.start)&&e<=b;t.push({dt:e,inRange:a,dk:dkFmt(e)}),h=G.addD(h,1)}g.push(t)}const A=[];g.forEach(t=>t.forEach(t=>{t.inRange&&0!==t.dt.getDay()&&6!==t.dt.getDay()&&!CALENDARIO.isNaoUtil(t.dt)&&A.push(t.dk)}));const y=u.map(t=>`<div style="width:34px;flex-shrink:0;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;color:${0===t||6===t?"#D0D4DA":"#8A95A8"};padding-bottom:3px;">${f[t]}</div>`).join("");let E="";g.forEach(t=>{const e=u.map(e=>{const o=t.find(t=>t.dt.getDay()===e);if(!o||!o.inRange)return'<div style="width:34px;flex-shrink:0;height:32px;border:1px solid #F0F2F4;border-radius:4px;background:#FAFAFA;"></div>';const a=0===e||6===e,n=CALENDARIO.isNaoUtil(o.dt);if(a||n)return`<div style="width:34px;flex-shrink:0;height:32px;border:1px solid #EEEEEE;border-radius:4px;background:#F8F8F8;display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-size:9px;color:#D0D4DA;">${o.dt.getDate()}</span></div>`;const r=alocGetDia(o.dk),i=void 0!==_alocOverride[o.dk],_z=r===0,s=i?(_z?"#8A9BB0":"#1A5294"):"#EEF2FA",d=i?(_z?"#7A8BA0":"#1A5294"):"#B5D4F4",l=i?(_z?"rgba(255,255,255,.5)":"#fff"):(_z?"#C0C8D8":"#1A5294");return`<div onclick="alocToggleDia('${o.dk}')" title="${o.dt.toLocaleDateString("pt-BR")}" style="width:34px;flex-shrink:0;height:32px;border:1px solid ${d};border-radius:4px;background:${s};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;" id="aloc-cell-${o.dk}"><span style="font-size:8px;color:${i?"rgba(255,255,255,.6)":"#8A95A8"};">${o.dt.getDate()}</span><span style="font-size:12px;font-weight:800;color:${l};line-height:1;">${_z?"—":r}</span></div>`}).join("");E+=`<div style="display:flex;gap:2px;margin-bottom:2px;">${e}</div>`});const D=A.reduce((t,e)=>t+alocGetDia(e),0),w=8*D,S=A.length?(D/A.length).toFixed(1):"0";return` <div class="aloc-hdr" style="border-bottom:1px solid #EEF0F4;padding-bottom:10px;margin-bottom:10px;"><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><circle cx="4.5" cy="3.5" r="2"/><path d="M0.5 10c0-2.2 1.8-4 4-4"/><circle cx="9.5" cy="3.5" r="2"/><path d="M6.5 10c0-2.2 1.8-4 4-4"/></svg><span class="aloc-hdr-title" style="color:${c};">${p}</span><span style="font-size:9px;color:#8A95A8;">${G.fmtBR(o.start)} – ${G.fmtBR(o.end)} · ${A.length} DU</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;"><div style="background:#F5F0FC;border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;color:#534AB7;flex:1;">Diretoria</span><input type="number" id="aloc-dir" value="${l.dir}" min="0" step="1" oninput="alocSaveCota('${s}')" style="width:44px;font-family:var(--font);font-size:12px;font-weight:700;border:1px solid #AFA9EC;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#3C3489;"><span style="font-size:9px;color:#7F77DD;">h</span></div><div style="background:#E8F6F0;border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;color:#0F6E56;flex:1;">Gerente ARQ</span><input type="number" id="aloc-ger" value="${l.ger}" min="0" step="1" oninput="alocSaveCota('${s}')" style="width:44px;font-family:var(--font);font-size:12px;font-weight:700;border:1px solid #5DCAA5;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#085041;"><span style="font-size:9px;color:#1D9E75;">h</span></div></div><div class="aloc-default-row"><span class="aloc-default-lbl">Arquitetos — padrão por dia útil</span><div class="aloc-def-ctrl"><button class="aloc-def-btn" onclick="alocMudarDefault(-1)">−</button><span class="aloc-def-val" id="aloc-def-num">${_alocDefault}</span><button class="aloc-def-btn" onclick="alocMudarDefault(1)">+</button><span style="font-size:9px;color:#5A8ACC;margin-left:3px;">arq/dia</span></div></div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;letter-spacing:.06em;margin-bottom:5px;">Ajuste dia a dia</div><div class="aloc-cal-scroll"><div style="display:flex;gap:2px;margin-bottom:3px;">${y}</div><div id="aloc-cal-semanas">${E}</div></div><div class="aloc-legend"><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#EEF2FA;border:1px solid #B5D4F4;"></div>Padrão</div><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#1A5294;"></div>Ajustado</div><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#F8F8F8;border:1px solid #EEE;"></div>Inativo</div></div><div class="aloc-totals" id="aloc-totals"><div class="aloc-total-card"><div class="aloc-total-val" id="aloc-tot-ad">${D}</div><div class="aloc-total-lbl">Arq-dias</div></div><div class="aloc-total-card hl"><div class="aloc-total-val" id="aloc-tot-h">${w}</div><div class="aloc-total-lbl">Horas ARQ</div></div><div class="aloc-total-card"><div class="aloc-total-val" id="aloc-tot-m">${S}</div><div class="aloc-total-lbl">Média/dia</div></div></div><div class="aloc-save"><button class="aloc-btn-cancel" onclick="gClosePop()">Cancelar</button><button class="aloc-btn-save" onclick="alocSalvar()">Salvar</button></div>`}function alocAbrir(t,e){t&&"proj"===t.type&&t.subId&&(_alocDs=t)}function alocFechar(){gClosePop(),_alocDs=null}function alocRefreshCal(){if(!_alocDs)return;const t=gSt.projFases.find(t=>t.id==_alocDs.phId),e=t?.rows?.[_alocDs.rowId]?.subs?.[_alocDs.subId];if(!e)return;const dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),o=[];let a=new Date(e.start);for(;a<=e.end;){const t=dkFmt(a),e=a.getDay(),n=0===e||6===e,r=CALENDARIO.isNaoUtil(a);if(!n&&!r){o.push(t);const e=document.getElementById("aloc-cell-"+t);if(e){const o=void 0!==_alocOverride[t],a=alocGetDia(t),n=o?"#1A5294":"#B5D4F4";e.style.background=o?"#1A5294":"#EEF2FA",e.style.borderColor=n;const r=e.querySelectorAll("span");const _isZero=a===0;r[0]&&(r[0].style.color=o?(_isZero?"rgba(255,255,255,.5)":"rgba(255,255,255,.6)"):"#8A95A8"),r[1]&&(r[1].textContent=_isZero?"—":a,r[1].style.color=o?(_isZero?"rgba(255,255,255,.5)":"#fff"):(_isZero?"#C0C8D8":"#1A5294"));e.style.background=o?(_isZero?"#8A9BB0":"#1A5294"):"#EEF2FA",e.style.borderColor=o?(_isZero?"#7A8BA0":"#1A5294"):"#B5D4F4"}}a=G.addD(a,1)}const n=o.reduce((t,e)=>t+alocGetDia(e),0),r=8*n,i=o.length?(n/o.length).toFixed(1):"0",setEl=(t,e)=>{const o=document.getElementById(t);o&&(o.textContent=e)};setEl("aloc-tot-ad",n),setEl("aloc-tot-h",r),setEl("aloc-tot-m",i)}function alocGetTotais(t,e,o){if(!o)return null;const a=gSt.projFases.find(e=>e.id==t),n=a?.rows?.[e]?.subs?.[o];if(!n)return null;const r=`${t}/${e}/${o}`,i=ESTADO.alocacaoARQ?.[r],s=i?.default??1,d=i?.override??{},dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");let l=0,c=0,p=new Date(n.start);for(;p<=n.end;){if(!CALENDARIO.isNaoUtil(p)){const t=dkFmt(p);l+=void 0!==d[t]?d[t]:s,c++}p=G.addD(p,1)}return{arqDias:l,horas:8*l,nDias:c,media:c?+(l/c).toFixed(1):0}}function cfgBuildEntregaveis(){ativRender("arq"),ativRender("tec");const t=document.getElementById("cfg-andares-modo-wrap");t&&(t.style.display=(_nFasesProj||1)>1?"":"none")}function cfgBuildAndaresTable(){const t=document.getElementById("cfg-andares-wrap");if(!t)return;if(_nFasesProj<=1||0===CFG_ANDARES.length)return t.style.display="none",void(t.innerHTML="");const e=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],o="parcial"===_cfgAndarModo;let a='<th style="background:var(--bg-surface);color:var(--txt-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:8px 14px;text-align:left;border-bottom:1px solid var(--border);">Andar</th>';for(let t=1;t<=_nFasesProj;t++){const o=e[(t-1)%e.length],n=gSt.projFases[t-1]?.nome?.trim()||`Fase ${t}`;a+=`<th style="background:${o};font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;min-width:70px;border-bottom:1px solid ${o};padding:8px 6px;cursor:pointer;" onclick="gEditFaseNome('proj',${t},'${(gSt.projFases[t-1]?.nome||"").replace(/'/g,"")}',this)" title="Clique para renomear"><span style="display:flex;align-items:center;justify-content:center;gap:4px;">${n}<span style="opacity:.7;font-size:10px;">✎</span></span></th>`}let n="";CFG_ANDARES.forEach(t=>{let a=`<td style="padding:7px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--txt);">${t}</td>`;for(let t=1;t<=_nFasesProj;t++){const n=e[(t-1)%e.length];if(o){const e=1===t;a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:6px;"><div class="cfg-mx-cb${e?" on":""}" onclick="this.classList.toggle('on')" style="border-color:${n};${e?"background:"+n+";border-color:"+n+";":""}"></div></td>`}else a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:6px;"><div onclick="cfgAndarRadioClick(this,${t})" style="width:18px;height:18px;border-radius:50%;border:2px solid ${n};margin:auto;cursor:pointer;background:${1===t?n:"transparent"};transition:all .15s;" data-fase="${t}"></div></td>`}n+=`<tr>${a}</tr>`}),t.style.display="",t.innerHTML=`<div class="cfg-card"><div class="cfg-card-hdr"><div><div class="cfg-card-title">Distribuição de andares por fase</div><div class="cfg-card-desc">${o?"Selecione todas as fases com trabalho em cada andar":"Selecione em qual fase cada andar será desenvolvido"}</div></div></div><div style="overflow-x:auto;"><table class="cfg-matrix-table"><thead><tr>${a}</tr></thead><tbody>${n}</tbody></table></div></div>`}window.alocSaveCota=function(t){ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}}),ESTADO.equipeARQ.cotas||(ESTADO.equipeARQ.cotas={});const e=parseFloat(document.getElementById("aloc-dir")?.value)||0,o=parseFloat(document.getElementById("aloc-ger")?.value)||0;ESTADO.equipeARQ.cotas[t]={dir:e,ger:o}},window.alocToggleDia=function(t){const e=getLimiteArq(),o=alocGetDia(t),a=o>=e?0:o+1;a===_alocDefault?delete _alocOverride[t]:_alocOverride[t]=a,alocRefreshCal()},window.alocMudarDefault=function(t){_alocDefault=Math.max(0,_alocDefault+t),document.getElementById("aloc-def-num").textContent=_alocDefault,alocRefreshCal()},window.cfgToggleEntregavel=function(t,e,o){_cfgEntregaveis[t]||(_cfgEntregaveis[t]=Array(4).fill(!0)),_cfgEntregaveis[t][e]=!_cfgEntregaveis[t][e],o.classList.toggle("on",_cfgEntregaveis[t][e])},window.cfgReplicarFase1=function(){_ativListas.arq.forEach(t=>{const e=!1!==_cfgEntregaveis[t.id]?.[0];for(let o=1;o<_nFasesProj;o++)_cfgEntregaveis[t.id]||(_cfgEntregaveis[t.id]=Array(4).fill(!0)),_cfgEntregaveis[t.id][o]=e}),ativRender("arq")},window.cfgSetAndarModo=function(t){_cfgAndarModo=t,document.getElementById("cfg-andar-modo-sim")?.classList.toggle("sel","inteiro"===t),document.getElementById("cfg-andar-modo-nao")?.classList.toggle("sel","parcial"===t),cfgBuildAndaresTable()},window.cfgAndarRadioClick=function(t,e){const o=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],a=t.closest("tr");a&&(a.querySelectorAll("[data-fase]").forEach(t=>{t.style.background="transparent"}),t.style.background=o[(e-1)%o.length])};let _nFasesObra=1;function cfgSelectFasesObra(t){for(document.querySelectorAll("#cfg-seg-nobra .cfg-seg-btn").forEach(t=>t.classList.remove("sel")),t.classList.add("sel"),_nFasesObra=parseInt(t.dataset.n)||1,ESTADO.cfg.nObra=_nFasesObra;ESTADO.cfg.obraFases.length<_nFasesObra;)ESTADO.cfg.obraFases.push({inicio:"",prazo:"56",andares:"",preObra:{ativo:false,templateId:"pre-obra-padrao",du:5}});ESTADO.cfg.obraFases.length=_nFasesObra,cfgBuildVinculoObraProj(),renderObraFases(),motorRecalc(),"function"==typeof gRender&&gRender()}function cfgBuildVinculoObraProj(){const t=document.getElementById("cfg-vinculo-obra-wrap");if(!t)return;const e=document.getElementById("cfg-vinculo-obra-proj")?.checked;if(!e||_nFasesProj<=1)return void(t.style.display="none");t.style.display="";const o=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"];let a='<th style="background:var(--bg-surface);color:var(--txt-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:7px 12px;text-align:left;border-bottom:1px solid var(--border);">Fase Obra</th>';for(let t=1;t<=_nFasesProj;t++){const e=o[(t-1)%o.length];a+=`<th style="background:${e};font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;min-width:70px;border-bottom:1px solid ${e};padding:7px 6px;" title="Nome herdado da aba Arquitetura">${gSt.projFases[t-1]?.nome?.trim()||`ARQ ${t}`}</th>`}let n="";for(let t=1;t<=_nFasesObra;t++){const e=gSt.obraFases[t-1]?.nome?.trim()||`Obra ${t}`;let a=`<td style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--txt);cursor:pointer;white-space:nowrap;" onclick="gEditFaseNome('obra',${t},'${(gSt.obraFases[t-1]?.nome||"").replace(/'/g,"")}',this)" title="Clique para renomear"><span style="display:flex;align-items:center;gap:5px;">${e}<span style="opacity:.5;font-size:10px;">✎</span></span></td>`;for(let e=1;e<=_nFasesProj;e++){const n=o[(e-1)%o.length];a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:5px;"><div onclick="cfgVinculoObraClick(this,${t},${e})" data-fo="${t}" data-fp="${e}" style="width:18px;height:18px;border-radius:50%;border:2px solid ${n};margin:auto;cursor:pointer;background:${t===e?n:"transparent"};transition:all .15s;"></div></td>`}n+=`<tr>${a}</tr>`}t.innerHTML=`<div style="overflow-x:auto;"><table class="cfg-matrix-table"><thead><tr>${a}</tr></thead><tbody>${n}</tbody></table></div>`}window.cfgToggleVinculoObraProj=function(){const t=document.getElementById("cfg-vinculo-obra-proj")?.checked;ESTADO.cfg.vinculoObraProj=!!t,cfgBuildVinculoObraProj(),motorRecalc(),"function"==typeof gRender&&gRender()},window.cfgVinculoObraClick=function(t,e,o){const a=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],n=document.getElementById("cfg-vinculo-obra-wrap");n&&(n.querySelectorAll(`[data-fo="${e}"]`).forEach(t=>t.style.background="transparent"),t.style.background=a[(o-1)%a.length])},window.cfgTogglePreObra=function(){const t=document.getElementById("cfg-pre-obra-on")?.checked,e=document.getElementById("cfg-pre-obra-wrap");e&&(e.style.display=t?"":"none"),ESTADO.cfg.preObra=!!t,ESTADO.cfg.preObraDias=parseInt(document.getElementById("cfg-pre-obra-dias")?.value)||10,"function"==typeof gRender&&gRender()};let _sbCollapsed=!1;function vizSidebarToggle(){_sbCollapsed=!_sbCollapsed,document.querySelectorAll(".viz-sidebar").forEach(t=>t.classList.toggle("collapsed",_sbCollapsed)),document.querySelectorAll(".pane-with-sidebar").forEach(t=>t.classList.toggle("sb-collapsed",_sbCollapsed)),document.querySelectorAll(".viz-sb-toggle-icon").forEach(t=>{t.textContent=_sbCollapsed?"◀":"▶"}),setTimeout(()=>_redrawAbaAtiva(),200)}function vizFitVertical(){if("efetivo"===abaAtiva){const t=document.getElementById("pane-efetivo");if(!t)return;const e=44,o=20,a=4,n=26,r=t.clientHeight-34,i="separado"===_eftModoFases&&gSt.obraFases.length>1;let s=0,d=0;if((i?gSt.obraFases:[gSt.obraFases[0]]).forEach((t,r)=>{i&&(s+=n),s+=e+o+a,r>0&&i&&(s+=12);const l=(t.disciplinas||[]).filter(t=>!1!==t.ativo);d+=l.length}),!d)return;const l=Math.max(10,Math.floor((r-s)/d));_eftRowIdx=EFT_ROW_STEPS.reduce((t,e,o)=>Math.abs(e-l)<Math.abs(EFT_ROW_STEPS[t]-l)?o:t,0),renderEfetivo()}else if("histograma"===abaAtiva){const t=document.getElementById("pane-histograma");if(!t)return;const e="separado"===_histModoFases&&gSt.obraFases.length>1,o=e?gSt.obraFases.length:1,a=Math.max(80,Math.floor((t.clientHeight-38-((76+(e?26:0))*o+(e?12*(o-1):0)))/o));_histHIdx=HIST_H_STEPS.reduce((t,e,o)=>Math.abs(e-a)<Math.abs(HIST_H_STEPS[t]-a)?o:t,0),renderHistograma()}else if("cronograma"===abaAtiva){const t=document.getElementById("gantt-root");if(!t)return;const e=gFasesVinculadas(),o=gSt.projFases.length,a=gSt.obraFases.length;let n=0;n+=3,gSt.projFases.forEach(t=>{(o>1||e)&&(n+=.7),n+=2,t.expanded?.arq&&(n+=Object.keys(t.rows?.arq?.subs||{}).length),t.expanded?.tec&&(n+=Object.keys(t.rows?.tec?.subs||{}).length),e&&(n+=1,gSt.obraFases[t.id-1]?.expanded&&(n+=(gSt.obraFases[t.id-1].disciplinas||[]).filter(t=>!1!==t.ativo).length))}),e||(n+=.5,gSt.obraFases.forEach(t=>{a>1&&(n+=.7),n+=1,t.expanded&&(n+=(t.disciplinas||[]).filter(t=>!1!==t.ativo).length)})),ESTADO.cfg.preObra&&(n+=1),n=Math.max(n,4);const r=Math.max(14,Math.min(52,Math.floor((t.clientHeight-40)/n)));G.ROW_H=r,G.SUB_H=Math.min(r+2,56),gRender()}}function buildVizSidebar(){const t=document.getElementById("viz-sidebar-global");t&&t.remove();const e=document.createElement("div");e.id="viz-sidebar-global",e.className="viz-sidebar"+(_sbCollapsed?" collapsed":""),e.innerHTML=`\n <div class="viz-sb-toggle" onclick="vizSidebarToggle()" title="${_sbCollapsed?"Expandir":"Recolher"} controles"><span class="viz-sb-toggle-icon">${_sbCollapsed?"◀":"▶"}</span></div><div class="viz-sb-groups"><div class="viz-sb-group"><button class="viz-sb-btn accent" onclick="vizFitH()" title="Ajustar colunas à tela">⊡</button><button class="viz-sb-btn" onclick="vizZoomColOut()" title="Reduzir colunas">−</button><button class="viz-sb-btn" onclick="vizZoomColIn()" title="Ampliar colunas">+</button><div class="viz-sb-label">col</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn accent" onclick="vizFitVertical()" title="Ajustar linhas à tela">⊞</button><button class="viz-sb-btn" onclick="vizZoomRowOut()" title="Reduzir linhas">−</button><button class="viz-sb-btn" onclick="vizZoomRowIn()" title="Ampliar linhas">+</button><div class="viz-sb-label">lin</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn" onclick="vizFontOut()" title="Reduzir fonte" style="font-size:10px;">A−</button><button class="viz-sb-btn" onclick="vizFontIn()" title="Aumentar fonte" style="font-size:11px;">A+</button><div class="viz-sb-label">font</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn" onclick="abrirCfgVisuais()" title="Paletas de cores" style="font-size:15px;">◐</button><div class="viz-sb-label">cor</div></div></div>\n `;const o=document.getElementById("tab-content");o&&o.appendChild(e)}function vizFitH(){"cronograma"===abaAtiva?zoomReset():eftZoomFit()}function vizZoomColIn(){"cronograma"===abaAtiva?gZoomIn():eftZoomIn()}function vizZoomColOut(){"cronograma"===abaAtiva?gZoomOut():eftZoomOut()}function vizZoomRowIn(){"cronograma"===abaAtiva?(G.ROW_H=Math.min(G.ROW_H+4,56),G.SUB_H=Math.min(G.SUB_H+4,60),gRender()):"efetivo"===abaAtiva?eftRowZoomIn():"histograma"===abaAtiva&&histHZoomIn()}function vizZoomRowOut(){"cronograma"===abaAtiva?(G.ROW_H=Math.max(G.ROW_H-4,14),G.SUB_H=Math.max(G.SUB_H-4,16),gRender()):"efetivo"===abaAtiva?eftRowZoomOut():"histograma"===abaAtiva&&histHZoomOut()}function vizFontIn(){"cronograma"!==abaAtiva&&eftFontIn()}function vizFontOut(){"cronograma"!==abaAtiva&&eftFontOut()}function abrirModalCfg(t){0===Object.keys(_cfgEntregaveis).length&&cfgInitEntregaveis(),cfgRenderAndares(),cfgRenderPerfil(),cfgAplicarPerfil(),cfgBuildEntregaveis(),cfgBuildAndaresTable(),cfgBuildVinculoObraProj(),renderFeriadosModal();const e=document.getElementById("info-arquivo");if(e){const t=localStorage.getItem("aw_planejamento_v1"),o=t?(t.length/1024).toFixed(1)+" KB":"—";e.innerHTML=`Dados em localStorage: <strong>${o}</strong><br>Última gravação: <strong>${ESTADO.lastSaved||"—"}</strong>`}t&&switchCfgTab(t),document.getElementById("modal-cfg-overlay").classList.add("open")}function fecharModalCfg(t){t&&t.target!==document.getElementById("modal-cfg-overlay")||document.getElementById("modal-cfg-overlay").classList.remove("open")}function switchCfgTab(t){const e=["identificacao","perfil","projeto","obra","feriados","geral"];document.querySelectorAll(".mcfg-tab").forEach((o,a)=>{o.classList.toggle("active",e[a]===t)}),document.querySelectorAll(".mcfg-pane").forEach(e=>{e.classList.toggle("active",e.id==="mcfg-"+t)}),"projeto"===t&&ativInitEditor("proj"),"obra"===t&&(ativInitEditor("obra"),renderObraFases())}function adicionarFeriado(){const t=document.getElementById("feriado-data"),e=document.getElementById("feriado-desc"),o=t.value,a=e.value.trim();o?(ESTADO.feriadosCustom||(ESTADO.feriadosCustom=[]),ESTADO.feriadosCustom.push({data:o,desc:a||"Paralisação"}),t.value="",e.value="",renderFeriadosModal(),onCfgChange()):showToast("Selecione uma data")}function removerFeriado(t){ESTADO.feriadosCustom.splice(t,1),renderFeriadosModal(),onCfgChange()}function renderFeriadosModal(){const t=document.getElementById("lista-feriados-custom");if(!t)return;const e=ESTADO.feriadosCustom||[];t.innerHTML=0===e.length?'<div style="font-size:11px;color:var(--txt-dim);font-family:var(--body);">Nenhuma data adicionada.</div>':e.map((t,e)=>`\n <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-surface2);border-radius:5px;"><span style="font-family:var(--font);font-size:11px;color:var(--accent);min-width:72px;">${t.data.split("-").reverse().join("/")}</span><span style="flex:1;font-size:11px;color:var(--txt);">${t.desc}</span><button onclick="removerFeriado(${e})" style="background:none;border:none;color:var(--txt-muted);cursor:pointer;font-size:14px;padding:0 4px;">✕</button></div>`).join("");const o=document.getElementById("lista-feriados-nacionais");if(o){const t=(new Date).getFullYear(),e=CALENDARIO.getFeriadosAno?CALENDARIO.getFeriadosAno(t):[];o.innerHTML=e.length?e.map(t=>`${t.data} — ${t.nome}`).join("<br>"):'<span style="color:var(--txt-dim);">Calculados automaticamente pelo sistema.</span>'}}let _pAba='cronograma';function abrirModalImpressao(){document.getElementById('modal-print')?.remove();const ov=document.createElement('div');ov.id='modal-print';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;';ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});const cod=ESTADO.meta?.codigo||'';const nome=ESTADO.meta?.nome||'';const titulo=cod&&nome?cod+' \u2014 '+nome:cod||nome||'Planejamento de Obra';ov.innerHTML='<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.5);width:100%;max-width:580px;display:flex;flex-direction:column;overflow:hidden;"><div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg-surface);"><span style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);flex:1;">\uD83D\uDDA8 Imprimir</span><span style="font-size:11px;color:var(--txt-muted);">'+titulo+'</span><button onclick="document.getElementById(\'modal-print\').remove()" style="width:28px;height:28px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:6px;cursor:pointer;font-size:15px;color:var(--txt-muted);">\u2715</button></div><div style="padding:16px;display:flex;flex-direction:column;gap:8px;"><button onclick="_pImp(\'cronograma\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDCC5</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Cronograma</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A3 paisagem \u00b7 todas as fases</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button><button onclick="_pImp(\'efetivo\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDC65</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Efetivo</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A3 paisagem \u00b7 mapa de calor</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button><button onclick="_pImp(\'arquitetura\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDCC0</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Arquitetura</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A4 retrato \u00b7 etapas ARQ e TEC</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button></div></div>';document.body.appendChild(ov);}
function _pImp(aba){_pAba=aba;document.getElementById('modal-print')?.remove();let ps=document.getElementById('_pPageStyle');if(!ps){ps=document.createElement('style');ps.id='_pPageStyle';document.head.appendChild(ps);}ps.textContent=aba!=='arquitetura'?'@media print{@page{size:A3 landscape;margin:8mm;}#_pFrame{display:block!important;}body>*:not(#_pFrame){display:none!important;}}':'@media print{@page{size:A4 portrait;margin:8mm;}#_pFrame{display:block!important;}body>*:not(#_pFrame){display:none!important;}}';let pf=document.getElementById('_pFrame');if(!pf){pf=document.createElement('div');pf.id='_pFrame';pf.style.display='none';document.body.appendChild(pf);}pf.innerHTML='';const cod=ESTADO.meta?.codigo||'';const nome=ESTADO.meta?.nome||'';const hdr='<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#1A2535;flex-shrink:0;"><span style="font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#00DEDB;">'+(cod&&nome?cod+' \u2014 '+nome:cod||nome||'Planejamento de Obra')+'</span><span style="font-family:Oswald,sans-serif;font-size:8px;color:rgba(255,255,255,.35);">'+new Date().toLocaleDateString('pt-BR')+'</span></div>';if(aba==='cronograma'){const src=document.getElementById('gantt-root');if(src&&src.children.length){pf.style.cssText='display:none;width:100%;height:100vh;flex-direction:column;background:#fff;';pf.innerHTML=hdr+'<div style="flex:1;overflow:hidden;">'+src.innerHTML+'</div>';}}else if(aba==='efetivo'){const src=document.getElementById('pane-efetivo');if(src&&src.querySelector('svg')){pf.style.cssText='display:none;width:100%;height:100vh;flex-direction:column;background:#fff;';pf.innerHTML=hdr+'<div style="flex:1;overflow:hidden;">'+src.innerHTML+'</div>';}}else{pf.style.cssText='display:none;width:100%;background:#fff;font-family:Oswald,sans-serif;';let rows='';(gSt.projFases||[]).forEach(fase=>{const nf=fase.nome?.trim()||'Fase '+fase.id;rows+='<tr><td colspan="5" style="padding:5px 8px;font-size:10px;font-weight:700;color:#fff;background:#1A2535;letter-spacing:.06em;">'+nf.toUpperCase()+'</td></tr>';G.SUB_IDS.forEach(id=>{const s=fase.rows.arq?.subs?.[id];if(!s)return;rows+='<tr style="border-bottom:1px solid #F0F2F4;"><td style="padding:3px 8px 3px 14px;font-size:9px;font-weight:700;color:#1A5294;">ARQ</td><td style="padding:3px 8px;font-size:10px;color:#1A2535;">'+(G.SUB_NAMES[id]||id)+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(s.start instanceof Date ? s.start : G.parseD(s.start))+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(s.end instanceof Date ? s.end : G.parseD(s.end))+'</td><td style="padding:3px 8px;font-size:9px;color:#999;text-align:center;">'+CALENDARIO.contarDU(new Date(s.start),new Date(s.end))+' DU</td></tr>';});G.TEC_IDS.forEach(id=>{const s=fase.rows.tec?.subs?.[id];if(!s)return;rows+='<tr style="border-bottom:1px solid #F0F2F4;"><td style="padding:3px 8px 3px 14px;font-size:9px;font-weight:700;color:#2A7A5A;">TEC</td><td style="padding:3px 8px;font-size:10px;color:#1A2535;">'+(G.TEC_NAMES[id]||id)+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(s.start instanceof Date ? s.start : G.parseD(s.start))+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(s.end instanceof Date ? s.end : G.parseD(s.end))+'</td><td style="padding:3px 8px;font-size:9px;color:#999;text-align:center;">'+CALENDARIO.contarDU(new Date(s.start),new Date(s.end))+' DU</td></tr>';});});pf.innerHTML=hdr+'<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#F4F6F8;"><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:left;">Grupo</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:left;">Etapa</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">In\u00edcio</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">T\u00e9rmino</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">Dur.</th></tr></thead><tbody>'+rows+'</tbody></table>';}setTimeout(()=>{window.print();setTimeout(()=>{pf.innerHTML='';pf.style.display='none';},2000);},150);}
document.addEventListener("DOMContentLoaded",()=>{buildVizSidebar()}),document.addEventListener("keydown",t=>{"Escape"===t.key&&fecharModalCfg({target:document.getElementById("modal-cfg-overlay")})});const EARQ_H=8,EARQ_FASE_COLORS=["#185FA5","#2A5AA8","#8A3AA8","#2A8A5A"];function earqGetEstado(){return ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}}),ESTADO.equipeARQ}function earqInit(){const t=earqGetEstado(),e=document.getElementById("earq-ch-arq"),o=document.getElementById("earq-ch-dir"),a=document.getElementById("earq-ch-ger");e&&(e.value=t.chArq??120),o&&(o.value=t.chDir??280),a&&(a.value=t.chGer??180),earqBuildTable(),earqRecalc()}function earqBuildTable(){
  const t=document.getElementById("earq-thead"),e=document.getElementById("earq-tbody"),o=document.getElementById("earq-tfoot");
  // Aplicar max-width no container da tabela
  const _tblWrap=document.getElementById("earq-table-wrap");
  if(_tblWrap) _tblWrap.style.cssText="max-width:1100px;overflow-x:auto;";
  if(!t||!e||!o)return;
  const cod=ESTADO.meta?.codigo||'', nome=ESTADO.meta?.nome||'';
  const proj=cod&&nome?cod+' — '+nome:cod||nome||'';
  // Cabeçalho do relatório (aparece ao imprimir)
  const rptHdr=document.getElementById('earq-rpt-header');
  if(rptHdr){
    const chArq=parseFloat(document.getElementById('earq-ch-arq')?.value)||0;
    const chDir=parseFloat(document.getElementById('earq-ch-dir')?.value)||0;
    const chGer=parseFloat(document.getElementById('earq-ch-ger')?.value)||0;
    rptHdr.innerHTML=`
      <div style="display:flex;align-items:flex-end;justify-content:space-between;border-bottom:3px solid #1A5294;padding-bottom:12px;margin-bottom:4px;">
        <div>
          <div style="font-family:var(--font);font-size:18px;font-weight:700;color:#1A2535;letter-spacing:.04em;text-transform:uppercase;">Equipe de Arquitetura</div>
          <div style="font-family:var(--body);font-size:11px;color:#6A7A8A;margin-top:3px;">${proj?'<strong>'+proj+'</strong> · ':''} Estimativa de alocação e custos</div>
        </div>
        <div style="text-align:right;font-family:var(--body);font-size:9px;color:#8A95A8;line-height:1.6;">
          <div>ch Arq: <strong>R$ ${chArq}/h</strong></div>
          <div>ch Dir: <strong>R$ ${chDir}/h</strong></div>
          <div>ch Ger: <strong>R$ ${chGer}/h</strong></div>
          <div>Emitido: <strong>${new Date().toLocaleDateString('pt-BR')}</strong></div>
        </div>
      </div>`;
  }
  const TH=(t,e="")=>`<th style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:6px 10px;text-align:right;border-bottom:2px solid #C8D4E8;white-space:nowrap;${e}">${t}</th>`;
  const THl=(t,e="")=>TH(t,"text-align:left;"+e);
  t.innerHTML=`<tr style="background:#F0F4FA;">${THl("Atividade","min-width:130px;")} ${THl("Fase","")} ${TH("Início","")} ${TH("Fim","")} ${TH("DU","")} ${TH("arq/dia","background:#E8F0FC;color:#0C447C;")} ${TH("horas ARQ","background:#E8F0FC;color:#0C447C;")} ${TH("cota Dir. (h)","background:#F0EBF8;color:#3C3489;")} ${TH("custo Dir.","background:#F0EBF8;color:#3C3489;")} ${TH("cota Ger. (h)","background:#E4F2EB;color:#085041;")} ${TH("custo Ger.","background:#E4F2EB;color:#085041;")} ${TH("Custo total","")} </tr>`;
  const a=earqGetEstado();let n=earqGetRows();
  e.innerHTML="";let _prevFaseIdx=-1;
  n.forEach((t,idx)=>{
    const n=a.cotas[t.key]||{dir:0,ger:0};
    const r=EARQ_FASE_COLORS[(t.faseIdx??0)%EARQ_FASE_COLORS.length];
    // Separador de fase
    if(t.faseIdx!==_prevFaseIdx){
      _prevFaseIdx=t.faseIdx;
      const faseRow=document.createElement("tr");
      faseRow.innerHTML=`<td colspan="12" style="padding:6px 10px 2px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${r};background:${r}12;border-bottom:1px solid ${r}44;">${t.faseLabel}</td>`;
      e.appendChild(faseRow);
    }
    // Calcular média e datas
    const _arqDias=t.arqDiasReal!=null?t.arqDiasReal:t.arq*t.du;
    const _media=t.du>0?(_arqDias/t.du).toFixed(1):'0';
    const _isAdj=t.arqDiasReal!=null&&Math.abs(t.arqDiasReal-t.arq*t.du)>0.001;
    const _fase=gSt.projFases.find(f=>f.nome===t.faseLabel||('F'+(f.id))===t.faseLabel);
    const _phId=parseInt(t.key.split('/')[0]);
    const _phase=gSt.projFases.find(f=>f.id===_phId);
    const _sub=_phase?.rows?.arq?.subs?.[t.key.split('/')[2]];
    const _ini=_sub?G.fmtBR(_sub.start):'—';
    const _fim=_sub?G.fmtBR(_sub.end):'—';
    const s=document.createElement("tr");
    s.style.cssText=`border-bottom:1px solid #E8EDF4;${idx%2===0?'background:#FAFBFD;':'background:#fff;'}`;
    s.innerHTML=`
      <td style="padding:7px 10px;font-weight:600;color:#1A2535;">${t.nome}</td>
      <td style="padding:7px 10px;"></td>
      <td style="padding:7px 10px;text-align:right;color:#6A7A8A;font-size:10px;">${_ini}</td>
      <td style="padding:7px 10px;text-align:right;color:#6A7A8A;font-size:10px;">${_fim}</td>
      <td style="padding:7px 10px;text-align:right;color:#6A7A8A;">${t.du}</td>
      <td style="padding:7px 10px;text-align:right;background:#EEF2FA;">
        <div style="display:flex;align-items:center;gap:3px;justify-content:flex-end;">
          <button onclick="earqAdjArq('${t.key}',-1)" class="earq-no-print" style="width:18px;height:18px;border:1px solid #B5D4F4;border-radius:3px;background:#fff;cursor:pointer;font-size:12px;color:#185FA5;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">−</button>
          <span id="earq-v-arq-${t.key}" style="font-size:12px;font-weight:800;color:${_isAdj?'#E07020':'#185FA5'};min-width:28px;text-align:center;" title="${_isAdj?'Média real: '+_media+' arq/dia':'Padrão: '+t.arq+' arq/dia'}">${_isAdj?_media:t.arq}${_isAdj?'<span style="font-size:8px;color:#E07020;margin-left:1px;">~</span>':''}</span>
          <button onclick="earqAdjArq('${t.key}',1)" class="earq-no-print" style="width:18px;height:18px;border:1px solid #B5D4F4;border-radius:3px;background:#fff;cursor:pointer;font-size:12px;color:#185FA5;display:flex;align-items:center;justify-content:center;line-height:1;padding:0;">+</button>
        </div>
      </td>
      <td id="earq-h-arq-${t.key}" style="padding:7px 10px;text-align:right;font-weight:700;color:${_isAdj?'#E07020':'#185FA5'};background:#EEF2FA;">—</td>
      <td style="padding:7px 10px;background:#F5F0FC;"><input type="number" id="earq-dir-${t.key}" value="${t.cotaDir??n.dir}" min="0" step="1" oninput="earqSaveCota('${t.key}');earqRecalc()" style="width:50px;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #AFA9EC;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#3C3489;"></td>
      <td id="earq-c-dir-${t.key}" style="padding:7px 10px;text-align:right;font-weight:700;color:#534AB7;background:#F5F0FC;">—</td>
      <td style="padding:7px 10px;background:#E8F6F0;"><input type="number" id="earq-ger-${t.key}" value="${t.cotaGer??n.ger}" min="0" step="1" oninput="earqSaveCota('${t.key}');earqRecalc()" style="width:50px;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #5DCAA5;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#085041;"></td>
      <td id="earq-c-ger-${t.key}" style="padding:7px 10px;text-align:right;font-weight:700;color:#0F6E56;background:#E8F6F0;">—</td>
      <td id="earq-c-tot-${t.key}" style="padding:7px 10px;text-align:right;font-weight:700;color:#0C447C;">—</td>`;
    e.appendChild(s);
  });
  o.innerHTML=`<tr style="border-top:2px solid #1A5294;background:#EEF2FA;">
    <td colspan="5" style="padding:9px 10px;font-weight:700;color:#1A2535;">TOTAL GERAL</td>
    <td id="earq-tot-ad" style="padding:9px 10px;text-align:right;font-weight:800;color:#0C447C;font-size:13px;">—</td>
    <td id="earq-tot-arq" style="padding:9px 10px;text-align:right;font-weight:800;color:#0C447C;font-size:13px;">—</td>
    <td id="earq-tot-dir-h" style="padding:9px 10px;text-align:right;font-weight:700;color:#534AB7;">—</td>
    <td id="earq-tot-dir-c" style="padding:9px 10px;text-align:right;font-weight:700;color:#534AB7;">—</td>
    <td id="earq-tot-ger-h" style="padding:9px 10px;text-align:right;font-weight:700;color:#0F6E56;">—</td>
    <td id="earq-tot-ger-c" style="padding:9px 10px;text-align:right;font-weight:700;color:#0F6E56;">—</td>
    <td id="earq-tot-geral" style="padding:9px 10px;text-align:right;font-weight:800;color:#1A5294;font-size:13px;">—</td>
  </tr>`;
}function earqGetRows(){const t=[];return gSt.projFases.forEach((e,o)=>{const a=e.nome?.trim()||`F${e.id}`;G.SUB_IDS.forEach(n=>{const r=e.rows.arq?.subs?.[n];if(!r)return;const i=Math.max(1,CALENDARIO.contarDU(new Date(r.start),new Date(r.end))),s=`${e.id}/arq/${n}`,d=ESTADO.alocacaoARQ?.[s];var _totais=alocGetTotais(e.id,'arq',n);
    // Fallback para valores de _ativListas quando cotas ainda não foram salvas pelo modal
    var _ativDef=(_ativListas&&_ativListas.arq||[]).find(function(a){return a.id===n});
    var _cotasSalvas=(earqGetEstado().cotas||{})[s];
    var _cotaDir=_cotasSalvas?(_cotasSalvas.dir||0):(_ativDef?(_ativDef.hDir||0):0);
    var _cotaGer=_cotasSalvas?(_cotasSalvas.ger||0):(_ativDef?(_ativDef.hGer||0):0);
    t.push({key:s,nome:G.SUB_NAMES[n]||n,faseLabel:a,faseIdx:o,du:i,arq:d?.default??(_ativDef?.arqDia??1),arqDiasReal:_totais?_totais.arqDias:null,cotaDir:_cotaDir,cotaGer:_cotaGer})})}),t}function earqRecalc(){const t=earqGetEstado();t.chArq=parseFloat(document.getElementById("earq-ch-arq")?.value)||0,t.chDir=parseFloat(document.getElementById("earq-ch-dir")?.value)||0,t.chGer=parseFloat(document.getElementById("earq-ch-ger")?.value)||0;const fmt=t=>"R$ "+Math.round(t).toLocaleString("pt-BR"),e=earqGetRows();let o=0,a=0,n=0,r=0,i=0,s=0,d=0;e.forEach(e=>{const _arqDias=e.arqDiasReal!=null?e.arqDiasReal:e.arq*e.du;const l=_arqDias*EARQ_H,p=e.cotaDir??0,f=e.cotaGer??0,u=p*t.chDir,g=f*t.chGer,m=l*t.chArq+u+g,set=(t,e)=>{const o=document.getElementById(t);o&&(o.textContent=e)};const _override=e.arqDiasReal!=null&&e.arqDiasReal!==e.arq*e.du;const _earqHEl=document.getElementById('earq-h-arq-'+e.key);if(_earqHEl){_earqHEl.textContent=l+'h';_earqHEl.title=_override?`Ajustado dia a dia: ${_arqDias} arq-dias (padrão seria ${e.arq*e.du})`:'';_earqHEl.style.color=_override?'#E07020':'#185FA5';}set(`earq-c-dir-${e.key}`,fmt(u)),set(`earq-c-ger-${e.key}`,fmt(g)),set(`earq-c-tot-${e.key}`,fmt(m)),o+=_arqDias,a+=l,n+=p,r+=u,i+=f,s+=g,d+=m});const set=(t,e)=>{const o=document.getElementById(t);o&&(o.textContent=e)};set("earq-tot-ad",o+"d"),set("earq-tot-arq",a+"h"),set("earq-tot-dir-h",n+"h"),set("earq-tot-dir-c",fmt(r)),set("earq-tot-ger-h",i+"h"),set("earq-tot-ger-c",fmt(s)),set("earq-tot-geral",fmt(d)),set("earq-kpi-arq",a+"h"),set("earq-kpi-dir",n+"h"),set("earq-kpi-ger",i+"h"),set("earq-kpi-custo",fmt(d)),salvarDados()}function earqSaveCota(t){const e=earqGetEstado();e.cotas||(e.cotas={});const o=parseFloat(document.getElementById("earq-dir-"+t)?.value)||0,a=parseFloat(document.getElementById("earq-ger-"+t)?.value)||0;e.cotas[t]={dir:o,ger:a}}window.earqImprimirRelatorio=function(){
  // Coletar dados atuais
  earqBuildTable(); earqRecalc();
  const estado=earqGetEstado();
  const rows=earqGetRows();
  const fmt=v=>"R$ "+Math.round(v).toLocaleString("pt-BR");
  const cod=ESTADO.meta?.codigo||'', nome=ESTADO.meta?.nome||'';
  const proj=cod&&nome?cod+' — '+nome:cod||nome||'Planejamento de Obra';
  const chArq=estado.chArq||0, chDir=estado.chDir||0, chGer=estado.chGer||0;
  // Montar linhas da tabela
  let tbody='', prevFase=-1, totAd=0, totH=0, totDirH=0, totDirC=0, totGerH=0, totGerC=0, totGeral=0;
  const FASE_COLORS=["#185FA5","#2A5AA8","#8A3AA8","#2A8A5A"];
  rows.forEach((r,idx)=>{
    const cota=estado.cotas[r.key]||{dir:0,ger:0};
    const arqDias=r.arqDiasReal!=null?r.arqDiasReal:r.arq*r.du;
    const hArq=arqDias*8;
    const costDir=(cota.dir||0)*chDir, costGer=(cota.ger||0)*chGer;
    const costTot=hArq*chArq+costDir+costGer;
    const media=r.du>0?(arqDias/r.du).toFixed(1):'0';
    const isAdj=r.arqDiasReal!=null&&Math.abs(r.arqDiasReal-r.arq*r.du)>0.001;
    totAd+=arqDias; totH+=hArq; totDirH+=cota.dir||0; totDirC+=costDir;
    totGerH+=cota.ger||0; totGerC+=costGer; totGeral+=costTot;
    // Separador de fase
    if(r.faseIdx!==prevFase){
      prevFase=r.faseIdx;
      const fc=FASE_COLORS[(r.faseIdx??0)%FASE_COLORS.length];
      tbody+=`<tr><td colspan="10" style="padding:5px 8px 2px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${fc};background:${fc}18;border-bottom:1px solid ${fc}44;">${r.faseLabel}</td></tr>`;
    }
    // Buscar datas
    const phId=parseInt(r.key.split('/')[0]);
    const subId=r.key.split('/')[2];
    const phase=gSt.projFases.find(f=>f.id===phId);
    const sub=phase?.rows?.arq?.subs?.[subId];
    const ini=sub?G.fmtBR(sub.start):'—', fim=sub?G.fmtBR(sub.end):'—';
    tbody+=`<tr style="background:${idx%2===0?'#FAFBFD':'#fff'};">
      <td style="padding:5px 8px;font-weight:600;color:#1A2535;border-bottom:1px solid #E8EDF4;">${r.nome}</td>
      <td style="padding:5px 8px;text-align:center;color:#6A7A8A;border-bottom:1px solid #E8EDF4;">${ini}</td>
      <td style="padding:5px 8px;text-align:center;color:#6A7A8A;border-bottom:1px solid #E8EDF4;">${fim}</td>
      <td style="padding:5px 8px;text-align:right;color:#6A7A8A;border-bottom:1px solid #E8EDF4;">${r.du}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700;color:${isAdj?'#E07020':'#185FA5'};background:#EEF2FA;border-bottom:1px solid #E8EDF4;">${isAdj?media+'~':r.arq}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700;color:${isAdj?'#E07020':'#0C447C'};background:#E8F0FC;border-bottom:1px solid #E8EDF4;">${hArq}h</td>
      <td style="padding:5px 8px;text-align:right;color:#534AB7;background:#F0EBF8;border-bottom:1px solid #E8EDF4;">${cota.dir||0}h</td>
      <td style="padding:5px 8px;text-align:right;color:#534AB7;background:#F0EBF8;border-bottom:1px solid #E8EDF4;">${fmt(costDir)}</td>
      <td style="padding:5px 8px;text-align:right;color:#0F6E56;background:#E4F2EB;border-bottom:1px solid #E8EDF4;">${cota.ger||0}h</td>
      <td style="padding:5px 8px;text-align:right;color:#0F6E56;background:#E4F2EB;border-bottom:1px solid #E8EDF4;">${fmt(costGer)}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:700;color:#0C447C;border-bottom:1px solid #E8EDF4;">${fmt(costTot)}</td>
    </tr>`;
  });
  const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Equipe ARQ — ${proj}</title>
  <style>
    @page{size:A4 portrait;margin:14mm 12mm 14mm 12mm;}
    *{box-sizing:border-box;}
    body{font-family:'Barlow Condensed',Arial,sans-serif;font-size:9pt;color:#1A2535;margin:0;padding:0;background:#fff;}
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700&family=Oswald:wght@600;700&display=swap');
    h1{font-family:'Oswald',Arial,sans-serif;font-size:16pt;margin:0;letter-spacing:.05em;text-transform:uppercase;}
    table{width:100%;border-collapse:collapse;font-size:8pt;}
    th{background:#F0F4FA;font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:5px 7px;text-align:right;border-bottom:2px solid #C8D4E8;white-space:nowrap;}
    th:first-child{text-align:left;}
    tfoot td{font-weight:800;font-size:9pt;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style></head><body>
  <div style="border-bottom:3px solid #1A5294;padding-bottom:10px;margin-bottom:12px;display:flex;align-items:flex-end;justify-content:space-between;">
    <div>
      <h1>Equipe de Arquitetura</h1>
      <div style="font-size:9pt;color:#6A7A8A;margin-top:3px;">${proj?'<strong>'+proj+'</strong> · ':''} Estimativa de alocação e custos</div>
    </div>
    <div style="text-align:right;font-size:8pt;color:#8A95A8;line-height:1.7;">
      <div>ch Arq: <strong>R$ ${chArq}/h</strong></div>
      <div>ch Dir: <strong>R$ ${chDir}/h</strong></div>
      <div>ch Ger: <strong>R$ ${chGer}/h</strong></div>
      <div>Emitido: <strong>${new Date().toLocaleDateString('pt-BR')}</strong></div>
    </div>
  </div>
  <table>
    <thead><tr>
      <th style="text-align:left;min-width:110px;">Atividade</th>
      <th>Início</th><th>Fim</th><th>DU</th>
      <th style="background:#E8F0FC;color:#0C447C;">arq/dia</th>
      <th style="background:#E8F0FC;color:#0C447C;">horas ARQ</th>
      <th style="background:#F0EBF8;color:#3C3489;">cota Dir.</th>
      <th style="background:#F0EBF8;color:#3C3489;">custo Dir.</th>
      <th style="background:#E4F2EB;color:#085041;">cota Ger.</th>
      <th style="background:#E4F2EB;color:#085041;">custo Ger.</th>
      <th>Custo total</th>
    </tr></thead>
    <tbody>${tbody}</tbody>
    <tfoot><tr style="border-top:2px solid #1A5294;background:#EEF2FA;">
      <td colspan="4" style="padding:7px 8px;color:#1A2535;">TOTAL GERAL</td>
      <td style="padding:7px 8px;text-align:right;color:#0C447C;background:#E8F0FC;">${(totAd/rows.length).toFixed(1)} avg</td>
      <td style="padding:7px 8px;text-align:right;color:#0C447C;background:#E8F0FC;">${totH}h</td>
      <td style="padding:7px 8px;text-align:right;color:#534AB7;background:#F0EBF8;">${totDirH}h</td>
      <td style="padding:7px 8px;text-align:right;color:#534AB7;background:#F0EBF8;">${fmt(totDirC)}</td>
      <td style="padding:7px 8px;text-align:right;color:#0F6E56;background:#E4F2EB;">${totGerH}h</td>
      <td style="padding:7px 8px;text-align:right;color:#0F6E56;background:#E4F2EB;">${fmt(totGerC)}</td>
      <td style="padding:7px 8px;text-align:right;color:#1A5294;">${fmt(totGeral)}</td>
    </tr></tfoot>
  </table>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
  </body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
};
window.earqAdjArq=function(t,e){
  ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});
  ESTADO.alocacaoARQ[t]||(ESTADO.alocacaoARQ[t]={default:1,override:{}});
  const o=Math.max(0,(ESTADO.alocacaoARQ[t].default??1)+e);
  ESTADO.alocacaoARQ[t].default=o;
  // Limpar overrides (exceto dias de aprovação que ficam em 0) e propagar novo padrão
  var _ovr=ESTADO.alocacaoARQ[t].override||{};
  var _newOvr={};
  // Mantém overrides que eram explicitamente 0 (dias de aprovação), remove os demais
  Object.keys(_ovr).forEach(function(dk){ if(_ovr[dk]===0) _newOvr[dk]=0; });
  ESTADO.alocacaoARQ[t].override=_newOvr;
  const a=document.getElementById("earq-v-arq-"+t);
  // Atualiza o display para mostrar a média real
  earqBuildTable(); earqRecalc();
};let abaAtiva="cronograma";function switchTab(t){abaAtiva=t,document.querySelectorAll(".tab-btn").forEach(e=>{e.classList.toggle("active",e.dataset.tab===t)}),document.querySelectorAll(".tab-pane").forEach(e=>{e.classList.toggle("active",e.id==="pane-"+t)}),"cronograma"===t&&setTimeout(()=>{"function"==typeof gRender&&gRender()},30),"equipe-arq"===t&&(earqUpdateColors(),earqBuildTable(),earqRecalc())}const _ZOOM_STEPS=[.5,.75,1,1.5,2,3,4];function zoomIn(){gZoom(1)}function zoomOut(){gZoom(-1)}function zoomReset(){gSt.zoom=1,gRender()}window.gZoom=function(t){const e=_ZOOM_STEPS.findIndex(t=>t>=gSt.zoom-.01),o=Math.max(0,Math.min(_ZOOM_STEPS.length-1,e+t));gSt.zoom=_ZOOM_STEPS[o],gRender()};const DISC_PALETTES=[["#F4C060","#8A5008"],["#EAA840","#784010"],["#E09030","#6A3808"],["#F0B040","#904808"],["#DCA030","#7C4C10"],["#F8C870","#986018"],["#E8A038","#804010"],["#D89028","#703808"],["#F0B850","#8C5010"],["#E4A040","#7A4808"],["#D88830","#683A08"],["#EAB048","#885010"],["#E09838","#744008"],["#F6C058","#906018"]];function getDiscPalObra(t){const e=COR.OBRA_RAMP,o=e.length,a=(2*t+1)/27,n=Math.min(Math.round(2*t/27*(o-1)),o-1),r=Math.min(Math.round(a*(o-1)),o-1);return[e[n],e[r]]}function getDiscPal(t){return getDiscPalObra(t)}function gFasesVinculadas(){return!0===ESTADO.cfg?.vinculoObraProj}function gProjFaseLabel(t){if(gFasesVinculadas()){const e=gSt.obraFases[t.id-1],o=e?.nome?.trim();return o||`Fase ${t.id}`}return t.nome?.trim()||`Fase ${t.id}`}function gObraFaseLabel(t){return t.nome?.trim()||`Fase ${t.id}`}function gMarcadoresObra(t,e,o,a,n){const r=Math.max(9,Math.min(13,Math.round(.45*a))),i=Math.round(.1*a),s=Math.round(.7*r),d=Math.max(7,Math.min(9,Math.round(.78*r)));let l="";return l+='<svg style="position:absolute;left:'+(e-s-1)+"px;top:0;height:"+a+'px;overflow:visible;pointer-events:none;z-index:8;" width="'+(2*s+2)+'">',l+='<line x1="'+(s+1)+'" y1="-12" x2="'+(s+1)+'" y2="'+a+'" stroke="rgba(100,220,150,.45)" stroke-width="1.5" stroke-dasharray="3,2"/>',l+='<polygon points="'+(s+1)+","+(i+s)+" 1,"+(i-s)+" "+(2*s+1)+","+(i-s)+'" fill="#4CAF8A" stroke="rgba(0,0,0,.12)" stroke-width="1"/>',l+="</svg>",l+='<svg style="position:absolute;left:'+(e+o-s-1)+"px;top:0;height:"+a+'px;overflow:visible;pointer-events:none;z-index:8;" width="'+(2*s+2)+'">',l+='<line x1="'+(s+1)+'" y1="-12" x2="'+(s+1)+'" y2="'+a+'" stroke="rgba(230,100,100,.45)" stroke-width="1.5" stroke-dasharray="3,2"/>',l+='<polygon points="'+(s+1)+","+(i+s)+" 1,"+(i-s)+" "+(2*s+1)+","+(i-s)+'" fill="#E57373" stroke="rgba(0,0,0,.12)" stroke-width="1"/>',l+="</svg>",n&&[{m:3,n:"V1"},{m:5,n:"V2"},{m:7,n:"V3"}].forEach(({m:e,n:o})=>{const n=gPx(G.segToDate(t,e));l+='<svg class="g-virada-mark" style="position:absolute;left:'+(n-r-1)+"px;top:0;height:"+a+'px;overflow:visible;pointer-events:none;z-index:7;" width="'+(2*r+2)+'">',l+='<line x1="'+(r+1)+'" y1="-12" x2="'+(r+1)+'" y2="'+a+'" stroke="rgba(255,213,79,.6)" stroke-width="1.5" stroke-dasharray="3,2"/>',l+='<circle cx="'+(r+1)+'" cy="'+i+'" r="'+r+'" fill="#FFD54F" stroke="rgba(0,0,0,.15)" stroke-width="1"/>',l+='<text x="'+(r+1)+'" y="'+(i+Math.round(.38*d))+'" text-anchor="middle" font-size="'+d+'" font-weight="700" font-family="Oswald,sans-serif" fill="#4A2800">'+o+"</text>",l+="</svg>"}),l}function gDiscTemIncompleto(t){return t.tasks.some(t=>{const e=Object.values(t.m).reduce((t,e)=>t+e,0);return e>0&&100!==e})}window.gEditFaseNome=function(t,e,o,a){document.getElementById("g-nome-editor")?.remove();const n=document.createElement("div");n.id="g-nome-editor",n.style.cssText="position:fixed;z-index:9100;background:#fff;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.28);padding:10px 12px;display:flex;flex-direction:column;gap:8px;min-width:240px;";const r=document.createElement("div");r.style.cssText="font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8A95A8;",r.textContent="proj"===t?`Nome — Fase Projeto ${e}`:`Nome — Fase Obra ${e}`,n.appendChild(r);const i=document.createElement("div");i.style.cssText="display:flex;gap:6px;align-items:center;";const s=document.createElement("input");s.type="text",s.value=o||"",s.placeholder=`ex: Loja ${e}º Andar`,s.style.cssText="flex:1;padding:6px 9px;border:1px solid #C8CDD8;border-radius:5px;font-family:var(--body);font-size:12px;color:#1A2535;outline:none;";const d=document.createElement("button");if(d.textContent="✓",d.style.cssText="width:30px;height:30px;background:var(--accent,#00AEDF);color:#fff;border:none;border-radius:5px;font-size:14px;cursor:pointer;flex-shrink:0;",i.appendChild(s),i.appendChild(d),n.appendChild(i),document.body.appendChild(n),a){const t=a.getBoundingClientRect();let e=t.left,o=t.bottom+4;e+260>window.innerWidth-8&&(e=window.innerWidth-268),o+80>window.innerHeight-8&&(o=t.top-84),n.style.left=e+"px",n.style.top=o+"px"}else n.style.left="50%",n.style.top="50%",n.style.transform="translate(-50%,-50%)";s.focus(),s.select();const aplicar=()=>{const o=s.value.trim();if("proj"===t){const t=gSt.projFases.find(t=>t.id===e);t&&(t.nome=o)}else{const t=gSt.obraFases.find(t=>t.id===e);t&&(t.nome=o)}n.remove(),gRender(),document.getElementById("modal-cfg-overlay")?.classList.contains("open")&&(cfgBuildEntregaveis(),cfgBuildAndaresTable(),cfgBuildVinculoObraProj())};d.addEventListener("click",aplicar),s.addEventListener("keydown",t=>{"Enter"===t.key&&(t.preventDefault(),aplicar()),"Escape"===t.key&&n.remove()}),setTimeout(()=>{document.addEventListener("mousedown",function outside(t){n.contains(t.target)||(n.remove(),document.removeEventListener("mousedown",outside))})},0)};let _discModalPhId=null,_discModalDiscId=null,_discDragSrc=null;const DISC_PREP_RE=/follow|medi[çc][aã]o|shop.?draw|agendamento|aprova[çc][aã]o|recebimento/i;function gDiscIsPrep(t){return void 0!==t.prep?t.prep:DISC_PREP_RE.test(t.n)}window.gOpenDiscModal=function(t,e){const o=gSt.obraFases.find(e=>e.id==t);if(!o)return;const a=(o.disciplinas||[]).find(t=>t.id===e);if(!a)return;const n=getDiscPal((o.disciplinas||[]).findIndex(t=>t.id===e));_discModalPhId=t,_discModalDiscId=e,document.getElementById("disc-modal-title").textContent=a.label,document.getElementById("disc-modal-accent").style.background=`linear-gradient(to bottom,${n[0]},${n[1]})`,document.getElementById("disc-modal-save").style.background=n[1],gDiscRenderTable(a,n),document.getElementById("modal-disc").style.display="flex"},window.gCloseDiscModal=function(){document.getElementById("modal-disc").style.display="none",_discModalPhId=null,_discModalDiscId=null};let _popDs=null;function gChainSectionKoTec(t,e){const o=t.tecChainTypes||{},a=!t.tecChains||!1!==t.tecChains.koTec?.st,n=o.koTec?.st??"II_ARQ",r=o.koTec?.srcArqId??G.SUB_IDS[0],i=(G.SUB_IDS.indexOf(r),"II_ARQ"===n),s=G.SUB_IDS.map((t,e)=>`<option value="${t}"${t===r?" selected":""}>${G.SUB_NAMES[t]||t}</option>`).join("");return` <div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;margin-bottom:10px;">Conexão com Arquitetura</div><div style="display:flex;gap:6px;margin-bottom:10px;"><button onclick="gToggleTecChain(${t.id},'koTec','st');gRefreshPop()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:${a?"rgba(0,158,168,.10)":"rgba(200,210,220,.10)"};border:1px solid ${a?"#009EA8":"#C8D4D8"};border-radius:6px;padding:7px 10px;cursor:pointer;font-size:11px;font-weight:700;color:${a?"#007A88":"#8A95A3"};font-family:inherit;"> ${a?"🔗 Vinculado a ARQ":"⛓️ Livre"} </button></div> ${a?`\n <div style="margin-bottom:8px;">\n <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:5px;">Etapa de referência (ARQ)</div>\n <select onchange="gSetTecArqSrc('${t.id}','koTec',this.value);gRefreshPop()"\n style="width:100%;padding:6px 8px;border:1px solid #C8CDD8;border-radius:5px;\n font-family:inherit;font-size:11px;color:#2A3548;background:#fff;cursor:pointer;outline:none;">\n ${s}\n </select>\n </div>\n <div>\n <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:5px;">Tipo de relação</div>\n <div style="display:flex;gap:5px;">\n <button onclick="gSetTecRelType('${t.id}','koTec','FI_ARQ');gRefreshPop()"\n style="flex:1;padding:7px 6px;border:1px solid ${i?"#C8D4D8":"#009EA8"};\n border-radius:5px;background:${i?"rgba(200,210,220,.06)":"rgba(0,158,168,.10)"};\n font-size:11px;font-weight:700;color:${i?"#8A95A3":"#007A88"};\n cursor:pointer;font-family:inherit;"\n title="Kickoff TEC inicia após o TÉRMINO da etapa ARQ selecionada">\n FI<br><span style="font-size:9px;font-weight:400;">Fim ARQ → Início TEC</span>\n </button>\n <button onclick="gSetTecRelType('${t.id}','koTec','II_ARQ');gRefreshPop()"\n style="flex:1;padding:7px 6px;border:1px solid ${i?"#E07000":"#C8D4D8"};\n border-radius:5px;background:${i?"rgba(224,112,0,.10)":"rgba(200,210,220,.06)"};\n font-size:11px;font-weight:700;color:${i?"#C06000":"#8A95A3"};\n cursor:pointer;font-family:inherit;"\n title="Kickoff TEC inicia JUNTO com a etapa ARQ selecionada">\n II<br><span style="font-size:9px;font-weight:400;">Início ARQ → Início TEC</span>\n </button>\n </div>\n <div style="font-size:9px;color:#A0A8B8;margin-top:5px;text-align:center;">\n ${i?`Inicia junto com <em>${G.SUB_NAMES[r]||r}</em> (ARQ)`:`Inicia após o término de <em>${G.SUB_NAMES[r]||r}</em> (ARQ)`}\n </div>\n </div>\n `:'<div style="font-size:10px;color:#A0A8B8;font-style:italic;text-align:center;padding:4px 0;">Kickoff TEC desvinculado — data livre</div>'}\n</div>`}function gChainSection(t,e){if(!e.subId)return"";const o="tec"===e.rowId,a=o?G.TEC_IDS:G.SUB_IDS,n=o?G.TEC_NAMES:G.SUB_NAMES,r=a.indexOf(e.subId);if(0===r&&o)return gChainSectionKoTec(t,e);if(r<=0)return"";const i=o?!(!t.tecChains||!t.tecChains[e.subId]||!1===t.tecChains[e.subId].st):!!(o?t.tecChains||{}:t.chains[e.rowId]||[])[r-1],s=o?t.tecChainTypes&&t.tecChainTypes[e.subId]?"II":"FI":(o?t.tecChainTypes||{}:(t.chainTypes||{})[e.rowId]||[])[r]||"FI",d=o?[]:(t.chainSrc||{})[e.rowId]||[],l=o?r-1:void 0!==d[r]?d[r]:r-1,c=a.map((t,e)=>e===r?"":`<option value="${e}"${e===l?" selected":""}>${e<r?"← ":"→ "}${n[t]||t}</option>`).join("");return` <div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;margin-bottom:10px;">Conexão</div><div style="display:flex;gap:6px;margin-bottom:10px;"><button onclick="gToggleChain(${t.id},'${e.rowId}',${r-1});gRefreshPop()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:${i?"rgba(0,158,168,.10)":"rgba(200,210,220,.10)"};border:1px solid ${i?"#009EA8":"#C8D4D8"};border-radius:6px;padding:7px 10px;cursor:pointer;font-size:11px;font-weight:700;color:${i?"#007A88":"#8A95A3"};font-family:inherit;"> ${i?"🔗 Vinculado":"⛓️ Livre"} </button></div> ${i?`\n <div style="margin-bottom:8px;">\n <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:5px;">Referência</div>\n <select onchange="gSetChainSrc(${t.id},'${e.rowId}',${r-1},parseInt(this.value));gRefreshPop()"\n style="width:100%;padding:6px 8px;border:1px solid #C8CDD8;border-radius:5px;\n font-family:inherit;font-size:11px;color:#2A3548;background:#fff;cursor:pointer;outline:none;">\n ${c}\n </select>\n </div>\n <div>\n <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:5px;">Tipo de relação</div>\n <div style="display:flex;gap:5px;">\n <button onclick="if('${s}'!=='FI'){gToggleChainType(${t.id},'${e.rowId}',${r-1});gRefreshPop();}"\n style="flex:1;padding:7px 6px;border:1px solid ${"FI"===s?"#009EA8":"#C8D4D8"};\n border-radius:5px;background:${"FI"===s?"rgba(0,158,168,.10)":"rgba(200,210,220,.06)"};\n font-size:11px;font-weight:700;color:${"FI"===s?"#007A88":"#8A95A3"};\n cursor:pointer;font-family:inherit;"\n title="A etapa atual começa quando a etapa referência TERMINA">\n FI<br><span style="font-size:9px;font-weight:400;">Fim → Início</span>\n </button>\n <button onclick="if('${s}'!=='II'){gToggleChainType(${t.id},'${e.rowId}',${r-1});gRefreshPop();}"\n style="flex:1;padding:7px 6px;border:1px solid ${"II"===s?"#E07000":"#C8D4D8"};\n border-radius:5px;background:${"II"===s?"rgba(224,112,0,.10)":"rgba(200,210,220,.06)"};\n font-size:11px;font-weight:700;color:${"II"===s?"#C06000":"#8A95A3"};\n cursor:pointer;font-family:inherit;"\n title="A etapa atual começa JUNTO com a etapa referência">\n II<br><span style="font-size:9px;font-weight:400;">Início → Início</span>\n </button>\n <button onclick="gToggleChainType(${t.id},'${e.rowId}',${r-1},'FF');gRefreshPop();"\n style="flex:1;padding:7px 6px;border:1px solid ${"FF"===s?"#8A3AA8":"#C8D4D8"};\n border-radius:5px;background:${"FF"===s?"rgba(138,58,168,.10)":"rgba(200,210,220,.06)"};\n font-size:11px;font-weight:700;color:${"FF"===s?"#6A2A88":"#8A95A3"};\n cursor:pointer;font-family:inherit;"\n title="A etapa atual TERMINA junto com a etapa referencia">\n FF<br><span style="font-size:9px;font-weight:400;">Fim → Fim</span>\n </button>\n </div>\n <div style="font-size:9px;color:#A0A8B8;margin-top:5px;text-align:center;">\n ${"FI"===s?`Inicia após o término de <em>${n[a[l]]||a[l]}</em>`:`Inicia junto com <em>${n[a[l]]||a[l]}</em>`}\n </div>\n </div>\n `:'<div style="font-size:10px;color:#A0A8B8;font-style:italic;text-align:center;padding:4px 0;">Etapa desvinculada — datas livres</div>'}\n</div>`}function getWeekNumber(t){const e=new Date(t);e.setHours(0,0,0,0),e.setDate(e.getDate()+3-(e.getDay()+6)%7);const o=new Date(e.getFullYear(),0,4);return 1+Math.round(((e-o)/864e5-3+(o.getDay()+6)%7)/7)}window.gSetTecArqSrc=function(t,e,o){if(_isFrozen()){_congAvisar();return;}const a=gSt.projFases.find(e=>e.id==t);if(!a)return;a.tecChainTypes||(a.tecChainTypes={}),a.tecChainTypes[e]||(a.tecChainTypes[e]={}),a.tecChainTypes[e].srcArqId=o;const n=gCascadeTec(a.rows.tec.subs,a.rows.arq.subs,gSt._visitaDate,a.tecChains,a.tecChainTypes);a.rows.tec.subs=n,a.rows.tec.start=new Date(Math.min(...G.TEC_IDS.map(t=>G.ms(n[t].start)))),a.rows.tec.end=new Date(Math.max(...G.TEC_IDS.map(t=>G.ms(n[t].end)))),gRender()},window.gSetTecRelType=function(t,e,o){if(_isFrozen()){_congAvisar();return;}const a=gSt.projFases.find(e=>e.id==t);if(!a)return;a.tecChainTypes||(a.tecChainTypes={}),a.tecChainTypes[e]||(a.tecChainTypes[e]={}),a.tecChainTypes[e].st=o;const n=gCascadeTec(a.rows.tec.subs,a.rows.arq.subs,gSt._visitaDate,a.tecChains,a.tecChainTypes);a.rows.tec.subs=n,a.rows.tec.start=new Date(Math.min(...G.TEC_IDS.map(t=>G.ms(n[t].start)))),a.rows.tec.end=new Date(Math.max(...G.TEC_IDS.map(t=>G.ms(n[t].end)))),gRender()},window.gPopSnapUtil=function(t){const e=document.getElementById(t);if(!e||!_popDs||"proj"!==_popDs.type)return;let o=G.parseD(e.value);if(o){for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);e.value=G.fmtISO(o)}},window.gPopUpdateDur=function(){const t=document.getElementById("pop-st"),e=document.getElementById("pop-en"),o=document.getElementById("pop-dur-val");if(t&&e&&o){const a=G.parseD(t.value),n=G.parseD(e.value);o.textContent=_popDs&&"proj"===_popDs.type?Math.max(1,CALENDARIO.contarDU(a,n)):Math.max(1,G.diff(a,n))}},window.gPopAdjustDur=function(t){const e=document.getElementById("pop-en"),o=document.getElementById("pop-st");if(e&&o){if(_popDs&&"proj"===_popDs.type){const a=G.parseD(e.value),n=CALENDARIO.contarDU(G.parseD(o.value),a),r=addBusinessDays(G.parseD(o.value),Math.max(1,n+t));for(;CALENDARIO.isNaoUtil(r);)G.addD(r,1);e.value=G.fmtISO(r)}else{const o=G.parseD(e.value);e.value=G.fmtISO(G.addD(o,t))}window.gPopUpdateDur()}},window.gPopApply=function(t){const e=_popDs;if(e){if("proj"===t){const t=gSt.projFases.find(t=>t.id==e.phId);let o=G.parseD(document.getElementById("pop-st").value),a=G.parseD(document.getElementById("pop-en").value);for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);for(;CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);if(e.subId){G.SUB_IDS.indexOf(e.subId);let n={...t.rows[e.rowId].subs,[e.subId]:{start:o,end:a}};n=G.cascade(n,t.chains[e.rowId],0,t.chainTypes?.[e.rowId],t.chainSrc?.[e.rowId]),t.rows[e.rowId]={...t.rows[e.rowId],subs:n,...G.parentSpan(n)}}else t.rows[e.rowId]={...t.rows[e.rowId],start:o,end:a}}else if("obra"===t){const t=gSt.obraFases.find(t=>t.id==e.phId);t.obra.start=G.parseD(document.getElementById("pop-st").value),t.obra.end=G.parseD(document.getElementById("pop-en").value)}gClosePop(),gRender()}else gClosePop()};const DOW_SHORT=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],DOW_MIN=["D","S","T","Q","Q","S","S"];function buildDayHeaderHTML(t,e){const o=e>=20,a=e>=7,n=e>=7,r=e>=32;if(e<5){let o="";const a=[];let n=null;return t.forEach((t,e)=>{const o=getWeekNumber(t.date),r=t.date.getFullYear()+"-"+o;r!==(n&&n.key)&&(n={key:r,wk:o,count:0,startIdx:e},a.push(n)),n.count++}),a.forEach(t=>{o+=`<div style="width:${t.count*e}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,.12);overflow:hidden;box-sizing:border-box;"><span style="font-family:var(--font);font-size:8px;font-weight:700;color:#A8B0C0;white-space:nowrap;">S${t.wk}</span></div>`}),o}const i=Math.max(6,Math.min(9,e-4));let s="";return t.forEach(t=>{const d=e,l=1===t.dow,c=t.buffer?"rgba(0,0,0,.025)":t.isSat||t.isSun?t.isSun?"rgba(140,120,80,.08)":"rgba(200,130,20,.08)":"transparent",p=t.isSat?"#E07020":t.isSun?"#B83418":"#6A7A8A",f=t.isSat?"#E07020":t.isSun?"#B83418":"#A8B0C0",u=t.date.getDate().toString().padStart(2,"0"),g=(t.date.getMonth()+1).toString().padStart(2,"0"),m=o?u+"/"+g:a?u:"";s+=`<div style="width:${d}px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border-left:${l?"2px":"0px"} solid ${l?"rgba(0,0,0,.18)":"transparent"};border-right:1px solid rgba(0,0,0,.07);overflow:hidden;box-sizing:border-box;background:${c};">`,n&&(s+=`<span style="font-family:var(--font);font-size:${i}px;font-weight:700;color:${p};line-height:1;white-space:nowrap;">${r?DOW_SHORT[t.dow]:DOW_MIN[t.dow]}</span>`),m&&(s+=`<span style="font-family:var(--font);font-size:${i}px;color:${f};line-height:1;white-space:nowrap;">${m}</span>`),s+="</div>"}),s}function buildDayHeaderSVG(t,e,o,a,n,r){const i=o>=20,s=o>=7,d=o>=7,l=o>=32,c=[];if(o<5){const i=[];let s=null;return e.forEach((t,e)=>{const o=getWeekNumber(t.date),a=t.date.getFullYear()+"-"+o;a!==(s&&s.key)&&(s={key:a,wk:o,count:0,startIdx:e},i.push(s)),s.count++}),i.forEach(e=>{const i=a+e.startIdx*o,s=e.count*o,d=t("text");d.setAttribute("x",i+s/2),d.setAttribute("y",n+r/2+3),d.setAttribute("text-anchor","middle"),d.setAttribute("font-size","8"),d.setAttribute("font-family","Oswald,sans-serif"),d.setAttribute("font-weight","700"),d.setAttribute("fill","rgba(168,176,192,.9)"),d.textContent="S"+e.wk,c.push(d);const l=t("line");l.setAttribute("x1",i),l.setAttribute("x2",i),l.setAttribute("y1",n),l.setAttribute("y2",n+r),l.setAttribute("stroke","rgba(0,0,0,.14)"),l.setAttribute("stroke-width","1"),c.push(l)}),c}const p=Math.max(6,Math.min(9,o-4)),f=o>=12,u=n+(f?.35*r:r/2+3),g=n+.76*r;return e.forEach((e,m)=>{const b=a+m*o,x=1===e.dow,h=e.isSat?"#E07020":e.isSun?"#B83418":"rgba(100,110,130,.80)",A=e.isSat?"#E07020":e.isSun?"#B83418":"rgba(168,176,192,.9)",y=e.date.getDate().toString().padStart(2,"0"),E=(e.date.getMonth()+1).toString().padStart(2,"0");if(x){const e=t("line");e.setAttribute("x1",b),e.setAttribute("x2",b),e.setAttribute("y1",n),e.setAttribute("y2",n+r),e.setAttribute("stroke","rgba(0,0,0,.18)"),e.setAttribute("stroke-width","2"),c.push(e)}if(d&&f){const a=l?DOW_SHORT[e.dow]:DOW_MIN[e.dow],n=t("text");n.setAttribute("x",b+o/2),n.setAttribute("y",u),n.setAttribute("text-anchor","middle"),n.setAttribute("font-size",p),n.setAttribute("font-family","Oswald,sans-serif"),n.setAttribute("font-weight","700"),n.setAttribute("fill",h),n.textContent=a,c.push(n)}const D=i?y+"/"+E:s?y:null;if(D){const e=t("text");e.setAttribute("x",b+o/2),e.setAttribute("y",f?g:n+r/2+3),e.setAttribute("text-anchor","middle"),e.setAttribute("font-size",p),e.setAttribute("font-family","Oswald,sans-serif"),e.setAttribute("fill",A),e.textContent=D,c.push(e)}}),c}function toggleTheme(){const t=document.documentElement,e="dark"===t.dataset.theme;t.dataset.theme=e?"light":"dark",document.getElementById("theme-icon-sun").style.display=e?"":"none",document.getElementById("theme-icon-moon").style.display=e?"none":"",document.getElementById("theme-label").textContent=e?"Escuro":"Claro"}function toggleFullscreen(){document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.()}const PALETAS_CATALOGO=[{id:"aw-amber",name:"Âmbar A|W",icon:"🟤",desc:"Paleta original — tons quentes marrom/dourado",discColors:["#D4922A","#C07820","#A86018","#E8A840","#B86C10","#CC8820","#F0B850","#986010","#D87828","#E09838","#AA7018","#C06010","#DC9030","#F4C060"],discPairs:[["#F4C060","#8A5008"],["#EAA840","#784010"],["#E09030","#6A3808"],["#F0B040","#904808"],["#DCA030","#7C4C10"],["#F8C870","#986018"],["#E8A038","#804010"],["#D89028","#703808"],["#F0B850","#8C5010"],["#E4A040","#7A4808"],["#D88830","#683A08"],["#EAB048","#885010"],["#E09838","#744008"],["#F6C058","#906018"]],heatIdx:2},{id:"aw-tiffany",name:"Tiffany A|W",icon:"🩵",desc:"Verde-azulado — identidade visual A|W",discColors:["#00DEAD","#00AA50","#005C38","#00BEEF","#007890","#00DED0","#009060","#00A8C0","#004830","#0088A0","#00C890","#006880","#003820","#00A0B8"],discPairs:[["#00F0D0","#005840"],["#00D8B8","#004830"],["#00C0A0","#003828"],["#00E8C8","#005038"],["#00B890","#003020"],["#00D0B0","#004428"],["#00A880","#002818"],["#00C0A8","#003C30"],["#00D8C0","#004C38"],["#00B098","#003428"],["#00C8B0","#004030"],["#00A890","#003020"],["#00B8A0","#003830"],["#00D0C0","#004838"]],heatIdx:1},{id:"blue-slate",name:"Azul Ardósia",icon:"🔵",desc:"Tons de azul e índigo — corporativo moderno",discColors:["#3278DC","#1A5AB0","#0E3A7A","#5A98F0","#2060C0","#4488E8","#1848A8","#6AA8F8","#2470D0","#3A80E0","#1650B8","#5090F0","#1040A0","#4880E8"],discPairs:[["#6AA8F8","#0E2860"],["#5A98F0","#0C2458"],["#4888E8","#0A2050"],["#5A98F0","#0E2858"],["#4278D8","#081C48"],["#5890EC","#0C2250"],["#3A70D0","#0A1C48"],["#6AB0F8","#102860"],["#5098F0","#0C2458"],["#4888E8","#0A2050"],["#5A98F0","#0E2858"],["#4280DC","#081C48"],["#5890EC","#0C2250"],["#3A70D0","#0A1C48"]],heatIdx:5},{id:"green-forest",name:"Verde Floresta",icon:"🌿",desc:"Tons de verde — sustentabilidade e natureza",discColors:["#00AA50","#008840","#006030","#22C464","#10A048","#38D478","#088038","#40DC80","#14A850","#28C060","#069030","#3ACC70","#0A7830","#30C868"],discPairs:[["#60E898","#084820"],["#40D878","#064018"],["#30C868","#053810"],["#50E088","#074018"],["#28C060","#043010"],["#48D880","#064018"],["#20B058","#032810"],["#58E090","#084820"],["#38D070","#064018"],["#28C060","#053810"],["#40D878","#064018"],["#30C868","#053810"],["#20B058","#032810"],["#50E088","#074018"]],heatIdx:3},{id:"purple-neo",name:"Roxo Neo",icon:"🟣",desc:"Violeta e lilás — criativo e tecnológico",discColors:["#9650DC","#7830C0","#5010A0","#B070F0","#8040C8","#C090F8","#6020B0","#A860E8","#8848D0","#B078F0","#7030B8","#A050E0","#5818A8","#BA80F0"],discPairs:[["#C890F8","#380880"],["#B878F0","#300870"],["#A860E8","#280860"],["#C080F8","#340878"],["#A050E0","#240850"],["#B870F0","#300868"],["#9038D0","#1C0848"],["#C890F8","#380880"],["#B070F0","#2C0870"],["#A860E8","#280860"],["#B878F0","#300870"],["#A050E0","#240850"],["#B870F0","#300868"],["#9038D0","#1C0848"]],heatIdx:5},{id:"red-coral",name:"Coral Vivo",icon:"🔴",desc:"Vermelho e coral — energia e urgência",discColors:["#E63232","#C01818","#900808","#F05050","#D02020","#F86868","#B01010","#F07878","#D83838","#E84848","#C02020","#F05858","#A00808","#F07070"],discPairs:[["#F88080","#600808"],["#F06868","#580808"],["#E85050","#500808"],["#F07878","#580808"],["#E04040","#480808"],["#F06868","#580808"],["#D83030","#400808"],["#F88080","#600808"],["#F07070","#580808"],["#E85858","#500808"],["#F06868","#580808"],["#E04040","#480808"],["#F06060","#500808"],["#D83030","#400808"]],heatIdx:5},{id:"warm-sunset",name:"Pôr do Sol",icon:"🌅",desc:"Laranja, amarelo e rosa — vibrante e caloroso",discColors:["#F08020","#E06010","#C04008","#F8A040","#D87020","#FFC060","#C85010","#FF9030","#E07818","#F0A030","#D06010","#FFB050","#C04808","#F89828"],discPairs:[["#FFD080","#602008"],["#FFB860","#581808"],["#FFA040","#501008"],["#FFC070","#581808"],["#FF9030","#480808"],["#FFB860","#581808"],["#F07820","#400808"],["#FFD080","#602008"],["#FFC060","#581808"],["#FFB040","#501008"],["#FFB860","#581808"],["#FF9030","#480808"],["#FFB050","#500808"],["#F07820","#400808"]],heatIdx:4},{id:"mono-slate",name:"Monocromático",icon:"⬛",desc:"Cinzas e azul-ardósia — minimalista e profissional",discColors:["#4A5568","#2D3748","#1A202C","#718096","#606878","#8A9BB0","#3A4558","#506070","#5A6878","#3C4A5C","#687888","#2A3848","#485868","#7A8898"],discPairs:[["#A0B0C8","#1A2438"],["#8898B0","#182030"],["#7888A0","#161C28"],["#98A8C0","#182030"],["#6878A0","#141828"],["#8898B0","#182030"],["#5868A0","#101828"],["#A0B0C8","#1A2438"],["#90A0B8","#182030"],["#7888A0","#161C28"],["#8898B0","#182030"],["#6878A0","#141828"],["#7888A8","#161C28"],["#5868A0","#101828"]],heatIdx:5}];let _paletaAtiva="aw-amber";function aplicarPaleta(t){const e=PALETAS_CATALOGO.find(e=>e.id===t);e&&(_paletaAtiva=t,sincronizarCoresObra(),"function"==typeof gRender&&gRender(),"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma(),"fornecedores"===abaAtiva&&renderFornecedores(),showToast(`Paleta "${e.name}" aplicada`))}function abrirCfgVisuais(){document.getElementById("modal-paleta")?.remove();const t=document.createElement("div");t.id="modal-paleta",t.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;",t.addEventListener("click",e=>{e.target===t&&t.remove()});const e=document.createElement("div");e.style.cssText="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.4);width:100%;max-width:780px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;";const o=document.createElement("div");o.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:18px 24px 14px;border-bottom:1px solid var(--divider);flex-shrink:0;",o.innerHTML='\n <div><div style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);">Paletas de Cores</div><div style="font-family:var(--body);font-size:11px;color:var(--txt-dim);margin-top:3px;">Escolha uma paleta global — afeta Cronograma, Efetivo, Histograma e Fornecedores</div></div><button onclick="document.getElementById(\'modal-paleta\').remove()"\n style="width:28px;height:28px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:6px;cursor:pointer;font-size:14px;color:var(--txt-muted);display:flex;align-items:center;justify-content:center;">✕</button>\n ',e.appendChild(o);const a=document.createElement("div");a.style.cssText="flex:1;overflow-y:auto;padding:20px 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;",PALETAS_CATALOGO.forEach(e=>{const o=e.id===_paletaAtiva,n=document.createElement("div");n.style.cssText=`border:2px solid ${o?"var(--accent)":"var(--border)"};border-radius:10px;padding:12px;cursor:pointer;background:${o?"var(--accent-light)":"var(--bg-surface)"};transition:all .15s;`,n.addEventListener("mouseenter",()=>{e.id!==_paletaAtiva&&(n.style.borderColor="var(--accent-border)")}),n.addEventListener("mouseleave",()=>{e.id!==_paletaAtiva&&(n.style.borderColor="var(--border)")}),n.addEventListener("click",()=>{aplicarPaleta(e.id),t.remove()});const r=document.createElement("div");r.style.cssText="display:flex;flex-direction:column;gap:3px;margin-bottom:10px;",[e.discColors.slice(0,7),e.discColors.slice(7,14)].forEach(t=>{const e=document.createElement("div");e.style.cssText="display:flex;gap:2px;",t.forEach(t=>{const o=document.createElement("div");o.style.cssText=`flex:1;height:14px;border-radius:3px;background:${t};`,e.appendChild(o)}),r.appendChild(e)}),n.appendChild(r);const i=document.createElement("div");i.style.cssText="display:flex;align-items:center;gap:6px;margin-bottom:3px;",i.innerHTML=`<span style="font-size:14px;">${e.icon}</span><span style="font-family:var(--font);font-size:11px;font-weight:700;color:var(--txt);">${e.name}</span>${o?'<span style="margin-left:auto;font-size:9px;font-family:var(--font);font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.06em;">Ativa</span>':""}`,n.appendChild(i);const s=document.createElement("div");s.style.cssText="font-family:var(--body);font-size:10px;color:var(--txt-dim);line-height:1.4;",s.textContent=e.desc,n.appendChild(s);const d=HEAT_PALETTES[e.heatIdx-1];if(d){const t=document.createElement("div");t.style.cssText="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-top:8px;";for(let e=0;e<8;e++){const o=d.stops.length-1,a=e/7*o,n=Math.min(Math.floor(a),o-1),r=a-n,i=d.stops[n],s=d.stops[n+1],l=parseInt(i.slice(1,3),16),c=parseInt(i.slice(3,5),16),p=parseInt(i.slice(5,7),16),f=parseInt(s.slice(1,3),16),u=parseInt(s.slice(3,5),16),g=parseInt(s.slice(5,7),16),m=Math.round(l+(f-l)*r),b=Math.round(c+(u-c)*r),x=Math.round(p+(g-p)*r),h=document.createElement("div");h.style.cssText=`flex:1;background:rgb(${m},${b},${x});`,t.appendChild(h)}n.appendChild(t)}a.appendChild(n)});const n=document.createElement("div");n.style.cssText="flex-shrink:0;padding:16px 24px 20px;border-top:1px solid var(--divider);";const r=document.createElement("div");r.style.cssText="font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);margin-bottom:12px;",r.textContent="Cores dos Grupos",n.appendChild(r);const i=document.createElement("div");i.style.cssText="font-family:var(--body);font-size:10px;color:var(--txt-dim);margin-bottom:14px;",i.textContent="Define a cor de ARQ (Arquitetura), TEC (Técnicos) e OBRA independentemente da paleta global.",n.appendChild(i);const s=document.createElement("div");s.style.cssText="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;",[{key:"ARQ",label:"Arquitetura",momKey:"ARQ_MOM",bgKey:"ARQ_BG",rampKey:"ARQ_RAMP"},{key:"TEC",label:"Técnicos",momKey:"TEC_MOM",bgKey:"TEC_BG",rampKey:"TEC_RAMP"},{key:"OBRA",label:"Obra",momKey:"OBRA_MOM",bgKey:"OBRA_BG",rampKey:"OBRA_RAMP"}].forEach(t=>{const e=document.createElement("div");e.style.cssText="display:flex;flex-direction:column;gap:6px;";const o=document.createElement("div");o.style.cssText="font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:.05em;",o.textContent=t.label,e.appendChild(o);const a=document.createElement("div");a.style.cssText="display:flex;flex-wrap:wrap;gap:5px;",COR_OPCOES_GRUPO.forEach(e=>{const o=COR[t.momKey]===e.mom,n=document.createElement("button");n.title=e.name,n.style.cssText=`width:28px;height:28px;border-radius:6px;border:2px solid ${o?"#fff":"transparent"};background:${e.mom};cursor:pointer;outline:${o?"2px solid var(--accent)":"none"};outline-offset:1px;transition:all .12s;`,n.addEventListener("click",()=>{COR[t.momKey]=e.mom,COR[t.bgKey]=e.bg,COR[t.rampKey]=[...e.ramp],"OBRA"===t.key?(sincronizarCoresObra(),"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma(),"fornecedores"===abaAtiva&&renderFornecedores()):sincronizarCoresObra(),"function"==typeof gRender&&gRender(),a.querySelectorAll("button").forEach(t=>{t.style.border="2px solid transparent",t.style.outline="none"}),n.style.border="2px solid #fff",n.style.outline="2px solid var(--accent)",showToast(`${t.label} → ${e.name}`)}),a.appendChild(n)});const n=document.createElement("div");n.style.cssText="position:relative;width:28px;height:28px;flex-shrink:0;",n.title="Cor personalizada";const r=document.createElement("div");r.style.cssText="width:28px;height:28px;border-radius:6px;border:2px solid var(--border-md);background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;",r.textContent="✎",r.style.color="#fff",r.style.textShadow="0 1px 2px rgba(0,0,0,.6)";const i=document.createElement("input");i.type="color",i.value=COR[t.momKey],i.style.cssText="position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;",i.addEventListener("input",()=>{const e=i.value,o=Array.from({length:10},(t,o)=>lightenHex(e,.7*(.85-.07*o)));COR[t.momKey]=e,COR[t.bgKey]=lightenHex(e,.92),COR[t.rampKey]=o,"OBRA"===t.key?(sincronizarCoresObra(),"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma(),"fornecedores"===abaAtiva&&renderFornecedores()):sincronizarCoresObra(),"function"==typeof gRender&&gRender(),a.querySelectorAll("button").forEach(t=>{t.style.border="2px solid transparent",t.style.outline="none"}),r.style.border="2px solid #fff",r.style.outline="2px solid var(--accent)",showToast(`${t.label} → cor personalizada`)}),n.appendChild(r),n.appendChild(i),a.appendChild(n),e.appendChild(a);const d=document.createElement("div");d.style.cssText="display:flex;gap:2px;height:6px;border-radius:3px;overflow:hidden;",COR[t.rampKey].slice(0,6).forEach(t=>{const e=document.createElement("div");e.style.cssText=`flex:1;background:${t};`,d.appendChild(e)}),e.appendChild(d),s.appendChild(e)}),n.appendChild(s);const d=document.createElement("div");d.style.cssText="flex-shrink:0;padding:12px 24px;border-top:1px solid var(--divider);display:flex;align-items:center;justify-content:space-between;",d.innerHTML='\n <span style="font-family:var(--body);font-size:10px;color:var(--txt-dim);">Clique em qualquer paleta para aplicar imediatamente</span><button onclick="document.getElementById(\'modal-paleta\').remove()"\n style="height:30px;padding:0 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.06em;cursor:pointer;text-transform:uppercase;">\n Fechar\n </button>\n ',e.appendChild(d),e.insertBefore(n,d),t.appendChild(e),document.body.appendChild(t)}let _toastTimer=null;function showToast(t,e=2400){const o=document.getElementById("toast");o.textContent=t,o.classList.add("show"),clearTimeout(_toastTimer),_toastTimer=setTimeout(()=>o.classList.remove("show"),e)}const CALENDARIO=function(){function iso(t){return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0")}function addD(t,e){const o=new Date(t);return o.setDate(o.getDate()+e),o}function buildAno(t){const e=function(t){const e=t%19,o=Math.floor(t/100),a=t%100,n=Math.floor(o/4),r=o%4,i=Math.floor((o+8)/25),s=(19*e+o-n-Math.floor((o-i+1)/3)+15)%30,d=(32+2*r+2*Math.floor(a/4)-s-a%4)%7,l=Math.floor((e+11*s+22*d)/451),c=Math.floor((s+d-7*l+114)/31);return new Date(t,c-1,(s+d-7*l+114)%31+1)}(t);return[...[[1,1],[21,4],[1,5],[7,9],[12,10],[2,11],[15,11],[20,11],[25,12]].map(([e,o])=>new Date(t,o-1,e)),addD(e,-48),addD(e,-47),addD(e,-2),addD(e,60)].map(iso)}function saveExtras(t){try{localStorage.setItem("aw_feriados_extras",JSON.stringify(t))}catch(t){}}let t=new Set,e={},o=function(){try{const t=localStorage.getItem("aw_feriados_extras");return t?JSON.parse(t):[]}catch(t){return[]}}();function rebuild(){t=new Set;for(let o=2024;o<=2032;o++)e[o]||(e[o]=buildAno(o)),e[o].forEach(e=>t.add(e));o.forEach(e=>t.add(e))}return rebuild(),{isNaoUtil(e){const o=e.getDay();return 0===o||6===o||t.has(iso(e))},isFeriado:e=>t.has(iso(e)),feriadosDoAno:t=>(e[t]||(e[t]=buildAno(t)),[...e[t]].sort()),getExtras:()=>[...o],addExtra(t){o.includes(t)||(o.push(t),saveExtras(o),rebuild())},removeExtra(t){o=o.filter(e=>e!==t),saveExtras(o),rebuild()},contarDU(t,e){let o=0,a=new Date(t);const n=new Date(e).setHours(23,59,59,999);for(;a<=new Date(n);)this.isNaoUtil(a)||o++,a.setDate(a.getDate()+1);return o},iso:iso}}();function addBusinessDays(t,e){if(e<=0)return new Date(t);let o=new Date(t),a=1;for(;a<e;)o.setDate(o.getDate()+1),CALENDARIO.isNaoUtil(o)||a++;return o}const COR={ARQ_MOM:"#1A5294",TEC_MOM:"#2A7A5A",OBRA_MOM:"#7A4A10",ARQ_BG:"#EEF2FA",TEC_BG:"#EEF8F2",OBRA_BG:"#FEF6EC",ARQ_RAMP:["#5A8ACC","#4A7ABE","#3A6AAF","#2E5E9E","#24528E","#1A467E","#123A6E","#0C2E5E","#08244E","#041A3E"],TEC_RAMP:["#5AAA8A","#4A9A7A","#3A8A6A","#348062","#2E765A","#286C52","#22624A","#1C5840","#164E38","#104430"],OBRA_RAMP:["#D4922A","#C07820","#A86018","#986010","#884808","#784008","#683008","#582808","#482008","#381808"]},COR_OPCOES_GRUPO=[{id:"azul",name:"Azul",mom:"#1A5294",bg:"#EEF2FA",ramp:["#5A8ACC","#4A7ABE","#3A6AAF","#2E5E9E","#24528E","#1A467E","#123A6E","#0C2E5E","#08244E","#041A3E"]},{id:"verde",name:"Verde",mom:"#2A7A5A",bg:"#EEF8F2",ramp:["#5AAA8A","#4A9A7A","#3A8A6A","#348062","#2E765A","#286C52","#22624A","#1C5840","#164E38","#104430"]},{id:"amber",name:"Âmbar",mom:"#7A4A10",bg:"#FEF6EC",ramp:["#D4922A","#C07820","#A86018","#986010","#884808","#784008","#683008","#582808","#482008","#381808"]},{id:"roxo",name:"Roxo",mom:"#6020B0",bg:"#F4EEFB",ramp:["#A060E0","#9050D0","#8040C0","#7030B0","#6020A0","#501890","#401080","#300870","#200860","#100850"]},{id:"coral",name:"Coral",mom:"#C01818",bg:"#FAEAEA",ramp:["#E84848","#D83838","#C82828","#B81818","#A81010","#980808","#880808","#780808","#680808","#580808"]},{id:"ciano",name:"Ciano",mom:"#007890",bg:"#E8F8FA",ramp:["#00BEEF","#00A8D8","#0090C0","#007AA8","#006490","#005078","#003C60","#002848","#001830","#000C18"]},{id:"laranja",name:"Laranja",mom:"#C04808",bg:"#FEF4EC",ramp:["#F07820","#E06810","#D05808","#C04808","#B03808","#A02808","#902008","#801808","#701008","#600808"]},{id:"cinza",name:"Grafite",mom:"#3A4558",bg:"#F0F2F4",ramp:["#6A7888","#5A6878","#4A5868","#3A4858","#2A3848","#1A2838","#0E1C28","#081218","#040C10","#020608"]}],G={MS:864e5,ROW_H:26,SUB_H:28,SEG_N:8,get LBL_W(){return(ESTADO&&ESTADO.cfg&&ESTADO.cfg.lblW)||158},SUB_IDS:["lev","ep1","ep2","baseAP","ap","compatAP","baseEX","ex","compatEX","aprovCond"],SUB_NAMES:{lev:"Lev. Físico",ep1:"EP1",ep2:"EP2",baseAP:"Base AP",ap:"AP ARQ",compatAP:"Compat AP",baseEX:"Base EX",ex:"EX ARQ",compatEX:"Compat EX",aprovCond:"Aprov. Cond."},SUB_LENS:[3,2,10,1,10,2,1,8,2,10],SUB_DEF_REL:["FI","FI","FI","II","FI","FI","FI","II","FI","II"],SUB_DEF_SRC:[null,null,null,2,2,null,null,5,null,6],TEC_IDS:["koTec","epTec","apTec","exTec"],TEC_NAMES:{koTec:"Kickoff Proj. Téc.",epTec:"EP Técnicos",apTec:"AP Técnicos",exTec:"EX Técnicos"},TEC_LENS:[1,10,10,10],TEC_REL_ST:["II_ARQ","FI","FI","FI"],TEC_REL_EN:["livre","FF","FF","FF"],TEC_SRC_ST:[null,0,1,2],TEC_SRC_EN:[null,2,4,7],get C_ARQ(){return COR.ARQ_RAMP},get C_TEC(){return COR.TEC_RAMP},ms:t=>t instanceof Date?t.getTime():t,clone:t=>new Date(G.ms(t)),addD:(t,e)=>new Date(G.ms(t)+e*G.MS),diff:(t,e)=>Math.round((G.ms(e)-G.ms(t))/G.MS),fmtBR:t=>t.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),fmtISO:t=>new Date(G.ms(t)-6e4*t.getTimezoneOffset()).toISOString().slice(0,10),parseD:t=>{const[e,o,a]=t.split("-").map(Number);return new Date(e,o-1,a,12,0,0)},today:(()=>{const t=new Date;return t.setHours(12,0,0,0),t})(),snapMon:t=>{const e=new Date(G.ms(t)),o=(e.getDay()+6)%7;return e.setDate(e.getDate()-o),e.setHours(12,0,0,0),e},segLen:t=>G.diff(t.start,t.end)/G.SEG_N,segToDate:(t,e)=>G.addD(t.start,e*G.segLen(t)),dateToSeg:(t,e)=>G.diff(t.start,e)/G.segLen(t),parentSpan:t=>({start:new Date(Math.min(...G.SUB_IDS.map(e=>G.ms(t[e].start)))),end:new Date(Math.max(...G.SUB_IDS.map(e=>G.ms(t[e].end))))}),parentSpanTec:t=>({start:new Date(Math.min(...G.TEC_IDS.map(e=>G.ms(t[e]?.start||Date.now())))),end:new Date(Math.max(...G.TEC_IDS.map(e=>G.ms(t[e]?.end||Date.now()))))}),cascade(t,e,o,a,n){const r=G.SUB_IDS.reduce((e,o)=>({...e,[o]:{start:G.clone(t[o].start),end:G.clone(t[o].end)}}),{}),i=a||G.SUB_DEF_REL,s=n||G.SUB_DEF_SRC;for(let t=o;t<G.SUB_IDS.length-1;t++){if(!e[t])continue;const o=G.SUB_IDS[t+1],a=G.SUB_IDS[null!==s[t+1]?s[t+1]:t],n=i[t+1]||"FI",d=Math.max(CALENDARIO.contarDU(r[o].start,r[o].end),1);let l;if("II"===n){l=G.clone(r[a].start);}else if("FF"===n){r[o]={start:addBusinessDays(G.clone(r[a].end),-(d-1)),end:G.clone(r[a].end)};continue;}else for(l=G.addD(r[a].end,1);CALENDARIO.isNaoUtil(l);)l=G.addD(l,1);const c=addBusinessDays(l,d);r[o]={start:l,end:c}}return r}},DISC_DEFS=[{id:"eletrica",label:"Elétrica",start:1,end:7,tasks:[{n:"Calhas de sistemas",prep:!1,prof:4,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Perfilado de iluminação",prep:!1,prof:3,m:{1:50,2:50,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Infra alimentadores",prep:!1,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Cabeamento iluminação",prep:!1,prof:3,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},{n:"Infra de piso",prep:!1,prof:2,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},{n:"Quadros e luminárias",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:50,6:50,7:0,8:0}},{n:"Conectorização total",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:25,7:75,8:0}}]},{id:"ac",label:"Ar Condicionado",start:1,end:8,tasks:[{n:"Retiradas / remanejamentos",prep:!1,prof:3,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Dutos de insuflamento",prep:!1,prof:4,m:{1:25,2:25,3:25,4:25,5:0,6:0,7:0,8:0}},{n:"Rede frigorífica",prep:!1,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Equipamentos no forro",prep:!1,prof:3,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},{n:"Caixas e difusores",prep:!1,prof:2,m:{1:0,2:0,3:0,4:25,5:75,6:0,7:0,8:0}},{n:"Startup e balanceamento",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:25,7:50,8:25}}]},{id:"gesso",label:"Gesso / Drywall",start:1,end:5,tasks:[{n:"Marcação",prep:!1,prof:1,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Paredes — 1 chapa",prep:!1,prof:5,m:{1:50,2:50,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Paredes fechadas",prep:!1,prof:5,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Cortineiros e tabeiras",prep:!1,prof:3,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},{n:"Forro gesso",prep:!1,prof:4,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},{n:"Masseamento / lixa forro",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:100,6:0,7:0,8:0}}]},{id:"civil",label:"Civil",start:1,end:5,tasks:[{n:"Demolições",prep:!1,prof:5,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Proteções",prep:!1,prof:3,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Piso elevado — retiradas",prep:!1,prof:4,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Hidráulica e esgoto",prep:!1,prof:3,m:{1:0,2:100,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Drenos com testes",prep:!1,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},{n:"Piso frio / cerâmica",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:100,6:0,7:0,8:0}}]},{id:"spk",label:"SPK / Hidrante",start:1,end:7,tasks:[{n:"Retirada de ramais",prep:!1,prof:3,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Reposicionamento / rede",prep:!1,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Canetas no forro",prep:!1,prof:2,m:{1:0,2:0,3:0,4:25,5:75,6:0,7:0,8:0}},{n:"Testes e pressurização",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}]},{id:"sdai",label:"SDAI / Detecção",start:1,end:7,tasks:[{n:"Retirada de dispositivos",prep:!1,prof:2,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},{n:"Cabeamento teto",prep:!1,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},{n:"Bases e detectores",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:50,6:50,7:0,8:0}},{n:"Endereçamento e testes",prep:!1,prof:1,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}]},{id:"dados",label:"Dados / TI",start:3,end:7,tasks:[{n:"Cabeamento teto",prep:!1,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},{n:"Cabeamento piso",prep:!1,prof:2,m:{1:0,2:0,3:0,4:100,5:0,6:0,7:0,8:0}},{n:"Racks e patch panels",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:100,6:0,7:0,8:0}},{n:"Conectorização mobiliário",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}]},{id:"pintura",label:"Pintura",start:2,end:8,tasks:[{n:"Masseamento paredes",prep:!1,prof:3,m:{1:0,2:25,3:50,4:25,5:0,6:0,7:0,8:0}},{n:"Masseamento forro",prep:!1,prof:3,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},{n:"Lixa teto + 1ª demão",prep:!1,prof:4,m:{1:0,2:0,3:0,4:0,5:100,6:0,7:0,8:0}},{n:"2ª demão",prep:!1,prof:4,m:{1:0,2:0,3:0,4:0,5:0,6:100,7:0,8:0}},{n:"Revisões e retoques",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:50,8:50}}]},{id:"forro",label:"Forro Modular",start:4,end:6,tasks:[{n:"Estrutura forro modular",prep:!1,prof:4,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},{n:"Placa técnica",prep:!1,prof:4,m:{1:0,2:0,3:0,4:25,5:50,6:25,7:0,8:0}},{n:"Plaqueamento / revisão",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:100,7:0,8:0}}]},{id:"piso",label:"Piso / Carpete",start:5,end:7,tasks:[{n:"Recebimento",prep:!1,prof:1,m:{1:0,2:0,3:0,4:0,5:50,6:50,7:0,8:0}},{n:"Instalação carpete / vinílico",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:100,7:0,8:0}},{n:"Pisos especiais",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:100,8:0}}]},{id:"marcenaria",label:"Marcenaria",start:2,end:7,tasks:[{n:"Follow shop drawings",prep:!0,prof:1,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Aprovação com arquitetura",prep:!0,prof:1,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},{n:"Instalação rodapé",prep:!1,prof:2,m:{1:0,2:0,3:0,4:100,5:0,6:0,7:0,8:0}},{n:"Instalação marcenaria",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}]},{id:"vidros",label:"Vidros / DPT",start:2,end:7,tasks:[{n:"Follow e medições",prep:!0,prof:1,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Instalação vidros",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}},{n:"Instalação DPTs",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}},{n:"DPT retrátil — painéis",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:100,8:0}}]},{id:"mobiliario",label:"Mobiliário",start:2,end:8,tasks:[{n:"Agendamento (mín. 15 dias)",prep:!0,prof:1,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},{n:"Instalação mobiliário",prep:!1,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}},{n:"Mobiliário decorativo",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:100}}]},{id:"multimidia",label:"Multimídia",start:3,end:8,tasks:[{n:"Cabeamento teto / forro",prep:!1,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},{n:"Instalação e interfaces",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:25,7:50,8:25}},{n:"Testes integrados",prep:!1,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:25,8:75}}]}],gSt={projFases:[],obraFases:[],axisStart:null,totalDays:0,dayW:0,zoom:1,_obraVinculadaCond:!0,_obraArqSrc:"aprovCond",_visitaVinculada:!0,_visitaDate:null};function gMakeTecSubs(t,e){const o={};return G.TEC_IDS.forEach((a,n)=>{let r,i;if(0===n){let o=e?new Date(e):new Date(t[G.SUB_IDS[0]].start);for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);r=G.clone(o);i=G.clone(o)}else{for(r=G.addD(o[G.TEC_IDS[n-1]].end,1);CALENDARIO.isNaoUtil(r);)r=G.addD(r,1);const e=G.TEC_SRC_EN[n];i=null!==e?new Date(t[G.SUB_IDS[e]].end):addBusinessDays(r,G.TEC_LENS[n])}o[a]={start:G.clone(r),end:G.clone(i)}}),o}function gCascadeTec(t,e,o,a,n){const r={},i=t||{};G.TEC_IDS.forEach((t,o)=>{const a=i[t];if(a)r[t]={start:G.clone(a.start),end:G.clone(a.end)};else{const a=e?new Date(e[G.SUB_IDS[0]].start):G.today;r[t]={start:G.clone(a),end:addBusinessDays(G.clone(a),G.TEC_LENS[o])}}});const s=n||{};return G.TEC_IDS.forEach((t,n)=>{const d=s[t]?.st??G.TEC_REL_ST[n],l=s[t]?.en??G.TEC_REL_EN[n],c=!a||!1!==a[t]?.st,p=!a||!1!==a[t]?.en;if(c){let a;if("VIS"===d){let t=o?new Date(o):e&&e[G.SUB_IDS[0]]?new Date(e[G.SUB_IDS[0]].start):new Date(G.today);for(;CALENDARIO.isNaoUtil(t);)t=G.addD(t,1);for(a=G.addD(t,1);CALENDARIO.isNaoUtil(a);)a=G.addD(a,1)}else if("FI_ARQ"!==d&&"II_ARQ"!==d||!e)if("FI"===d&&n>0)for(a=G.addD(r[G.TEC_IDS[n-1]].end,1);CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);else"II"===d&&n>0&&(a=G.clone(r[G.TEC_IDS[n-1]].start));else{const o=e[s[t]?.srcArqId||G.SUB_IDS[0]];if(o)if("FI_ARQ"===d)for(a=G.addD(new Date(o.end),1);CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);else{for(a=new Date(o.start);CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);a.setHours(12,0,0,0);}}if(a){a.setHours(12,0,0,0);r[t].start=a;}}if(p&&"FF"===l){const o=void 0!==s[t]?.srcArqIdEn?G.SUB_IDS.indexOf(s[t].srcArqIdEn):G.TEC_SRC_EN[n];null!==o&&o>=0&&e&&e[G.SUB_IDS[o]]&&(r[t].end=new Date(e[G.SUB_IDS[o]].end))}else if(!p||"livre"===l){const e=i[t]?.end,o=i[t]?.start,a=e&&o&&G.ms(e)>G.ms(o)?Math.max(1,CALENDARIO.contarDU(new Date(o),new Date(e))):G.TEC_LENS[n];const _eClone=a<=1?G.clone(r[t].start):addBusinessDays(r[t].start,a-1);_eClone.setHours(12,0,0,0);r[t].end=_eClone;}for(;CALENDARIO.isNaoUtil(r[t].end);)r[t].end=G.addD(r[t].end,1);r[t].start.setHours(12,0,0,0);r[t].end.setHours(12,0,0,0);}),r}function gMakeSubs(t,e=0){const o={};let a=e?addBusinessDays(t,e):new Date(t);for(;CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);return G.SUB_IDS.forEach((t,e)=>{const n=addBusinessDays(a,G.SUB_LENS[e]);if(o[t]={start:G.clone(a),end:G.clone(n)},e<G.SUB_IDS.length-1){const t=G.SUB_DEF_SRC[e+1];a=G.clone(n),null===t&&"II"===G.SUB_DEF_REL[e+1]&&(a=G.clone(a))}}),o}function gMakeDiscFase(){return getDiscDefs().map(t=>({id:t.id,label:t.label,ativo:!0,start:t.start??1,end:t.end??8,tasks:(t.tasks||[]).map(t=>({n:t.n,prep:t.prep,prof:t.prof||0,m:{...t.m}}))}))}function gRecalcDiscSpan(t){let e=9,o=0;t.tasks.forEach(t=>{for(let a=1;a<=8;a++)(t.m[a]||0)>0&&(a<e&&(e=a),a>o&&(o=a))}),t.start=e<=o?e:1,t.end=e<=o?o:1}function gMakeProjFase(t,e){const o=gMakeSubs(e,0),a=Array(G.SUB_IDS.length-1).fill(!0),n=[...G.SUB_DEF_REL],r=[...G.SUB_DEF_SRC],i=G.cascade(o,a,0,n,r),s=gSt._visitaDate||null,d=gMakeTecSubs(i,s),l={};G.TEC_IDS.forEach(t=>{l[t]={st:!0,en:!0}});const c=gCascadeTec(d,i,s,l,null);return{id:t,locked:!0,nome:"",expanded:{arq:!1,tec:!1},chains:{arq:[...a]},chainTypes:{arq:[...n]},chainSrc:{arq:[...r]},chainExternal:{},tecChains:l,tecChainTypes:{},rows:{arq:{...G.parentSpan(i),subs:i},tec:{...G.parentSpanTec(c),subs:c}}}}function gMakeObraFase(t,e){
  const o=G.addD(e,5);
  const cfgFase=ESTADO.cfg.obraFases?.[t-1]||{};
  const tplId=cfgFase.templateId;
  let discs=null;
  if(tplId && typeof _tplGetDiscsCopy==='function'){
    discs=_tplGetDiscsCopy(tplId);
  }
  return{id:t,nome:"",expanded:!1,obra:{start:o,end:G.addD(o,56)},disciplinas:discs||gMakeDiscFase()};
}function motorRecalc(){const t=ESTADO.cfg;let e=G.today;if(t.visita)try{e=G.parseD(t.visita)}catch(t){}else if(t.dnn)try{e=addBusinessDays(G.parseD(t.dnn),7)}catch(t){}for(;CALENDARIO.isNaoUtil(e);)e=G.addD(e,1);gSt._visitaDate=t.visita?G.parseD(t.visita):null;const o=t.nProj||1;for(;gSt.projFases.length<o;){const t=gSt.projFases.length>0?G.addD(gSt.projFases[gSt.projFases.length-1].rows.arq.end,5):e;gSt.projFases.push(gMakeProjFase(gSt.projFases.length+1,t))}if(gSt.projFases.length=o,gSt.projFases[0]){const e=gSt.projFases[0].rows.arq.subs.lev;if(t.visita){const o=G.parseD(t.visita);Math.abs(G.ms(e.start)-G.ms(o))>G.MS&&(gSt.projFases[0]=gMakeProjFase(1,o))}}const a=t.nObra||1,n=gSt.projFases.length>0?new Date(Math.max(...gSt.projFases.map(t=>G.ms(t.rows.arq.end)))):e;for(;gSt.obraFases.length<a;){const e=gSt.obraFases.length,o=t.obraFases[e]||{};let a;if(o.inicio)try{a=G.parseD(o.inicio)}catch(t){a=G.addD(n,5)}else a=G.addD(n,5+60*e);for(;CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);const r=parseInt(o.prazo)||56,i=gMakeObraFase(e+1,G.addD(a,-5));i.obra.start=G.clone(a),i.obra.end=G.addD(a,r),gSt.obraFases.push(i)}gSt.obraFases.length=a;for(let e=0;e<a;e++){const o=t.obraFases[e]||{};if(o.inicio)try{const t=G.parseD(o.inicio),a=parseInt(o.prazo)||56;for(;CALENDARIO.isNaoUtil(t);)G.addD(t,1);gSt.obraFases[e].obra.start=G.clone(t),gSt.obraFases[e].obra.end=G.addD(t,a)}catch(t){}}gRecalcAxis(),window.__AW_ESTADO=ESTADO,window.__AW_GST=gSt}function gRecalcAxis(){const t=[];if(gSt.projFases.forEach(e=>{G.SUB_IDS.forEach(o=>{t.push(G.ms(e.rows.arq.subs[o].start),G.ms(e.rows.arq.subs[o].end))}),G.TEC_IDS.forEach(o=>{const a=e.rows.tec.subs[o];a&&t.push(G.ms(a.start),G.ms(a.end))})}),gSt.obraFases.forEach(e=>{t.push(G.ms(e.obra.start),G.ms(e.obra.end))}),!t.length)return;gSt.axisStart=G.snapMon(G.addD(new Date(Math.min(...t)),-7));const e=G.addD(new Date(Math.max(...t)),14);gSt.totalDays=G.diff(gSt.axisStart,e)}function atualizarResumoDatas(){const t=document.getElementById("resumo-datas");if(!t)return;if(!gSt.projFases.length)return void(t.innerHTML="");const e=gSt.projFases[0],fmtD=t=>t?G.fmtBR(t)+"/"+t.getFullYear().toString().slice(2):"—",o=[{lbl:"Lev. Físico início",val:fmtD(e.rows.arq.subs.lev?.start)},{lbl:"EP1 fim",val:fmtD(e.rows.arq.subs.ep1?.end)},{lbl:"AP fim",val:fmtD(e.rows.arq.subs.ap?.end)},{lbl:"EX fim",val:fmtD(e.rows.arq.subs.ex?.end)},{lbl:"Kickoff Téc.",val:fmtD(e.rows.tec.subs.koTec?.start)},{lbl:"EX Téc. fim",val:fmtD(e.rows.tec.subs.exTec?.end)}];gSt.obraFases[0]&&(o.push({lbl:"Obra início",val:fmtD(gSt.obraFases[0].obra.start)}),o.push({lbl:"Obra fim",val:fmtD(gSt.obraFases[0].obra.end)})),t.innerHTML=o.map(t=>`\n <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid var(--divider);"><span style="font-family:var(--font);font-size:9px;color:var(--txt-muted);letter-spacing:.04em;text-transform:uppercase;">${t.lbl}</span><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">${t.val}</span></div>\n `).join("")}function gPx(t){return G.diff(gSt.axisStart,t)*gSt.dayW}function gGridLinesTec(t,e,cor){var a=[];t.forEach(function(t,n){var r=Math.round(7*n*gSt.dayW);var i=0===n||t.getDate()<=7;if(i){a.push('<div style="position:absolute;top:0;bottom:0;left:'+r+'px;width:2px;background:rgba(0,0,0,.10);pointer-events:none;z-index:1;"></div>');}for(var o=0;o<7;o++){var r2=new Date(t);r2.setDate(r2.getDate()+o);var i2=Math.round((7*n+o)*gSt.dayW);if(i2+Math.ceil(gSt.dayW)>e)break;var s=r2.getDay();var d=CALENDARIO.isFeriado(r2);var l=0===s||6===s;if(l||d){var _congWk=(typeof _isFrozen==='function'&&_isFrozen());var _wkBg=_congWk?'rgba(0,0,0,0.22)':(d&&!l?'rgba(180,160,100,0.18)':'rgba(0,0,0,0.13)');a.push('<div style="position:absolute;top:0;bottom:0;left:'+i2+'px;width:'+Math.ceil(gSt.dayW)+'px;background:'+_wkBg+';pointer-events:none;z-index:2;"></div>');}}});return a.join("");}
function gGridLines(t,e,o,noWkLine){const a=[];return t.forEach((t,n)=>{const r=Math.round(7*n*gSt.dayW),i=0===n||t.getDate()<=7;if(!noWkLine)a.push(`<div style="position:absolute;top:0;bottom:0;left:${r}px;width:${i?2:1}px;background:${o?"rgba(255,255,255,.15)":i?"#A8B4BE":"#EEF0F4"};pointer-events:none;z-index:1;"></div>`);if(!o)for(let o=0;o<7;o++){const r=new Date(t);r.setDate(r.getDate()+o);const i=Math.round((7*n+o)*gSt.dayW);if(i+Math.ceil(gSt.dayW)>e)break;const s=r.getDay(),d=CALENDARIO.isFeriado(r),l=0===s||6===s;if(l||d){var _cgF=(typeof _isFrozen==='function'&&_isFrozen());const t=d&&!l?"0.20":"0.14",e=_cgF?(d&&!l?"rgba(235,165,55,0.55)":"rgba(228,150,40,0.48)"):(d&&!l?"rgba(180,160,100,"+t+")":"rgba(0,0,0,"+t+")");a.push(`<div style="position:absolute;top:0;bottom:0;left:${i}px;width:${Math.ceil(gSt.dayW)}px;background:${e};pointer-events:none;z-index:0;"></div>`)}}}),a.join("")}function gBar(t,e,o,a,n,r,i,s,d){if(n&&!(n instanceof Date))n=new Date(n);if(r&&!(r instanceof Date))r=new Date(r);const l=o-8,c=i?null:d?CALENDARIO.contarDU(n,r):G.diff(n,r),p=!i&&d?`${c}DU · ${G.fmtBR(n)} – ${G.fmtBR(r)}`:"";let f="";if(d&&e>8){const t=G.diff(n,r)+1;for(let e=0;e<t;e++){const t=new Date(n);t.setDate(t.getDate()+e),CALENDARIO.isNaoUtil(t)&&(f+=`<div style="position:absolute;top:0;bottom:0;left:${Math.round(e*gSt.dayW)}px;width:${Math.ceil(gSt.dayW)}px;background:rgba(255,255,255,.12);pointer-events:none;"></div>`)}}return`<div style="position:absolute;left:${t}px;top:4px;height:${l}px;overflow:visible;pointer-events:none;z-index:4;"><div data-drag="${s}" data-click="${s}" style="position:absolute;left:0;top:0;height:${l}px;width:${Math.max(e,8)}px;background:linear-gradient(135deg,${a}EE,${a}BB);border-radius:4px;border:1px solid rgba(255,255,255,.2);box-shadow:0 2px 5px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.25);cursor:grab;display:flex;align-items:center;overflow:hidden;pointer-events:auto;"> ${f} <div data-drag="${s}" data-mode="left" style="position:absolute;left:0;top:0;bottom:0;width:7px;background:rgba(0,0,0,.18);border-radius:4px 0 0 4px;cursor:ew-resize;z-index:5;"></div><div style="flex:1;text-align:center;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.45);pointer-events:none;white-space:nowrap;overflow:hidden;padding:0 10px;"></div><div data-drag="${s}" data-mode="right" style="position:absolute;right:0;top:0;bottom:0;width:7px;background:rgba(0,0,0,.18);border-radius:0 4px 4px 0;cursor:ew-resize;z-index:5;pointer-events:auto;"></div></div> ${p?`<div style="position:absolute;left:${Math.max(e,8)+5}px;top:0;height:${l}px;display:flex;align-items:center;white-space:nowrap;font-size:10px;font-weight:700;color:${a};pointer-events:none;">${p}</div>`:""}\n</div>`}function gProjRow(t,e,o,a,n,r){const i=t.rows[e],s=darkenHex("arq"===e?COR.ARQ_MOM:COR.TEC_MOM,.75),d="arq"===e?COR.ARQ_BG:COR.TEC_BG,l=gPx(i.start),c=Math.max((G.diff(i.start,i.end)+1)*gSt.dayW,2*gSt.dayW);n.push(`<div class="gn1" style="height:${G.ROW_H}px;background:${d};display:flex;align-items:center;padding:0 5px 0 8px;border-bottom:1px solid #E4EAF0;border-right:2px solid #C0C8D4;font-size:10px;font-weight:700;color:#3A4A5A;gap:3px;"><span style="width:5px;height:5px;border-radius:1px;background:${s};flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${"arq"===e?"Arquitetura":"Técnicos"}</span>${"arq"===e?`<button onclick="gToggleLock(${t.id})" style="background:none;border:1px solid ${t.locked?"#009EA8":"#C0CCD4"};border-radius:3px;cursor:pointer;font-size:8px;padding:0 3px;color:${t.locked?"#009EA8":"#B0BBC8"};line-height:14px;">${t.locked?"🔒":"🔓"}</button>`:""}<button onclick="gToggleProjExpand(${t.id},'${e}')" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 4px;color:#6A7A8A;font-weight:700;line-height:14px;">${("arq"===e?t.expanded.arq:t.expanded.tec)?"▲":"▼"}</button></div>`);const p=encodeURIComponent(JSON.stringify({type:"proj",phId:t.id,rowId:e,subId:null})),f=gBar(l,c,G.ROW_H,s,i.start,i.end,null,p,"arq"===e);r.push(`<div style="height:${G.ROW_H}px;background:${d};position:relative;border-bottom:1px solid #E4EAF0;overflow:hidden;">${gGridLines(o,a,!1,"tec"===e)}${f}</div>`)}function gSubRows(t,e,o,a,n,r){const i="arq"===e?G.C_ARQ:G.C_TEC,s="tec"===e?G.TEC_NAMES:G.SUB_NAMES;("tec"===e?G.TEC_IDS:G.SUB_IDS).forEach((d,l)=>{const c=t.rows[e].subs[d];if(!c)return;const p=i[Math.min(l,i.length-1)],f="tec"===e?COR.TEC_BG:COR.ARQ_BG,u=gPx(c.start),g=Math.max((G.diff(c.start,c.end)+1)*gSt.dayW,gSt.dayW),m="tec"===e,b=!m&&l>0&&t.chains[e][l-1],x=m?"FI":l>0?t.chainTypes?.[e]?.[l]||G.SUB_DEF_REL[l]:"FI",h=m?null:l>0?void 0!==t.chainSrc?.[e]?.[l]?t.chainSrc[e][l]:G.SUB_DEF_SRC[l]:null,A=l>0?`<span title="${b?x+" com "+(m?"":G.SUB_NAMES[G.SUB_IDS[null!==h?h:l-1]]||""):"sem relação"}" style="color:${b?"II"===x?"#E07000":"#009EA8":"#C8D4D8"};flex-shrink:0;display:inline-flex;align-items:center;">${b?"🔗":"⛓️"}</span>`:"",y=m&&0===l&&(!t.tecChains||!1!==t.tecChains?.koTec?.st),E=t.tecChainTypes?.koTec?.st??"II_ARQ",D=t.tecChainTypes?.koTec?.srcArqId??G.SUB_IDS[0];n.push(`<div class="gn1" style="height:${G.SUB_H}px;background:${f};display:flex;align-items:center;padding:0 5px 0 18px;border-bottom:1px solid #E8EFF4;border-right:2px solid #C0C8D4;font-size:9px;font-weight:700;color:#5A6A7A;gap:3px;"><span style="width:4px;height:4px;border-radius:1px;background:${p};flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s[d]||d}</span>${A}${m&&0===l?`<span title="${y?("II_ARQ"===E?"II":"FI")+" com "+(G.SUB_NAMES[D]||D)+" (ARQ)":"desvinculado de ARQ"}" style="color:${y?"II_ARQ"===E?"#E07000":"#009EA8":"#C8D4D8"};flex-shrink:0;display:inline-flex;align-items:center;font-size:10px;">${y?"🔗":"⛓️"}</span>`:""}</div>`);const w=encodeURIComponent(JSON.stringify({type:"proj",phId:t.id,rowId:e,subId:d})),S=gBar(u,g,G.SUB_H,p,c.start,c.end,null,w,!0);r.push((function(){var ov="";if(e==="arq"){var aprDias=getDiasAprovacao(d);for(var _i=0;_i<aprDias.length;_i++){var _iso=aprDias[_i];var _d=new Date(_iso.slice(0,4),parseInt(_iso.slice(5,7))-1,parseInt(_iso.slice(8,10)));var _ax=gPx(_d);var _w=Math.max(gSt.dayW,4);var _fs=Math.max(Math.min(_w+2,13),9);var _sc=ESTADO.cfg&&ESTADO.cfg.aprovaStarColor?ESTADO.cfg.aprovaStarColor:"#FFD600";var _bc=ESTADO.cfg&&ESTADO.cfg.aprovaBgColor?ESTADO.cfg.aprovaBgColor:"#e60a20";var _bh=G.SUB_H-8;ov+='<div title="Aprovação do cliente" style="position:absolute;top:4px;left:'+_ax+'px;width:'+_w+'px;height:'+_bh+'px;border-radius:2px;background:'+_bc+';z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;"><span style="font-size:'+_fs+'px;color:'+_sc+';text-shadow:0 0 3px rgba(0,0,0,.8),0 1px 2px rgba(0,0,0,.6);line-height:1;">★</span></div>';}}return'<div style="height:'+G.SUB_H+'px;background:'+f+';position:relative;border-bottom:1px solid #E8EFF4;overflow:hidden;">'+gGridLines(o,a,false)+S+ov+'</div>';})())})}function gObraRow(t,e,o,a,n){const r=t.obra,i=darkenHex(COR.OBRA_MOM,.75),s=COR.OBRA_BG,d=gPx(r.start),l=Math.max(G.diff(r.start,r.end)*gSt.dayW,2*gSt.dayW),c=G.segLen(r),p=G.ROW_H;a.push('<div class="gt2" style="height:'+(p+12)+"px;background:"+s+';display:flex;align-items:center;padding:0 5px 0 8px;border-bottom:1px solid #EEE0C8;border-right:2px solid #C0C8D4;font-size:10px;font-weight:700;color:#6A3810;text-transform:uppercase;letter-spacing:.04em;gap:3px;"><span style="width:5px;height:5px;border-radius:1px;background:'+i+';flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Obra'+(1===gSt.obraFases.length?" Total":"")+'</span>'+((()=>{const _tplId=(ESTADO.cfg?.obraFases?.find?.((_,_i)=>gSt.obraFases[_i]&&gSt.obraFases[_i].id==t.id)||ESTADO.cfg?.obraFases?.[t.id-1])?.templateId;const _tpl=_tplId&&(typeof tplGetTodos==="function"?tplGetTodos():OBRA_TEMPLATES).find(_t=>_t.id===_tplId);return _tpl?`<span style="font-size:8px;font-weight:700;padding:1px 5px;border-radius:8px;background:rgba(255,255,255,.18);color:#fff;flex-shrink:0;white-space:nowrap;overflow:hidden;max-width:64px;text-overflow:ellipsis;" title="${_tpl.label}">${_tpl.label.replace(/^[^\s]+\s/,"").substring(0,9)}</span>`:"";})())+'</span><button onclick="abrirObraUnificada('+t.id+')" title="Visão unificada" style="background:none;border:1px solid '+i+';border-radius:3px;cursor:pointer;font-size:10px;padding:0 4px;color:'+i+';font-weight:700;line-height:14px;flex-shrink:0;">⊞</button><button onclick="gToggleObraExpand('+t.id+')" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 4px;color:#6A7A8A;font-weight:700;line-height:14px;">'+(t.expanded?"▲":"▼")+"</button></div>");const f=encodeURIComponent(JSON.stringify({type:"obra",phId:t.id,rowId:"obra",subId:null})),u=gBar(d,l,p,i,r.start,r.end,null,f);n.push('<div class="g-obra-tl" style="height:'+(p+12)+"px;background:"+s+';position:relative;border-bottom:1px solid #EEE0C8;overflow:visible;">'+gGridLines(e,o,!1)+'<div style="position:absolute;top:12px;left:0;right:0;height:'+p+'px;overflow:visible;">'+(()=>{let t="";for(let e=0;e<=G.SEG_N;e++){const o=gPx(G.segToDate(r,e));t+=0===e||e===G.SEG_N?'<div style="position:absolute;top:0;bottom:0;left:'+o+'px;width:2px;background:rgba(122,74,16,.55);pointer-events:none;z-index:3;"></div>':'<div style="position:absolute;top:0;bottom:0;left:'+o+'px;width:2px;pointer-events:none;z-index:3;background:repeating-linear-gradient(to bottom,rgba(122,74,16,.45) 0,rgba(122,74,16,.45) 4px,transparent 4px,transparent 8px);"></div>'}return t+='<div style="position:absolute;top:0;bottom:0;left:0;width:'+d+'px;background:rgba(0,0,0,.05);pointer-events:none;z-index:2;"></div>',t+='<div style="position:absolute;top:0;bottom:0;left:'+(d+l)+'px;right:0;background:rgba(0,0,0,.05);pointer-events:none;z-index:2;"></div>',t})()+u+(()=>{let t="";for(let e=0;e<G.SEG_N;e++){const o=gPx(G.segToDate(r,e)),a=c*gSt.dayW;a>22&&(t+='<div style="position:absolute;left:'+(o+2)+"px;width:"+(a-4)+'px;top:0;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:10;overflow:hidden;"><span style="font-size:9px;font-weight:700;color:#F5D060;letter-spacing:.04em;text-shadow:0 1px 3px rgba(0,0,0,.6);white-space:nowrap;">'+(a>60?"Módulo "+(e+1):"M"+(e+1))+"</span></div>")}return t})()+gMarcadoresObra(r,d,l,p,!0)+"</div></div>")}function gDiscRow(t,e,o,a,n,r,i){const s=t.obra,d=G.segLen(s),l=getDiscPal(o),c=gDiscTemIncompleto(e),p=c?"rgba(240,190,0,.18)":"#FEFCF5",f=c?"disc-alerta":"";r.push(`<div class="${f} gn1" style="height:${G.SUB_H}px;background:${p};display:flex;align-items:center;padding:0 5px 0 18px;border-bottom:1px solid #EEE4CC;border-right:2px solid #C0C8D4;gap:5px;cursor:pointer;" onclick="gOpenDiscModal(${t.id},'${e.id}')"><span style="width:5px;height:5px;border-radius:1px;background:${l[1]};flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.label}</span><span style="font-size:11px;color:#B0946A;opacity:.7;">✏</span></div>`),i.push(`<div class="${f}" style="height:${G.SUB_H}px;background:${p};position:relative;border-bottom:1px solid #EEE4CC;overflow:hidden;">${gGridLines(a,n,!1)}${(()=>{if(!e||!e.tasks)return"";const o=Math.min(...e.tasks.flatMap(t=>Object.entries(t.m).filter(([,t])=>t>0).map(([t])=>+t)).filter(t=>t>=1&&t<=8),e.start),a=Math.max(...e.tasks.flatMap(t=>Object.entries(t.m).filter(([,t])=>t>0).map(([t])=>+t)).filter(t=>t>=1&&t<=8),e.end),n=a-o+1,r=d*gSt.dayW;let i="";for(let t=0;t<=G.SEG_N;t++)i+=`<div style="position:absolute;top:0;bottom:0;left:${gPx(G.segToDate(s,t))}px;width:1px;pointer-events:none;z-index:2;background:rgba(122,74,16,.15);"></div>`;for(let d=o;d<=a;d++){const c=d-o,p=gPx(G.segToDate(s,d-1)),f=Math.max(r-1,2),u=e.tasks.filter(t=>(t.m[d]||0)>0);if(!u.length)continue;const g=u.some(t=>!t.prep),m=u.some(t=>t.prep);let b="";1===n?b="3px":0===c?b="3px 0 0 3px":d===a&&(b="0 3px 3px 0"),i+=`<div style="position:absolute;left:${p}px;width:${f}px;top:5px;height:${G.SUB_H-10}px;border-radius:${b};background:linear-gradient(to right,${l[0]},${l[1]});background-size:${100*n+"% 100%"};background-position:${-100*c+"% 0"};opacity:${!g&&m?"0.38":"1"};z-index:3;cursor:pointer;" onclick="gOpenDiscModal(${t.id},'${e.id}')"></div>`}return i})()}</div>`)}function gRender(){const t=document.getElementById("gantt-root");if(!t)return;if(gSt.axisStart||motorRecalc(),!gSt.axisStart)return;if(gSt.projFases.forEach(t=>{if(!1!==gSt._visitaVinculada&&gSt._visitaDate){let e=new Date(gSt._visitaDate);for(;CALENDARIO.isNaoUtil(e);)e=G.addD(e,1);const o=t.rows.arq.subs.lev,a=Math.max(1,CALENDARIO.contarDU(o.start,o.end));o.start=new Date(e),o.end=addBusinessDays(new Date(e),a)}const e=t.rows.arq.subs[G.SUB_IDS[0]];let o=new Date(e.start);for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);const a=Math.max(1,CALENDARIO.contarDU(e.start,e.end));e.start=o,e.end=addBusinessDays(o,a);const n=G.cascade(t.rows.arq.subs,t.chains.arq,0,t.chainTypes?.arq,t.chainSrc?.arq);t.rows.arq.subs=n,t.rows.arq.start=new Date(Math.min(...G.SUB_IDS.map(t=>G.ms(n[t].start)))),t.rows.arq.end=new Date(Math.max(...G.SUB_IDS.map(t=>G.ms(n[t].end)))),t.tecChains||(t.tecChains={}),t.tecChainTypes||(t.tecChainTypes={}),G.TEC_IDS.forEach(e=>{t.tecChains[e]||(t.tecChains[e]={st:!0,en:!0})}),t.rows.tec.subs&&t.rows.tec.subs[G.TEC_IDS[0]]||(t.rows.tec.subs=gMakeTecSubs(t.rows.arq.subs,gSt._visitaDate));const r=gCascadeTec(t.rows.tec.subs,t.rows.arq.subs,gSt._visitaDate,t.tecChains,t.tecChainTypes);t.rows.tec.subs=r,t.rows.tec.start=new Date(Math.min(...G.TEC_IDS.map(t=>G.ms(r[t].start)))),t.rows.tec.end=new Date(Math.max(...G.TEC_IDS.map(t=>G.ms(r[t].end))))}),gSt.projFases.forEach(t=>{t.chainExternal&&Object.keys(t.chainExternal).length&&Object.entries(t.chainExternal).forEach(([e,o])=>{if(!o||!o.srcPhId||!o.srcSubId)return;const a=gSt.projFases.find(t=>t.id==o.srcPhId);if(!a)return;const n=a.rows.arq.subs[o.srcSubId];if(!n)return;const r=t.rows.arq.subs[e];if(!r)return;const i=Math.max(1,CALENDARIO.contarDU(r.start,r.end));if("FI"===o.type){let t=G.addD(new Date(n.end),1);for(;CALENDARIO.isNaoUtil(t);)t=G.addD(t,1);r.start=t,r.end=addBusinessDays(t,i)}else if("II"===o.type){let t=new Date(n.start);for(;CALENDARIO.isNaoUtil(t);)t=G.addD(t,1);r.start=t,r.end=addBusinessDays(t,i)}else if("FF"===o.type)for(r.end=new Date(n.end);CALENDARIO.isNaoUtil(r.end);)r.end=G.addD(r.end,1);const s=G.SUB_IDS.indexOf(e);if(s>=0){const e=G.cascade(t.rows.arq.subs,t.chains.arq,s,t.chainTypes?.arq,t.chainSrc?.arq);t.rows.arq.subs=e}})}),!1!==gSt._obraVinculadaCond&&gSt.projFases.length&&gSt.obraFases.length){const t=gSt._obraArqSrc||"aprovCond",e=gSt.projFases[0].rows.arq.subs[t]?.end;if(e){let t=G.addD(new Date(e),1);for(;CALENDARIO.isNaoUtil(t);)t=G.addD(t,1);gSt.obraFases.forEach(e=>{const o=G.diff(e.obra.start,e.obra.end);e.obra.start=G.clone(t),e.obra.end=G.addD(t,Math.max(o,7))})}}gRecalcAxis(),gSt.dayW=Math.max((t.clientWidth-G.LBL_W-4)/gSt.totalDays,1.2)*gSt.zoom;const e=Math.floor(gSt.totalDays*gSt.dayW),o=[];let a=G.clone(gSt.axisStart);const n=G.addD(gSt.axisStart,gSt.totalDays+7);for(;G.ms(a)<G.ms(n);)o.push(G.clone(a)),a=G.addD(a,7);const r=[],i=[],phaseHdr=(t,a="#1A2535")=>{r.push(`<div class="gt1" style="height:20px;background:${a};display:flex;align-items:center;padding:0 10px;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.08em;border-right:2px solid ${a};">${t}</div>`),i.push(`<div style="height:20px;background:linear-gradient(90deg,${a}CC,${a}44);position:relative;overflow:hidden;">${gGridLines(o,e,!0)}</div>`)},spacer=(t=6)=>{r.push(`<div style="height:${t}px;background:#DDE1E8;border-right:2px solid #C0C8D4;"></div>`),i.push(`<div style="height:${t}px;background:#DDE1E8;"></div>`)};phaseHdr("Projetos",darkenHex(COR.ARQ_MOM,.72));const s=gFasesVinculadas(),d=gSt.projFases.length>1;if(gSt.projFases.forEach((t,a)=>{if(d||s){const n=gProjFaseLabel(t),d=darkenHex(COR.ARQ_MOM,.72),l=s?"obra":"proj",c=s?gSt.obraFases[a]?.id??t.id:t.id,p=s?(gSt.obraFases[a]?.nome||"").replace(/'/g,""):(t.nome||"").replace(/'/g,"");r.push(`<div style="height:20px;background:${d};display:flex;align-items:center;padding:0 8px 0 12px;font-size:9px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;border-right:2px solid ${darkenHex(COR.ARQ_MOM,.6)};gap:6px;"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${n}</span><span onclick="gEditFaseNome('${l}',${c},'${p}',this)" style="cursor:pointer;opacity:.7;font-size:10px;" title="Renomear fase">✎</span></div>`),i.push(`<div style="height:20px;background:linear-gradient(90deg,${d}CC,${d}22);position:relative;">${gGridLines(o,e,!1)}</div>`)}if(gProjRow(t,"arq",o,e,r,i),t.expanded.arq&&gSubRows(t,"arq",o,e,r,i),gProjRow(t,"tec",o,e,r,i),(t.expanded.tec&&(!ESTADO.cfg.tecFornecedores||!ESTADO.cfg.tecFornecedores.length)&&gSubRows(t,"tec",o,e,r,i)),(function(projFase,_r,_i,_o,_e) {
  tecFornGanttInit();
  var forns = ESTADO.cfg.tecFornecedores || [];
  if (!forns.length) return;
  // Visão unificada
  if (tecFornGetView() === 'unificado') { tecFornRenderUnificado(projFase,_r,_i,_o,_e,forns); return; }
  var tecSubs = projFase.rows && projFase.rows.tec && projFase.rows.tec.subs;
  var tecIds = G.TEC_IDS || ['koTec','epTec','apTec','exTec'];
  var tecNames = G.TEC_NAMES || {};
  var tecColors = G.C_TEC || [];
  var colTec = darkenHex(COR.TEC_MOM, .72);
  var bgTec = COR.TEC_BG;
  var allExpanded = forns.some(function(f){return f.expanded !== false;});

  // Substituir barra principal TÉCNICOS com span global + botão toggle all
  var globalSpan = tecFornGetGlobalSpan(tecSubs);
  if (globalSpan && globalSpan.start && globalSpan.end) {
    var gxi = gPx(globalSpan.start);
    var gxw = Math.max((G.diff(globalSpan.start,globalSpan.end)+1)*gSt.dayW, gSt.dayW);
    var gPayload = encodeURIComponent(JSON.stringify({type:'proj',phId:projFase.id,rowId:'tec',subId:null}));
    var gBarHtml = gBar(gxi,gxw,G.ROW_H,colTec,G.fmtISO(globalSpan.start),G.fmtISO(globalSpan.end),null,gPayload,false);
    var lastTlIdx = _i.length-1;
    _i[lastTlIdx] = '<div style="height:'+G.ROW_H+'px;background:'+bgTec+';position:relative;border-bottom:1px solid #E4EAF0;overflow:hidden;">'+gGridLines(_o,_e,false,true)+gBarHtml+'</div>';
    // Injetar botão ▲▲/▼▼ no último r.push (header TÉCNICOS)
    var lastSbIdx = _r.length-1;
    var _tb = '<button onclick="tecFornToggleAll()" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 3px;color:#6A7A8A;font-weight:700;line-height:14px;margin-left:2px;">'+(allExpanded?'\u25b2\u25b2':'\u25bc\u25bc')+'</button>';
    if (_r.length > 0) { var _ls = _r.length-1; var _old = _r[_ls]; var _cut = _old.lastIndexOf("</div>"); if(_cut>=0) _r[_ls] = _old.slice(0,_cut)+_tb+'</div>'+_old.slice(_cut+6); }
  }

  // Cada fornecedor
  forns.forEach(function(forn) {
    var dates = tecFornGetDates(forn, tecSubs);
    var span  = tecFornGetSpan(forn, tecSubs);
    var isExp = forn.expanded !== false;
    var bgH = '#EDF4F0', bdH = '#D8EAE0';

    // Header do fornecedor
    _r.push('<div class="gn1" style="height:'+G.ROW_H+'px;background:'+bgH+';display:flex;align-items:center;padding:0 5px 0 20px;border-bottom:1px solid '+bdH+';border-right:2px solid #C0C8D4;gap:4px;">'
      +'<span style="width:4px;height:4px;border-radius:1px;background:'+colTec+';flex-shrink:0;"></span>'
      +'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;color:'+colTec+';font-size:9px;">'+forn.nome+'</span>'
      +'<span style="font-size:8px;color:#6A9A7A;flex-shrink:0;margin-right:2px;">'+forn.disciplinaId+'</span>'
      +'<button data-fid="'+forn.id+'" onclick="tecFornAbrirModal(this.dataset.fid)" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 5px;color:#6A7A8A;font-weight:700;line-height:14px;margin-right:2px;">✎</button>'+'<button data-fid="'+forn.id+'" onclick="tecFornToggle(this.dataset.fid)" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 4px;color:#6A7A8A;font-weight:700;line-height:14px;">'+(isExp?'\u25b2':'\u25bc')+'</button>'
      +'</div>');

    // Barra span do fornecedor (resumo — arrastável move tudo)
    var spanDragP = encodeURIComponent(JSON.stringify({type:'tecFornAll',fornId:forn.id}));
    if (span && span.start && span.end) {
      var sxi = gPx(span.start);
      var sxw = Math.max((G.diff(span.start,span.end)+1)*gSt.dayW, gSt.dayW);
      var sBarH = Math.max(8, G.ROW_H - 10);
      _i.push('<div style="height:'+G.ROW_H+'px;background:'+bgH+';position:relative;border-bottom:1px solid '+bdH+';overflow:visible;">'
        +gGridLines(_o,_e,false,true)
        +'<div data-drag="'+spanDragP+'" data-mode="move" data-click="'+spanDragP+'"'
        +' style="position:absolute;top:50%;margin-top:-'+Math.round(sBarH/2)+'px;left:'+sxi+'px;width:'+sxw+'px;height:'+sBarH+'px;'
        +'background:'+colTec+';border-radius:4px;opacity:0.45;cursor:grab;pointer-events:auto;">'
        +'</div>'
        +'</div>');
    } else {
      _i.push('<div style="height:'+G.ROW_H+'px;background:'+bgH+';position:relative;border-bottom:1px solid '+bdH+';">'+gGridLines(_o,_e,false,true)+'</div>');
    }

    // 4 linhas de atividade (só se expanded)
    if (isExp) {
      tecIds.forEach(function(tecId, ti) {
        var d = dates[tecId];
        if (!d || !d.start || !d.end) return;
        var _ds=G.parseD(d.start),_de=G.parseD(d.end);
        var xi = gPx(_ds);
        var xw = Math.max((G.diff(_ds,_de)+1)*gSt.dayW, gSt.dayW);
        var barColor = tecColors[ti % Math.max(1,tecColors.length)] || colTec;
        var du = CALENDARIO.contarDU(G.parseD(d.start), G.parseD(d.end));
        var lbl = du+'DU · '+G.fmtBR(G.parseD(d.start))+' – '+G.fmtBR(G.parseD(d.end));
        var dragP = encodeURIComponent(JSON.stringify({type:'tecForn',fornId:forn.id,tecId:tecId}));
        var barHt = Math.max(10, G.SUB_H - 8);
        var barTop = Math.round((G.SUB_H - barHt) / 2);
        var barH = '<div data-drag="'+dragP+'" data-mode="move" data-click="'+dragP+'" '
          +'style="position:absolute;top:'+barTop+'px;left:'+xi+'px;width:'+xw+'px;'
          +'height:'+barHt+'px;background:linear-gradient(135deg,'+barColor+'EE,'+barColor+'BB);'
          +'border-radius:4px;border:1px solid rgba(255,255,255,.2);box-shadow:0 2px 5px rgba(0,0,0,.18);'
          +'cursor:grab;overflow:hidden;display:flex;align-items:center;pointer-events:auto;">'
          +'<div data-drag="'+dragP+'" data-mode="left" style="position:absolute;left:0;top:0;bottom:0;width:7px;background:rgba(0,0,0,.18);border-radius:4px 0 0 4px;cursor:ew-resize;z-index:5;pointer-events:auto;"></div>'
          +'<span style="flex:1;text-align:center;font-size:9px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4);pointer-events:none;white-space:nowrap;overflow:hidden;padding:0 10px;">'+lbl+'</span>'
          +'<div data-drag="'+dragP+'" data-mode="right" style="position:absolute;right:0;top:0;bottom:0;width:7px;background:rgba(0,0,0,.18);border-radius:0 4px 4px 0;cursor:ew-resize;z-index:5;pointer-events:auto;"></div>'
          +'</div>';
        _r.push('<div class="gn1" style="height:'+G.SUB_H+'px;background:#F5FAF7;display:flex;align-items:center;padding:0 5px 0 28px;border-bottom:1px solid #E8F4EC;border-right:2px solid #C0C8D4;">'
          +'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#4A8A6A;font-size:9px;">'+(tecNames[tecId]||tecId)+'</span>'
          +'</div>');
        _i.push('<div style="height:'+G.SUB_H+'px;background:#F5FAF7;position:relative;border-bottom:1px solid #E8F4EC;overflow:visible;">'
          +gGridLines(_o,_e,false,true)+barH+'</div>');
      });
    }
  });
})(t,r,i,o,e),s&&gSt.obraFases[a]){const t=gSt.obraFases[a];const _poFaseIdx=a;darkenHex(COR.OBRA_MOM,.72),spacer(4);
(function(obraFase, obraFaseIdx){
  var pc=ESTADO.cfg.obraFases&&ESTADO.cfg.obraFases[obraFaseIdx]&&ESTADO.cfg.obraFases[obraFaseIdx].preObra;
  if(!pc||!pc.ativo)return;
  var du=pc.du||5;
  var fim=G.addD(new Date(obraFase.obra.start),-1);
  while(_isNaoUtilPO(fim))fim=G.addD(fim,-1);
  var ini=new Date(fim),cnt=1;
  while(cnt<du){ini=G.addD(ini,-1);if(!_isNaoUtilPO(ini))cnt++;}
  while(_isNaoUtilPO(ini))ini=G.addD(ini,1);
  var xi=gPx(ini);
  var xw=Math.max((G.diff(ini,fim)+1)*gSt.dayW,2*gSt.dayW);
  var cm=darkenHex(COR.OBRA_MOM,.72);
  var cb=COR.OBRA_BG;
  var tpl=typeof _preObraGetTemplate==='function'?_preObraGetTemplate(pc.templateId):null;
  var lbl=tpl?tpl.label.substring(0,12):'';
  var payload=encodeURIComponent(JSON.stringify({type:'preObra',faseIdx:obraFaseIdx}));
  console.log('[PO3] xi='+xi+' xw='+xw+' ini='+G.fmtISO(ini)+' tpl='+!!tpl+' ds='+(tpl?tpl.disciplinas.length:0));
  // Sidebar header
  r.push('<div class="gt2" style="height:'+(G.ROW_H+8)+'px;background:'+cb+';display:flex;align-items:center;padding:0 5px 0 8px;border-bottom:1px solid #EEE0C8;border-right:2px solid #C0C8D4;font-size:10px;font-weight:700;color:#6A3810;text-transform:uppercase;letter-spacing:.04em;gap:4px;"><span style="width:5px;height:5px;border-radius:1px;background:'+cm+';flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Pré-Obra'+(gSt.obraFases.length>1?' F'+(obraFaseIdx+1):'')+' · '+du+' DU</span></div>');
  // Gantt: barra principal
  i.push('<div style="height:'+(G.ROW_H+8)+'px;background:'+cb+';position:relative;border-bottom:1px solid #EEE0C8;overflow:visible;">'+gGridLines(o,e,false)+gBar(xi,xw,G.ROW_H,cm,ini,fim,null,payload,true)+'</div>');
  // Disciplinas
  if(tpl&&!(ESTADO.cfg.obraFases[obraFaseIdx]&&ESTADO.cfg.obraFases[obraFaseIdx].preObra&&ESTADO.cfg.obraFases[obraFaseIdx].preObra.expanded===false)){
    var ds=_getPoDiscs(obraFaseIdx);
    ds.forEach(function(pd,pi){
      var _dcArr=typeof getDiscPal==='function'?getDiscPal(pi):[cm];var dc=Array.isArray(_dcArr)?_dcArr[0]:_dcArr;
      var xiC=Math.max(0,xi);
      var xwC=xw+Math.min(0,xi);
      r.push('<div style="height:'+G.SUB_H+'px;background:#FEFCF5;display:flex;align-items:center;padding:0 8px;border-bottom:1px solid rgba(122,74,16,.12);border-right:2px solid #C0C8D4;font-size:9px;color:#6A3810;gap:4px;overflow:hidden;"><span style="width:4px;height:4px;border-radius:1px;background:'+dc+';flex-shrink:0;"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(pd.label||pd.id)+'</span></div>');
      i.push('<div style="height:'+G.SUB_H+'px;background:#FEFCF5;position:relative;border-bottom:1px solid rgba(122,74,16,.12);overflow:hidden;">'+gGridLines(o,e,false)+(xwC>0?'<div style="position:absolute;top:5px;left:'+xiC+'px;height:'+(G.SUB_H-10)+'px;width:'+xwC+'px;background:'+dc+';border-radius:2px;opacity:.85;"></div>':''  )+'</div>');
    });
  }
  spacer(2);
})(t, _poFaseIdx);
gObraRow(t,o,e,r,i),t.expanded&&(t.disciplinas||[]).forEach((a,n)=>{a&&a.ativo&&gDiscRow(t,a,n,o,e,r,i)}),spacer(4)}}),spacer(),!s){if(ESTADO.cfg.preObra&&gSt.obraFases.length){const t=parseInt(ESTADO.cfg.preObraDias)||10;let a=new Date(gSt.obraFases[0].obra.start);for(;CALENDARIO.isNaoUtil(a);)a=G.addD(a,-1);let n=new Date(a),s=0;for(;s<t;)n=G.addD(n,-1),CALENDARIO.isNaoUtil(n)||s++;for(;CALENDARIO.isNaoUtil(n);)n=G.addD(n,1);const d=gPx(n),l=Math.max(G.diff(n,a)*gSt.dayW,2*gSt.dayW),c=darkenHex(COR.OBRA_MOM,.6),p="rgba(122,74,16,.06)";r.push(`<div style="height:${G.ROW_H}px;background:${p};display:flex;align-items:center;padding:0 5px 0 8px;border-bottom:1px solid rgba(122,74,16,.15);border-right:2px solid #C0C8D4;font-size:9px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:.06em;gap:3px;"><span style="width:5px;height:5px;border-radius:1px;background:${c};flex-shrink:0;opacity:.5;"></span><span>Pré Obra</span><span style="margin-left:auto;opacity:.6;">${t}DU</span></div>`),i.push(`<div style="height:${G.ROW_H}px;background:${p};position:relative;border-bottom:1px solid rgba(122,74,16,.15);overflow:hidden;">${gGridLines(o,e,!1)}<div style="position:absolute;left:${d}px;top:4px;height:${G.ROW_H-8}px;width:${Math.max(l,8)}px;background:repeating-linear-gradient(135deg,${c}44 0,${c}44 4px,transparent 4px,transparent 8px);border:1px solid ${c}66;border-radius:4px;"></div></div>`)}phaseHdr("Obra",darkenHex(COR.OBRA_MOM,.65));const t=gSt.obraFases.length>1;gSt.obraFases.forEach((a,_fi)=>{if(t){const t=gObraFaseLabel(a),n=darkenHex(COR.OBRA_MOM,.72),s=a.expanded?"▲":"▼";r.push(`<div style="height:20px;background:${n};display:flex;align-items:center;padding:0 6px 0 12px;font-size:${gGetTypo("N1").fs}px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.06em;border-right:2px solid ${darkenHex(COR.OBRA_MOM,.6)};gap:4px;"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t}</span><span onclick="gEditFaseNome('obra',${a.id},'${(a.nome||"").replace(/'/g,"")}')" style="cursor:pointer;opacity:.7;font-size:10px;" title="Renomear">✎</span><button onclick="gToggleObraExpand(${a.id})" style="background:rgba(255,255,255,.15);border:none;color:#fff;border-radius:3px;cursor:pointer;font-size:9px;padding:1px 5px;flex-shrink:0;">${s}</button></div>`),i.push(`<div style="height:20px;background:linear-gradient(90deg,${n}CC,${n}22);position:relative;">${gGridLines(o,e,!1)}</div>`)}// Pré-obra da fase
(function(obraFase, obraFaseIdx){
  var pc=ESTADO.cfg.obraFases&&ESTADO.cfg.obraFases[obraFaseIdx]&&ESTADO.cfg.obraFases[obraFaseIdx].preObra;
  if(!pc||!pc.ativo)return;
  var du=pc.du||5;
  var fim=G.addD(new Date(obraFase.obra.start),-1);
  while(_isNaoUtilPO(fim))fim=G.addD(fim,-1);
  var ini=new Date(fim),cnt=1;
  while(cnt<du){ini=G.addD(ini,-1);if(!_isNaoUtilPO(ini))cnt++;}
  while(_isNaoUtilPO(ini))ini=G.addD(ini,1);
  var xi=gPx(ini);
  var xw=Math.max((G.diff(ini,fim)+1)*gSt.dayW,2*gSt.dayW);
  var cm=darkenHex(COR.OBRA_MOM,.72);
  var cb=COR.OBRA_BG;
  var tpl=typeof _preObraGetTemplate==='function'?_preObraGetTemplate(pc.templateId):null;
  var lbl=tpl?tpl.label.substring(0,12):'';
  var payload=encodeURIComponent(JSON.stringify({type:'preObra',faseIdx:obraFaseIdx}));
  console.log('[PO3] xi='+xi+' xw='+xw+' ini='+G.fmtISO(ini)+' tpl='+!!tpl+' ds='+(tpl?tpl.disciplinas.length:0));
  // Sidebar header
  r.push('<div style="height:'+(G.ROW_H+8)+'px;background:'+cb+';display:flex;align-items:center;padding:0 5px 0 8px;border-bottom:1px solid #EEE0C8;border-right:2px solid #C0C8D4;font-size:10px;font-weight:700;color:#6A3810;text-transform:uppercase;letter-spacing:.04em;gap:4px;"><span style="width:5px;height:5px;border-radius:1px;background:'+cm+';flex-shrink:0;"></span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Pré-Obra'+(gSt.obraFases.length>1?' F'+(obraFaseIdx+1):'')+' · '+du+' DU</span><button onclick="gTogglePreObraExpand('+obraFaseIdx+')" title="Expandir/recolher disciplinas" style="background:none;border:1px solid '+cm+';border-radius:3px;cursor:pointer;font-size:10px;padding:0 4px;color:'+cm+';font-weight:700;line-height:18px;flex-shrink:0;">⊞</button></div>');
  // Gantt: barra principal
  i.push('<div style="height:'+(G.ROW_H+8)+'px;background:'+cb+';position:relative;border-bottom:1px solid #EEE0C8;overflow:visible;">'+gGridLines(o,e,false)+gBar(xi,xw,G.ROW_H,cm,ini,fim,null,payload,true)+'</div>');
  // Disciplinas
  if(tpl){
    var ds=_getPoDiscs(obraFaseIdx);
    ds.forEach(function(pd,pi){
      var _dcArr=typeof getDiscPal==='function'?getDiscPal(pi):[cm];var dc=Array.isArray(_dcArr)?_dcArr[0]:_dcArr;
      var xiC=Math.max(0,xi);
      var xwC=xw+Math.min(0,xi);
      r.push('<div style="height:'+G.SUB_H+'px;background:#FEFCF5;display:flex;align-items:center;padding:0 8px;border-bottom:1px solid rgba(122,74,16,.12);border-right:2px solid #C0C8D4;font-size:9px;color:#6A3810;gap:4px;overflow:hidden;"><span style="width:4px;height:4px;border-radius:1px;background:'+dc+';flex-shrink:0;"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(pd.label||pd.id)+'</span></div>');
      i.push('<div style="height:'+G.SUB_H+'px;background:#FEFCF5;position:relative;border-bottom:1px solid rgba(122,74,16,.12);overflow:hidden;">'+gGridLines(o,e,false)+(xwC>0?'<div style="position:absolute;top:5px;left:'+xiC+'px;height:'+(G.SUB_H-10)+'px;width:'+xwC+'px;background:'+dc+';border-radius:2px;opacity:.85;"></div>':''  )+'</div>');
    });
  }
  spacer(2);
})(a, _fi);
gObraRow(a,o,e,r,i),t&&!a.expanded||(a.disciplinas||[]).forEach((t,n)=>{t&&t.ativo&&gDiscRow(a,t,n,o,e,r,i)})})}spacer(4);const l=[];for(let t=new Date(gSt.axisStart);G.diff(gSt.axisStart,t)<gSt.totalDays;t=G.addD(t,1))l.push({date:new Date(t),dow:t.getDay(),isSat:6===t.getDay(),isSun:0===t.getDay(),buffer:!1});const c=`<div style="display:flex;flex-shrink:0;height:100%;width:${e}px;">${buildDayHeaderHTML(l,gSt.dayW)}</div>`,p=`<div style="position:absolute;right:6px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:4px;z-index:20;background:#fff;border-radius:5px;padding:2px 4px;box-shadow:0 1px 4px rgba(0,0,0,.12);"><button onclick="gZoom(-1)" style="width:26px;height:22px;border:1px solid #C8CDD8;background:#F4F5F8;color:#3A4A5A;border-radius:4px;cursor:pointer;font-size:15px;line-height:1;">−</button><span style="font-size:9px;font-weight:700;color:#5A6A7A;min-width:32px;text-align:center;">${Math.round(100*gSt.zoom)}%</span><button onclick="gZoom(1)" style="width:26px;height:22px;border:1px solid #C8CDD8;background:#F4F5F8;color:#3A4A5A;border-radius:4px;cursor:pointer;font-size:15px;line-height:1;">+</button></div>`,f=document.getElementById("g-tl-col"),u=f?f.scrollTop:0,g=f?f.scrollLeft:0;t.innerHTML=` <div style="flex-shrink:0;display:flex;height:40px;border-bottom:2px solid #009EA8;background:#fff;position:relative;"><div style="width:${G.LBL_W+4}px;flex-shrink:0;border-right:2px solid #C0C8D4;background:#FAFBFC;"></div><div id="g-wk-hdr-wrap" style="flex:1;overflow:hidden;position:relative;">${c}${p}</div></div><div style="flex:1;display:flex;min-height:0;overflow:hidden;"><div id="g-lbl-col" style="width:${G.LBL_W}px;flex-shrink:0;overflow:hidden;position:relative;z-index:2;"></div><div id="g-col-resize-handle" style="width:4px;flex-shrink:0;cursor:col-resize;background:transparent;transition:background .15s;" onmouseenter="this.style.background='rgba(0,222,219,.3)'" onmouseleave="this.style.background='transparent'"></div><div id="g-tl-col" style="flex:1;overflow:auto;min-width:0;"><div id="g-tl-inner" style="min-width:${gSt.zoom>1?e+"px":"100%"};"></div></div></div>`;const m=document.getElementById("g-lbl-col"),b=document.getElementById("g-tl-col"),x=(()=>{const t=document.createElement("div");t.style.cssText="overflow:scroll;width:50px;height:50px;position:absolute;visibility:hidden;",document.body.appendChild(t);const e=t.offsetWidth-t.clientWidth;return document.body.removeChild(t),e||15})();m.innerHTML=r.join("")+`<div style="height:${x}px;background:#FAFBFC;border-right:2px solid #C0C8D4;flex-shrink:0;"></div>`;const h=document.getElementById("g-tl-inner");h?h.innerHTML=i.join(""):b.innerHTML=i.join("");const A=document.getElementById("g-wk-hdr-wrap");b.addEventListener("scroll",()=>{m.scrollTop=b.scrollTop,A&&(A.scrollLeft=b.scrollLeft)}),(u||g)&&(b.scrollTop=u,b.scrollLeft=g,m.scrollTop=u),b.querySelectorAll("[data-drag]").forEach(t=>t.addEventListener("mousedown",gDragStart,{passive:!1})),b.querySelectorAll("[data-click]").forEach(t=>t.addEventListener("click",gBarClickHandler));gInitColResize();gAplicarTypo();_congAplicarVisual();var _gn1els=m.querySelectorAll(".gn1");_gn1els.forEach(function(el){el.style.setProperty("text-transform","none","important");el.style.setProperty("letter-spacing","normal","important");});m.querySelectorAll("[data-po-open]").forEach(function(el){el.addEventListener("click",function(){abrirModalPreObra(parseInt(el.dataset.poOpen));});});m.querySelectorAll("[data-po-disc-open]").forEach(function(el){el.addEventListener("click",function(){_poOpenDiscModal(parseInt(el.dataset.poFi),parseInt(el.dataset.poDi));});});}function gZoomIn(){window.gZoom(1)}function gZoomOut(){window.gZoom(-1)}function gZoomReset(){gSt.zoom=1,gRender()}function gSnapForDrag(t){if("tecForn"===t.type){return{fornId:t.fornId,tecId:t.tecId};}if("tecFornAll"===t.type){return{fornId:t.fornId};}if("tecFornJoint"===t.type){return{fornId:t.fornId,tecId:t.tecId,nextTecId:t.nextTecId};}if("proj"===t.type){const e=gSt.projFases.find(e=>e.id==t.phId);if(!e)return{};const o={};return["arq","tec"].forEach(t=>{const a=e.rows[t],n="tec"===t?G.TEC_IDS:G.SUB_IDS;o[t]={start:G.clone(a.start),end:G.clone(a.end),subs:n.reduce((t,e)=>({...t,[e]:{start:G.clone(a.subs[e]?.start||a.start),end:G.clone(a.subs[e]?.end||a.end)}}),{})}}),{ph:e,snap:o}}if("obra"===t.type||"obraSub"===t.type){const e=gSt.obraFases.find(e=>e.id==t.phId);return e?{of:e,obraSnap:{start:G.clone(e.obra.start),end:G.clone(e.obra.end)}}:{}}if("preObra"===t.type){console.log("[SNAP preObra] t="+JSON.stringify(t));const fi=t.faseIdx||0;const of=gSt.obraFases[fi];return of?{poFase:of,poFaseIdx:fi,poDu:(ESTADO.cfg.obraFases[fi]&&ESTADO.cfg.obraFases[fi].preObra&&ESTADO.cfg.obraFases[fi].preObra.du)||5}:{};}return{}}function gApplyDrag(t,e,o,a){if("tecForn"===t.type){tecFornApplyDrag(t.fornId,t.tecId,e,o);return;}if("tecFornAll"===t.type){tecFornApplyAll(t.fornId,e);return;}if("tecFornModal"===t.type){tecFornAbrirModal(t.fornId);return;}if("tecFornJoint"===t.type){tecFornApplyJoint(t.fornId,t.tecId,t.nextTecId,o);return;}if("proj"===t.type){const{ph:n,snap:r}=a;if(!n)return;if("tec"===t.rowId&&t.subId){const a=r.tec.subs[t.subId];let i=G.addD(a.start,o),s=G.addD(a.end,o);for(;CALENDARIO.isNaoUtil(i);)i=G.addD(i,1);for(;CALENDARIO.isNaoUtil(s);)s=G.addD(s,1);n.rows.tec.subs[t.subId]="move"===e?{start:i,end:s}:"right"===e?{start:a.start,end:s}:{start:i,end:a.end};const d=gCascadeTec(n.rows.tec.subs,n.rows.arq.subs,gSt._visitaDate,n.tecChains,n.tecChainTypes);return n.rows.tec.subs=d,n.rows.tec.start=new Date(Math.min(...G.TEC_IDS.map(t=>G.ms(d[t].start)))),void(n.rows.tec.end=new Date(Math.max(...G.TEC_IDS.map(t=>G.ms(d[t].end)))))}if("tec"===t.rowId&&!t.subId)return;const i="arq"===t.rowId?"tec":"arq";if(t.subId){const a=G.SUB_IDS.indexOf(t.subId);let s=G.SUB_IDS.reduce((e,o)=>({...e,[o]:{...r[t.rowId].subs[o]}}),{});if("move"===e)s[t.subId]={start:G.addD(r[t.rowId].subs[t.subId].start,o),end:G.addD(r[t.rowId].subs[t.subId].end,o)},s=G.cascade(s,n.chains[t.rowId],a,n.chainTypes?.[t.rowId],n.chainSrc?.[t.rowId]);else if("left"===e){const e=G.addD(r[t.rowId].subs[t.subId].start,o);s[t.subId]={start:G.diff(e,r[t.rowId].subs[t.subId].end)<1?G.addD(r[t.rowId].subs[t.subId].end,-1):e,end:r[t.rowId].subs[t.subId].end}}else s[t.subId]={start:r[t.rowId].subs[t.subId].start,end:G.addD(r[t.rowId].subs[t.subId].end,o)},s=G.cascade(s,n.chains[t.rowId],a,n.chainTypes?.[t.rowId],n.chainSrc?.[t.rowId]);if(n.rows[t.rowId]={...n.rows[t.rowId],subs:s,...G.parentSpan(s)},n.locked&&"tec"!==i){let s=G.SUB_IDS.reduce((t,e)=>({...t,[e]:{...r[i].subs[e]}}),{});const d=r[i].subs[t.subId];if("move"===e)s[t.subId]={start:G.addD(d.start,o),end:G.addD(d.end,o)},s=G.cascade(s,n.chains[i],a,n.chainTypes?.[i],n.chainSrc?.[i]);else if("left"===e){const e=G.addD(d.start,o);s[t.subId]={start:G.diff(e,d.end)<1?G.addD(d.end,-1):e,end:d.end}}else s[t.subId]={start:d.start,end:G.addD(d.end,o)},s=G.cascade(s,n.chains[i],a,n.chainTypes?.[i],n.chainSrc?.[i]);n.rows[i]={...n.rows[i],subs:s,...G.parentSpan(s)}}}else if("move"===e){const e=G.SUB_IDS.reduce((e,a)=>({...e,[a]:{start:G.addD(r[t.rowId].subs[a].start,o),end:G.addD(r[t.rowId].subs[a].end,o)}}),{});if(n.rows[t.rowId]={...n.rows[t.rowId],start:G.addD(r[t.rowId].start,o),end:G.addD(r[t.rowId].end,o),subs:e},n.locked&&"tec"!==i){const t=G.SUB_IDS.reduce((t,e)=>({...t,[e]:{start:G.addD(r[i].subs[e].start,o),end:G.addD(r[i].subs[e].end,o)}}),{});n.rows[i]={...n.rows[i],start:G.addD(r[i].start,o),end:G.addD(r[i].end,o),subs:t}}}}if("preObra"===t.type){const{poFase,poFaseIdx,poDu}=a;console.log("[DRAG preObra] delta="+o+" poDu="+poDu+" poFase="+!!poFase);if(!poFase)return;const delta=Math.round(o);const newDu=Math.max(1,poDu-delta);if(ESTADO.cfg.obraFases[poFaseIdx]&&ESTADO.cfg.obraFases[poFaseIdx].preObra){ESTADO.cfg.obraFases[poFaseIdx].preObra.du=newDu;}}if("obra"===t.type){const{of:t,obraSnap:n}=a;if(!t)return;if("move"===e)t.obra.start=G.addD(n.start,o),t.obra.end=G.addD(n.end,o);else if("left"===e){const e=G.addD(n.start,o);t.obra.start=G.diff(e,n.end)<7?G.addD(n.end,-7):e}else{const e=G.addD(n.end,o);t.obra.end=G.diff(n.start,e)<7?G.addD(n.start,7):e}}}function gDragStart(t){const e=t.currentTarget,o=e.dataset.mode||"move",a=JSON.parse(decodeURIComponent(e.dataset.drag));t.preventDefault(),t.stopPropagation();if(_congBloqueiaAlvo(a)){_congAvisar();return;}const n=t.clientX,r=gSnapForDrag(a);let i=!1;
  // Threshold: mínimo 1 dayW completo de movimento para considerar drag
  // Para barras finas (sub-etapas), exige movimento maior antes de mover
  const _isTecSub = a.type === 'tecForn' || a.type === 'tecFornAll';
  const _pxThresh = _isTecSub
    ? Math.max(14, gSt.dayW * 1.2)   // sub-etapas: exige >1 dia de movimento
    : Math.max(10, gSt.dayW * 0.75); // demais: exige >¾ dia
  // Acumulador: guarda o último delta aplicado para evitar re-render sem mudança real
  let _lastApplied = 0;
  const onMove=t=>{const _rawPx=t.clientX-n;
    // Só inicia drag após threshold mínimo
    if(Math.abs(_rawPx) > _pxThresh) i = true;
    if(!i) return;
    // Snap a 1 dia completo — arredonda para o inteiro mais próximo
    const e=Math.round(_rawPx/gSt.dayW);
    // Só re-renderiza se o delta mudou de valor inteiro
    if(e !== _lastApplied){_lastApplied=e;gApplyDrag(a,o,e,r);gRender();}},onUp=()=>{if(document.removeEventListener("mousemove",onMove),document.removeEventListener("mouseup",onUp),i&&"move"===o&&"proj"===a.type&&a.subId){const t=gSt.projFases.find(t=>t.id==a.phId);if(t)if("tec"===a.rowId)t.tecChains||(t.tecChains={}),t.tecChains[a.subId]||(t.tecChains[a.subId]={st:!0,en:!0}),t.tecChains[a.subId].st=!1,gRender();else{const e=G.SUB_IDS.indexOf(a.subId);if(e>0){if(t.chains[a.rowId][e-1]=!1,t.locked){const o="arq"===a.rowId?"tec":"arq";t.chains[o]&&(t.chains[o][e-1]=!1)}gRender()}}}i&&"obra"===a.type&&(gSt._obraVinculadaCond=!1);if(i&&"preObra"===a.type)salvarDados();gSt.obraFases.forEach((t,e)=>{const o=ESTADO.cfg.obraFases[e];o&&(o.inicio=G.fmtISO(t.obra.start),o.prazo=G.diff(t.obra.start,t.obra.end));const a=document.getElementById(`obra-f${e}-inicio`),n=document.getElementById(`obra-f${e}-prazo`);a&&(a.value=G.fmtISO(t.obra.start)),n&&(n.value=G.diff(t.obra.start,t.obra.end))}),atualizarResumoDatas()};document.addEventListener("mousemove",onMove),document.addEventListener("mouseup",onUp)}function gBarClickHandler(t){t._wasDrag||gShowPop(JSON.parse(decodeURIComponent(t.currentTarget.dataset.click)),t.currentTarget.getBoundingClientRect())}let _alocPendingChanges=false;
function gClosePopForce(){document.getElementById("g-pop-el")?.remove(),document.getElementById("g-pop-mod-panel")?.remove(),document.removeEventListener("mousedown",gPopOutside),_alocDs=null,_alocPendingChanges=false}
function gClosePop(){
  if(_alocDs&&_alocPendingChanges){
    const r=confirm("Deseja descartar as alterações feitas?\n\nClique OK para descartar ou Cancelar para voltar à edição.");
    if(!r)return;
  }
  gClosePopForce();
}function gPopOutside(t){t.target.closest("#g-pop-el")||gClosePop()}function gRefreshPop(){const t=document.getElementById("g-pop-el");if(!t||!_popDs)return;const e={left:parseFloat(t.style.left),bottom:parseFloat(t.style.top)-8,top:parseFloat(t.style.top),right:parseFloat(t.style.left)+270};gShowPop(_popDs,e)}function gShowPop(t,e){gClosePop(),_popDs=t;const o=document.createElement("div");o.id="g-pop-el";const a="proj"===t.type&&!!t.subId&&"arq"===t.rowId;o.style.cssText=a?"position:fixed;background:#fff;border-radius:10px;z-index:3000;box-shadow:0 10px 36px rgba(0,0,0,.22);border:1px solid #DDE1E8;font-family:var(--font);visibility:hidden;display:flex;align-items:stretch;":"position:fixed;background:#fff;border-radius:10px;z-index:3000;box-shadow:0 10px 36px rgba(0,0,0,.22);padding:16px 18px;border:1px solid #DDE1E8;width:270px;font-family:var(--font);visibility:hidden;";let n="";if("proj"===t.type){const e=gSt.projFases.find(e=>e.id==t.phId);if(!e)return void gClosePop();const o="arq"===t.rowId?COR.ARQ_MOM:COR.TEC_MOM,r=`Fase ${e.id} · ${"tec"===t.rowId?"Técnicos":"Arquitetura"}${t.subId?" · "+("tec"===t.rowId?t.subId?G.TEC_NAMES[t.subId]||t.subId:"Técnicos":t.subId?G.SUB_NAMES[t.subId]||t.subId:"Arquitetura"):""}`,i=t.subId?e.rows[t.rowId].subs[t.subId]:e.rows[t.rowId];let s=new Date(i.start),d=new Date(i.end);for(;CALENDARIO.isNaoUtil(s);)s=G.addD(s,1);for(;CALENDARIO.isNaoUtil(d);)d=G.addD(d,1);const l=CALENDARIO.contarDU(s,d),c=`<div style="width:260px;flex-shrink:0;padding:16px 18px;border-right:1px solid #EEF0F4;"><div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A2535;"><span style="width:9px;height:9px;border-radius:2px;background:${o};display:inline-block;flex-shrink:0;"></span><span style="flex:1;">${r}</span><button onclick="gClosePop()" style="border:none;background:none;cursor:pointer;color:#A0A8B8;font-size:16px;line-height:1;padding:0;">✕</button></div><label style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Início</span><input type="date" id="pop-st" value="${G.fmtISO(s)}" onchange="gPopSnapUtil('pop-st');gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"></label><label style="display:flex;align-items:center;gap:8px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Fim</span><input type="date" id="pop-en" value="${G.fmtISO(d)}" onchange="gPopSnapUtil('pop-en');gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"></label><div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;margin-bottom:8px;">Duração</div><div style="display:flex;align-items:center;gap:0;border:1px solid #C8CDD8;border-radius:6px;overflow:hidden;height:38px;"><button onclick="gPopAdjustDur(-7)" style="width:38px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;font-weight:300;color:#4A5268;">−</button><button onclick="gPopAdjustDur(-1)" style="width:34px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">−1</button><div style="flex:1;text-align:center;"><span id="pop-dur-val" style="font-size:18px;font-weight:800;color:${o};">${l}</span><span style="font-size:9px;font-weight:700;color:#A0A8B8;margin-left:2px;">dias úteis</span></div><button onclick="gPopAdjustDur(1)" style="width:34px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">+1</button><button onclick="gPopAdjustDur(7)" style="width:38px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;font-weight:300;color:#4A5268;">+</button></div><div id="pop-dur-corridos" style="font-size:9px;color:#A0A8B8;text-align:center;margin-top:4px;">${G.diff(s,d)} dias corridos</div><div style="display:flex;justify-content:flex-end;margin-top:10px;"><button onclick="gPopApply('proj')" style="background:${o};color:#fff;border:none;border-radius:5px;padding:7px 18px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.05em;">Aplicar</button></div></div>\n${gChainSection(e,t)}\n</div>`;n=a?c+`<div id="aloc-inner" style="padding:16px;width:390px;flex-shrink:0;">${alocHtml(t)}</div>`:`<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A2535;"><span style="width:9px;height:9px;border-radius:2px;background:${o};display:inline-block;flex-shrink:0;"></span><span style="flex:1;">${r}</span></div><label style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Início</span><input type="date" id="pop-st" value="${G.fmtISO(s)}" onchange="gPopSnapUtil('pop-st');gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"></label><label style="display:flex;align-items:center;gap:8px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Fim</span><input type="date" id="pop-en" value="${G.fmtISO(d)}" onchange="gPopSnapUtil('pop-en');gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"></label><div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;margin-bottom:8px;">Duração</div><div style="display:flex;align-items:center;gap:0;border:1px solid #C8CDD8;border-radius:6px;overflow:hidden;height:38px;"><button onclick="gPopAdjustDur(-7)" style="width:38px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;font-weight:300;color:#4A5268;">−</button><button onclick="gPopAdjustDur(-1)" style="width:34px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">−1</button><div style="flex:1;text-align:center;"><span id="pop-dur-val" style="font-size:18px;font-weight:800;color:${o};">${l}</span><span style="font-size:9px;font-weight:700;color:#A0A8B8;margin-left:2px;">dias úteis</span></div><button onclick="gPopAdjustDur(1)" style="width:34px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">+1</button><button onclick="gPopAdjustDur(7)" style="width:38px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;font-weight:300;color:#4A5268;">+</button></div><div id="pop-dur-corridos" style="font-size:9px;color:#A0A8B8;text-align:center;margin-top:4px;">${G.diff(s,d)} dias corridos</div><div style="display:flex;justify-content:flex-end;margin-top:10px;"><button onclick="gPopApply('proj')" style="background:${o};color:#fff;border:none;border-radius:5px;padding:7px 18px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.05em;">Aplicar</button></div></div> ${gChainSection(e,t)} `}else if('tecForn'===t.type){
    tecFornShowPop(t.fornId, t.tecId, e);
    return;
  }else if('tecFornModal'===t.type){
    tecFornAbrirModal(t.fornId);
    return;
  }else if('preObra'===t.type){
    var _poFi=t.faseIdx||0,_poOf=gSt.obraFases[_poFi],_poCo=ESTADO.cfg.obraFases[_poFi]&&ESTADO.cfg.obraFases[_poFi].preObra;
    if(!_poOf||!_poCo)return void gClosePop();
    var _poCust=ESTADO.preObraCustom&&ESTADO.preObraCustom[_poFi],_poDu=(_poCust?_poCust.du:null)||_poCo.du||5;
    var _poFim=G.addD(new Date(_poOf.obra.start),-1);while(CALENDARIO.isNaoUtil(_poFim))_poFim=G.addD(_poFim,-1);
    var _poIni=new Date(_poFim),_poCnt=1;while(_poCnt<_poDu){_poIni=G.addD(_poIni,-1);if(!CALENDARIO.isNaoUtil(_poIni))_poCnt++;}
    var _poColor=darkenHex(COR.OBRA_MOM,.72);
    n='<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;font-size:11px;font-weight:700;color:#1A2535;">'+
      '<span style="width:9px;height:9px;border-radius:2px;background:'+_poColor+';display:inline-block;"></span>'+
      'Pré-Obra'+(gSt.obraFases.length>1?' — Fase '+(_poFi+1):'')+
      '<button onclick="gClosePop()" style="margin-left:auto;border:none;background:none;cursor:pointer;color:#A0A8B8;font-size:16px;">✕</button></div>'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Início</span>'+
      '<span style="flex:1;border:1px solid #E8E0D4;border-radius:4px;padding:5px 8px;font-size:12px;background:#F8F4EE;color:#6A3810;">'+G.fmtBR(_poIni)+'</span></div>'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Fim</span>'+
      '<span style="flex:1;border:1px solid #E8E0D4;border-radius:4px;padding:5px 8px;font-size:12px;background:#F8F4EE;color:#6A3810;">'+G.fmtBR(_poFim)+'</span></div>'+
      '<div style="border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:8px;">Duração</div>'+
      '<div style="display:flex;align-items:center;gap:0;border:1px solid #C8CDD8;border-radius:6px;overflow:hidden;height:38px;">'+
      '<button onclick="_poPopAdjust('+_poFi+',-5)" style="width:38px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:14px;">−</button>'+
      '<button onclick="_poPopAdjust('+_poFi+',-1)" style="width:34px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;">−1</button>'+
      '<div style="flex:1;text-align:center;"><span id="po-pop-du" style="font-size:18px;font-weight:800;color:'+_poColor+';">'+_poDu+'</span>'+
      '<span style="font-size:9px;font-weight:700;color:#A0A8B8;margin-left:2px;">dias úteis</span></div>'+
      '<button onclick="_poPopAdjust('+_poFi+',1)" style="width:34px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;">+1</button>'+
      '<button onclick="_poPopAdjust('+_poFi+',5)" style="width:38px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:14px;">+</button>'+
      '</div><div style="display:flex;gap:6px;margin-top:10px;">'+
      '<button onclick="abrirModalPreObra('+_poFi+');gClosePop();" style="flex:1;background:#F8F4EE;color:#6A3810;border:1px solid '+_poColor+';border-radius:5px;padding:7px 12px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;">✎ Editar disciplinas</button>'+
      '</div></div>';
}else if("obra"===t.type){const e=gSt.obraFases.find(e=>e.id==t.phId);if(!e)return void gClosePop();const o=COR.OBRA_MOM,a=G.diff(e.obra.start,e.obra.end),r=!1!==gSt._obraVinculadaCond,i=gSt._obraArqSrc||"aprovCond",s=G.SUB_NAMES[i]||i,d=G.SUB_IDS.map(t=>`<option value="${t}"${t===i?" selected":""}>${G.SUB_NAMES[t]||t}</option>`).join("");n=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A2535;"><span style="width:9px;height:9px;border-radius:2px;background:${o};display:inline-block;flex-shrink:0;"></span>Obra — Fase ${e.id}</div><label style="display:flex;align-items:center;gap:8px;margin-bottom:9px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Início</span><input type="date" id="pop-st" value="${G.fmtISO(e.obra.start)}" ${r?'disabled style="flex:1;border:1px solid #E8E0D4;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;background:#F8F4EE;color:#A09080;"':'onchange="gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"'}></label><label style="display:flex;align-items:center;gap:8px;"><span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Fim</span><input type="date" id="pop-en" value="${G.fmtISO(e.obra.end)}" onchange="gPopUpdateDur()" style="flex:1;border:1px solid #C8CDD8;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;"></label><div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:8px;">Duração</div><div style="display:flex;align-items:center;gap:0;border:1px solid #C8CDD8;border-radius:6px;overflow:hidden;height:38px;"><button onclick="gPopAdjustDur(-7)" style="width:38px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;color:#4A5268;">−</button><button onclick="gPopAdjustDur(-1)" style="width:34px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">−1</button><div style="flex:1;text-align:center;"><span id="pop-dur-val" style="font-size:18px;font-weight:800;color:${o};">${a}</span><span style="font-size:9px;font-weight:700;color:#A0A8B8;margin-left:2px;">dias</span></div><button onclick="gPopAdjustDur(1)" style="width:34px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F8F9FB;cursor:pointer;font-size:12px;color:#4A5268;">+1</button><button onclick="gPopAdjustDur(7)" style="width:38px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:16px;color:#4A5268;">+</button></div><div style="display:flex;justify-content:flex-end;margin-top:10px;"><button onclick="gPopApply('obra')" ${r?'disabled style="background:#C8C0B0;color:#fff;border:none;border-radius:5px;padding:7px 18px;font-size:11px;font-weight:700;font-family:inherit;cursor:not-allowed;"':'style="background:'+o+';color:#fff;border:none;border-radius:5px;padding:7px 18px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;"'}>Aplicar</button></div></div><div style="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;margin-bottom:10px;">Conexão com Projeto ARQ</div><div style="display:flex;gap:6px;margin-bottom:${r?"10px":"0"};"><button onclick="gToggleObraVinculo();gRefreshPop()" style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:${r?"rgba(0,158,168,.10)":"rgba(200,210,220,.10)"};border:1px solid ${r?"#009EA8":"#C8D4D8"};border-radius:6px;padding:7px 10px;cursor:pointer;font-size:11px;font-weight:700;color:${r?"#007A88":"#8A95A3"};font-family:inherit;"> ${r?"🔗 Vinculada a ARQ":"⛓️ Livre — data manual"} </button></div> ${r?`\n <div style="margin-bottom:8px;">\n <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:5px;">Inicia após o término de</div>\n <select onchange="gSt._obraArqSrc=this.value;gRender();gRefreshPop()" style="width:100%;padding:6px 8px;border:1px solid #C8CDD8;border-radius:5px;font-family:inherit;font-size:11px;color:#2A3548;background:#fff;cursor:pointer;outline:none;">${d}</select>\n </div>\n <div style="font-size:9px;color:#A0A8B8;text-align:center;">Início da obra é calculado automaticamente após o término de <em>${s}</em></div>\n `:'<div style="font-size:10px;color:#A0A8B8;font-style:italic;text-align:center;padding:4px 0;">Obra desvinculada — arraste livremente ou use Aplicar</div>'} </div>`;const l=document.createElement("div");l.id="g-pop-mod-panel",l.style.cssText="position:fixed;background:#fff;border-radius:10px;z-index:3000;box-shadow:0 10px 36px rgba(0,0,0,.22);padding:14px 16px;font-family:var(--font);visibility:hidden;min-width:200px;";let c="";for(let t=0;t<G.SEG_N;t++){const o=G.segToDate(e.obra,t),a=G.segToDate(e.obra,t+1);c+=`<tr style="border-bottom:1px solid #F0F2F5;"><td style="padding:5px 0;"><span style="width:24px;height:24px;border-radius:5px;background:#F2EAD8;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#7A4A10;">M${t+1}</span></td><td style="padding:5px 8px;text-align:center;font-size:12px;font-weight:700;color:#3A2A10;">${G.fmtBR(o)}</td><td style="padding:5px 8px;text-align:center;font-size:12px;font-weight:700;color:#7A4A10;">${G.fmtBR(a)}</td></tr>`}l.innerHTML=`<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#7A4A10;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #F2EAD8;">Módulos — Fase ${e.id}</div><table style="width:100%;border-collapse:collapse;font-family:var(--font);"><thead><tr><th style="width:32px;"></th><th style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;text-align:center;padding:0 8px 6px;">Início</th><th style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;text-align:center;padding:0 8px 6px;">Término</th></tr></thead><tbody>${c}</tbody></table>`,document.body.appendChild(l)}o.innerHTML=n;
if(a&&t.subId&&t.rowId==='arq'){
  var _aprDiv=document.createElement('div');
  var _ac=getAprovaConfig(t.subId);
  _aprDiv.style.cssText='margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;';
  _aprDiv.innerHTML=gBuildAprovaHtml(t);
  var _popLeft=o.querySelector('.g-pop-left')||o;
  _popLeft.appendChild(_aprDiv);
}
a&&(_alocDs=t);document.body.appendChild(o);if(_isFrozen()&&_congBloqueiaAlvo(t)){try{var _pst=o.querySelector('#pop-st'),_pen=o.querySelector('#pop-en');if(_pst){_pst.disabled=true;_pst.style.opacity='.5';_pst.style.cursor='not-allowed';_pst.style.background='#F4F5F8';}if(_pen){_pen.disabled=true;_pen.style.opacity='.5';_pen.style.cursor='not-allowed';_pen.style.background='#F4F5F8';}o.querySelectorAll('button').forEach(function(b){var oc=b.getAttribute('onclick')||'';if(oc.indexOf('gClosePop')>=0)return;if(oc.indexOf('gPopApply')>=0||oc.indexOf('gPopAdjustDur')>=0||oc.indexOf('gToggleChain')>=0||oc.indexOf('gToggleChainType')>=0||oc.indexOf('gSetChainSrc')>=0||oc.indexOf('gToggleTecChain')>=0||oc.indexOf('gSetTecArqSrc')>=0||oc.indexOf('gSetTecRelType')>=0||oc.indexOf('gToggleLock')>=0||oc.indexOf('gToggleObraVinculo')>=0){b.disabled=true;b.style.opacity='.45';b.style.cursor='not-allowed';b.style.pointerEvents='none';}});o.querySelectorAll('select').forEach(function(s){s.disabled=true;s.style.opacity='.5';s.style.cursor='not-allowed';s.style.background='#F4F5F8';});var _fx=document.createElement('div');_fx.style.cssText='margin:0 16px 10px;padding:5px 9px;background:rgba(0,185,80,.10);border:1px solid rgba(0,185,80,.3);border-radius:5px;font-size:9px;font-weight:700;color:#008A3C;letter-spacing:.03em;text-transform:uppercase;white-space:nowrap;display:flex;align-items:center;gap:5px;';_fx.innerHTML='❄ Etapa congelada — início, fim e vínculos travados';if(_pst){var _blk=_pst.parentNode;while(_blk&&_blk.parentNode&&_blk.parentNode!==o)_blk=_blk.parentNode;if(_blk&&_blk.parentNode)_blk.parentNode.insertBefore(_fx,_blk);else o.insertBefore(_fx,o.firstChild);}else{o.insertBefore(_fx,o.firstChild);}}catch(e){}}requestAnimationFrame(()=>{const t=o.offsetWidth||270,a=o.offsetHeight||300,n=window.innerWidth,r=window.innerHeight;let i=e.left,s=(e.bottom||e.top)+8;i=Math.max(8,Math.min(i,n-t-8)),s+a>r-8&&(s=(e.top||e.bottom)-a-8),s=Math.max(8,s),o.style.left=i+"px",o.style.top=s+"px",o.style.visibility="visible";const d=document.getElementById("g-pop-mod-panel");if(d){const e=d.offsetWidth||200;let o=i+t+8;o+e>n-8&&(o=i-e-8),o=Math.max(8,o),d.style.left=o+"px",d.style.top=s+"px",d.style.visibility="visible"}}),setTimeout(()=>document.addEventListener("mousedown",gPopOutside),0)}function gDiscRenderTable(t,e){let o='<tr style="background:#F2EDE4;"><th style="width:28px;padding:8px 4px;border-right:1px solid #E8E0D0;"></th><th style="text-align:left;padding:8px 12px;font-family:var(--font);font-size:12px;font-weight:700;letter-spacing:.06em;color:#7A5A30;border-right:1px solid #E8E0D0;min-width:200px;">Atividade</th><th style="width:70px;padding:8px 4px;font-family:var(--font);font-size:11px;font-weight:700;color:#9A8A6A;border-right:1px solid #E8E0D0;text-align:center;">Tipo</th><th style="width:60px;padding:8px 4px;font-family:var(--font);font-size:11px;font-weight:700;color:#9A8A6A;border-right:1px solid #E8E0D0;text-align:center;">Prof</th>';for(let t=1;t<=8;t++)o+=`<th style="${e?`background:${e[t%2==0?0:1]}22;`:""}width:56px;padding:8px 4px;font-family:var(--font);font-size:12px;font-weight:700;color:#7A5A30;border-right:1px solid #E8E0D0;text-align:center;">M${t}</th>`;o+='<th style="width:56px;padding:8px 4px;font-family:var(--font);font-size:11px;font-weight:700;color:#9A8A6A;text-align:center;">Saldo</th><th style="width:28px;"></th></tr>',document.getElementById("disc-modal-thead").innerHTML=o;const a=document.getElementById("disc-modal-tbody");a.innerHTML="",t.tasks.forEach(t=>a.appendChild(gDiscBuildRow(t))),a.querySelectorAll("tr").forEach(t=>gDiscHighlightRow(t)),gDiscUpdateFooter(t),gDiscInitDrag(a)}function gDiscSelStyle(t){return t>=100?"background:rgba(120,64,8,.82);color:#FFE8A0;":t>=75?"background:rgba(168,96,24,.55);color:#3A1E00;":t>=50?"background:rgba(200,120,32,.32);color:#5A3400;":t>=25?"background:rgba(212,146,42,.15);color:#7A4E10;":"background:transparent;color:#A0946A;"}function gDiscBuildRow(t){const e=document.createElement("tr");e.draggable=!0,e.style.borderBottom="1px solid #EEE8DC",e.style.transition="background 0.08s";const o=gDiscIsPrep(t),a=o?"background:rgba(212,180,80,.18);color:#8A6810;border:1px solid rgba(212,180,80,.4);":"background:transparent;color:#A0946A;border:1px dashed #D8D0C0;",n=document.createElement("td");n.style.cssText="text-align:center;color:#C0B090;font-size:14px;cursor:grab;border-right:1px solid #EEE8DC;padding:0 4px;",n.textContent="⠿",e.appendChild(n);const r=document.createElement("td");r.style.cssText="padding:2px 6px;border-right:1px solid #EEE8DC;",r.innerHTML=`<input type="text" value="${t.n.replace(/"/g,"\"")}" onchange="gDiscUpdateSaldo(this.closest('tr'))" style="width:100%;font-family:var(--body);font-size:13px;color:#3A2A10;background:transparent;border:none;outline:none;padding:5px 4px;">`,e.appendChild(r);const i=document.createElement("td");i.style.cssText="text-align:center;padding:4px;border-right:1px solid #EEE8DC;",i.innerHTML=`<span class="disc-prep-tag ${o?"is-prep":"not-prep"}" onclick="gDiscTogglePrep(this)" style="font-size:9px;letter-spacing:.5px;text-transform:uppercase;padding:2px 5px;border-radius:2px;cursor:pointer;user-select:none;white-space:nowrap;${a}">${o?"prep":"serviço"}</span>`,e.appendChild(i);const s=document.createElement("td");s.style.cssText="text-align:center;padding:2px 3px;border-right:1px solid #EEE8DC;",s.innerHTML=`<input type="number" min="0" max="99" value="${t.prof||0}" oninput="gDiscPreviewRealtime()" style="width:50px;text-align:center;font-family:var(--font);font-size:13px;font-weight:700;color:#7A4A10;background:rgba(212,146,42,.08);border:1px solid rgba(212,146,42,.2);border-radius:3px;padding:3px 4px;outline:none;">`,e.appendChild(s);for(let o=1;o<=8;o++){const a=t.m[o]||0,n=document.createElement("td");n.style.cssText="text-align:center;padding:2px 3px;border-right:1px solid #EEE8DC;",n.innerHTML=`<select data-m="${o}" onchange="gDiscOnSel(this)" style="font-family:var(--font);font-size:12px;border:none;border-radius:3px;padding:3px 2px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;text-align:center;width:52px;transition:background .12s;${gDiscSelStyle(a)}"><option value="0" ${0===a?"selected":""}>—</option><option value="25" ${25===a?"selected":""}>25%</option><option value="50" ${50===a?"selected":""}>50%</option><option value="75" ${75===a?"selected":""}>75%</option><option value="100" ${100===a?"selected":""}>100%</option></select>`,e.appendChild(n)}const d=document.createElement("td");d.dataset.saldo="1",d.style.cssText="text-align:center;padding:4px 6px;",e.appendChild(d);const l=document.createElement("td");return l.style.cssText="text-align:center;padding:0 6px;",l.innerHTML='<button onclick="this.closest(\'tr\').remove();gDiscUpdateFooterFromDOM()" style="background:none;border:none;cursor:pointer;color:#C0A890;font-size:15px;line-height:1;padding:2px 4px;border-radius:3px;" title="Remover">×</button>',e.appendChild(l),gDiscUpdateSaldo(e),e}function gDiscRowSum(t){let e=0;return t.querySelectorAll("select[data-m]").forEach(t=>{e+=parseInt(t.value)||0}),e}function gDiscUpdateFooter(t){const e=t?t.tasks.length:0;document.getElementById("disc-modal-count").textContent=e+" atividade(s) configurada(s)"}function gDiscUpdateFooterFromDOM(){const t=document.getElementById("disc-modal-tbody");let e=0;t.querySelectorAll("tr").forEach(t=>{100!==gDiscRowSum(t)&&e++});const o=document.getElementById("disc-modal-warn");document.getElementById("disc-modal-save"),e>0?(o.textContent=e+" linha(s) sem percentual",o.style.display=""):o.style.display="none",document.getElementById("disc-modal-count").textContent=document.getElementById("disc-modal-tbody").querySelectorAll("tr").length+" atividade(s)"}function gDiscPreviewRealtime(){const t=gSt.obraFases.find(t=>t.id==_discModalPhId),e=t&&(t.disciplinas||[]).find(t=>t.id===_discModalDiscId);if(!e)return;const o=document.getElementById("disc-modal-tbody"),a=[];o.querySelectorAll("tr").forEach(t=>{const e=t.querySelector('input[type="text"]');if(!e)return;const o=e.value.trim();if(!o)return;const n=t.querySelector(".disc-prep-tag"),r=!!n&&n.classList.contains("is-prep"),i=t.querySelector('input[type="number"]'),s=i&&parseInt(i.value)||0,d={};for(let e=1;e<=8;e++){const o=t.querySelector(`select[data-m="${e}"]`);d[e]=o&&parseInt(o.value)||0}a.push({n:o,prep:r,prof:s,m:d})}),e.tasks=a,gRecalcDiscSpan(e),"function"==typeof gRender&&gRender(),"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma()}function gDiscInitDrag(t){t.querySelectorAll("tr").forEach(e=>{e.addEventListener("dragstart",t=>{_discDragSrc=e,e.style.opacity="0.35",t.dataTransfer.effectAllowed="move"}),e.addEventListener("dragend",()=>{e.style.opacity="1",t.querySelectorAll("tr").forEach(t=>t.style.borderTop="")}),e.addEventListener("dragover",o=>{o.preventDefault(),t.querySelectorAll("tr").forEach(t=>t.style.borderTop=""),e!==_discDragSrc&&(e.style.borderTop="2px solid #C07820")}),e.addEventListener("drop",o=>{if(o.preventDefault(),_discDragSrc&&_discDragSrc!==e){const o=[...t.querySelectorAll("tr")];o.indexOf(_discDragSrc)<o.indexOf(e)?e.after(_discDragSrc):e.before(_discDragSrc)}t.querySelectorAll("tr").forEach(t=>t.style.borderTop="")})})}window.gZoom=function(t){const e=[.5,.75,1,1.5,2,3,4,6],o=e.findIndex(t=>t>=gSt.zoom-.01),a=Math.max(0,Math.min(e.length-1,o+t));gSt.zoom=e[a],gRender()},window.gPopSnapUtil=function(t){const e=document.getElementById(t);if(!e||!_popDs||"proj"!==_popDs.type)return;let o=G.parseD(e.value);if(o){for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);e.value=G.fmtISO(o)}},window.gPopUpdateDur=function(){const t=document.getElementById("pop-st"),e=document.getElementById("pop-en"),o=document.getElementById("pop-dur-val"),a=document.getElementById("pop-dur-corridos");if(t&&e&&o){const n=G.parseD(t.value),r=G.parseD(e.value);if(_popDs&&"proj"===_popDs.type){const t=Math.max(1,CALENDARIO.contarDU(n,r)),e=Math.max(1,G.diff(n,r));o.textContent=t,a&&(a.textContent=e+" dias corridos")}else o.textContent=Math.max(1,G.diff(n,r))}const n=document.getElementById("aloc-inner");if(n&&_alocDs){const t=gSt.projFases.find(t=>t.id==_alocDs.phId);if(t&&t.rows[_alocDs.rowId]?.subs?.[_alocDs.subId]){const e=document.getElementById("pop-st"),o=document.getElementById("pop-en");e&&o&&(t.rows[_alocDs.rowId].subs[_alocDs.subId].start=G.parseD(e.value),t.rows[_alocDs.rowId].subs[_alocDs.subId].end=G.parseD(o.value),n.innerHTML=alocHtml(_alocDs))}}},window.gPopAdjustDur=function(t){const e=document.getElementById("pop-en"),o=document.getElementById("pop-st");if(!e||!o)return;if(_congBloqueiaAlvo(_popDs)){_congAvisar();return;}const a=_popDs,n=G.parseD(o.value);if(a&&"proj"===a.type){const o=G.parseD(e.value),a=CALENDARIO.contarDU(n,o),r=addBusinessDays(n,Math.max(1,a+t));e.value=G.fmtISO(r)}else{const o=G.parseD(e.value),a=G.addD(o,t);if(G.diff(n,a)<1)return;e.value=G.fmtISO(a)}window.gPopUpdateDur();const r=document.getElementById("aloc-inner");if(r&&_alocDs){const t=document.getElementById("pop-st"),e=document.getElementById("pop-en");if(t&&e){const o=gSt.projFases.find(t=>t.id==_alocDs.phId);o&&o.rows[_alocDs.rowId]?.subs?.[_alocDs.subId]&&(o.rows[_alocDs.rowId].subs[_alocDs.subId].start=G.parseD(t.value),o.rows[_alocDs.rowId].subs[_alocDs.subId].end=G.parseD(e.value),r.innerHTML=alocHtml(_alocDs))}}},window.gPopApply=function(t){const e=_popDs;if(e){if("proj"===t){const t=gSt.projFases.find(t=>t.id==e.phId);let o=G.parseD(document.getElementById("pop-st").value),a=G.parseD(document.getElementById("pop-en").value);for(;CALENDARIO.isNaoUtil(o);)o=G.addD(o,1);for(;CALENDARIO.isNaoUtil(a);)a=G.addD(a,1);if(e.subId&&"tec"===e.rowId){t.tecChains||(t.tecChains={}),t.tecChains[e.subId]||(t.tecChains[e.subId]={st:!0,en:!0}),t.rows.tec.subs[e.subId]={start:o,end:a};const n=gCascadeTec(t.rows.tec.subs,t.rows.arq.subs,gSt._visitaDate,t.tecChains,t.tecChainTypes);t.rows.tec.subs=n,t.rows.tec.start=new Date(Math.min(...G.TEC_IDS.map(t=>G.ms(n[t].start)))),t.rows.tec.end=new Date(Math.max(...G.TEC_IDS.map(t=>G.ms(n[t].end))))}else if(e.subId){G.SUB_IDS.indexOf(e.subId);let n={...t.rows[e.rowId].subs,[e.subId]:{start:o,end:a}};n=G.cascade(n,t.chains[e.rowId],0,t.chainTypes?.[e.rowId],t.chainSrc?.[e.rowId]),t.rows[e.rowId]={...t.rows[e.rowId],subs:n,...G.parentSpan(n)}}else t.rows[e.rowId]={...t.rows[e.rowId],start:o,end:a}}else if("obra"===t){const t=gSt.obraFases.find(t=>t.id==e.phId);t&&(t.obra.start=G.parseD(document.getElementById("pop-st").value),t.obra.end=G.parseD(document.getElementById("pop-en").value))}gClosePop(),gRender(),atualizarResumoDatas()}else gClosePop()},window.gToggleProjExpand=function(t,e){const o=gSt.projFases.find(e=>e.id==t);o&&(o.expanded[e]=!o.expanded[e],gRender())},
window.gTogglePreObraExpand=function(faseIdx){if(!ESTADO.cfg.obraFases||!ESTADO.cfg.obraFases[faseIdx])return;if(!ESTADO.cfg.obraFases[faseIdx].preObra)ESTADO.cfg.obraFases[faseIdx].preObra={};var po=ESTADO.cfg.obraFases[faseIdx].preObra;po.expanded=(po.expanded===false)?true:false;gRender();salvarDados();};
window.gToggleObraExpand=function(t){const e=gSt.obraFases.find(e=>e.id==t);e&&(e.expanded=!e.expanded,gRender())},window.gToggleLock=function(t){if(_isFrozen()){_congAvisar();return;}const e=gSt.projFases.find(e=>e.id==t);e&&(e.locked=!e.locked,gRender())},window.gToggleChain=function(t,e,o){if(_isFrozen()){_congAvisar();return;}const a=gSt.projFases.find(e=>e.id==t);if(a){if(a.chains[e][o]=!a.chains[e][o],a.locked){const t="arq"===e?"tec":"arq";a.chains[t]&&(a.chains[t][o]=a.chains[e][o])}gRender(),"function"==typeof gRefreshPop&&gRefreshPop()}},window.gToggleChainType=function(t,e,o){if(_isFrozen()){_congAvisar();return;}const a=gSt.projFases.find(e=>e.id==t);if(!a)return;if(a.chainTypes||(a.chainTypes={arq:[...G.SUB_DEF_REL],tec:[...G.SUB_DEF_REL]}),a.chainTypes[e][o+1]={"FI":"II","II":"FF","FF":"FI"}[a.chainTypes[e][o+1]||"FI"]||"II",a.locked){const t="arq"===e?"tec":"arq";a.chainTypes[t]||(a.chainTypes[t]=[...G.SUB_DEF_REL]),a.chainTypes[t][o+1]=a.chainTypes[e][o+1]}const n=G.cascade(a.rows[e].subs,a.chains[e],0,a.chainTypes[e],a.chainSrc?.[e]);a.rows[e]={...G.parentSpan(n),subs:n},gRender(),"function"==typeof gRefreshPop&&gRefreshPop()},window.gSetChainSrc=function(t,e,o,a){if(_isFrozen()){_congAvisar();return;}const n=gSt.projFases.find(e=>e.id==t);if(!n)return;if(n.chainSrc||(n.chainSrc={arq:[...G.SUB_DEF_SRC],tec:[...G.SUB_DEF_SRC]}),n.chainSrc[e][o+1]=-1===a?null:a,n.locked){const t="arq"===e?"tec":"arq";n.chainSrc[t]||(n.chainSrc[t]=[...G.SUB_DEF_SRC]),n.chainSrc[t][o+1]=n.chainSrc[e][o+1]}const r=G.cascade(n.rows[e].subs,n.chains[e],0,n.chainTypes?.[e],n.chainSrc[e]);n.rows[e]={...G.parentSpan(r),subs:r},gRender(),"function"==typeof gRefreshPop&&gRefreshPop()},window.gToggleTecChain=function(t,e,o){if(_isFrozen()){_congAvisar();return;}const a=gSt.projFases.find(e=>e.id==t);a&&(a.tecChains||(a.tecChains={}),a.tecChains[e]||(a.tecChains[e]={st:!0,en:!0}),a.tecChains[e][o]=!a.tecChains[e][o],gRender(),"function"==typeof gRefreshPop&&gRefreshPop())},window.gToggleVisitaVinculo=function(){gSt._visitaVinculada=!1===gSt._visitaVinculada,gRender()},window.gToggleObraVinculo=function(){if(_isFrozen()){_congAvisar();return;}gSt._obraVinculadaCond=!1===gSt._obraVinculadaCond,gRender(),"function"==typeof gRefreshPop&&gRefreshPop()},window.gToggleDisc=function(t,e){const o=gSt.obraFases.find(e=>e.id==t);if(!o||!o.disciplinas)return;const a=o.disciplinas.find(t=>t.id===e);a&&(a.ativo=!a.ativo,gRender(),"function"==typeof gRefreshPop&&gRefreshPop())},window.gOpenDiscModal=function(t,e){const o=gSt.obraFases.find(e=>e.id==t);if(!o)return;const a=(o.disciplinas||[]).find(t=>t.id===e);if(!a)return;const n=getDiscPal((o.disciplinas||[]).findIndex(t=>t.id===e));_discModalPhId=t,_discModalDiscId=e,document.getElementById("disc-modal-title").textContent=a.label,document.getElementById("disc-modal-accent").style.background=`linear-gradient(to bottom,${n[0]},${n[1]})`,document.getElementById("disc-modal-save").style.background=n[1],gDiscRenderTable(a,n),document.getElementById("modal-disc").style.display="flex"},window.gCloseDiscModal=function(){document.getElementById("modal-disc").style.display="none",_discModalPhId=null,_discModalDiscId=null},window.gDiscTogglePrep=function(t){const e=t.classList.contains("is-prep");t.classList.toggle("is-prep",!e),t.classList.toggle("not-prep",e),t.textContent=e?"serviço":"prep",t.style.cssText=e?"font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:3px 6px;border-radius:2px;cursor:pointer;user-select:none;white-space:nowrap;background:transparent;color:#A0946A;border:1px dashed #D8D0C0;":"font-size:11px;letter-spacing:.5px;text-transform:uppercase;padding:3px 6px;border-radius:2px;cursor:pointer;user-select:none;white-space:nowrap;background:rgba(212,180,80,.18);color:#8A6810;border:1px solid rgba(212,180,80,.4);"},window.gDiscOnSel=function(t){t.style.cssText=t.style.cssText.replace(/background:[^;]+;color:[^;]+;/,"")+gDiscSelStyle(parseInt(t.value)),gDiscUpdateSaldo(t.closest("tr")),gDiscUpdateFooterFromDOM(),gDiscHighlightRow(t.closest("tr")),gDiscPreviewRealtime()},window.gDiscUpdateSaldo=function(t){const e=gDiscRowSum(t),o=t.querySelector("[data-saldo]");o&&(o.innerHTML=100===e?'<span style="font-family:var(--font);font-size:13px;color:#2A7A30;background:rgba(42,122,48,.1);border-radius:3px;padding:3px 6px;">✓</span>':e>100?`<span style="font-family:var(--font);font-size:13px;color:#B83418;background:rgba(184,52,24,.1);border-radius:3px;padding:3px 6px;">+${e-100}%</span>`:`<span style="font-family:var(--font);font-size:13px;color:#8A6010;background:rgba(200,146,42,.12);border-radius:3px;padding:3px 6px;">${100-e}%</span>`,gDiscHighlightRow(t))},window.gDiscHighlightRow=function(t){100===gDiscRowSum(t)?(t.style.background="",t.style.outline="none"):(t.style.background="rgba(240,180,0,.13)",t.style.outline="2px solid rgba(200,140,0,.35)",t.style.outlineOffset="-1px")},window.gAddDiscTask=function(){const t={};for(let e=1;e<=8;e++)t[e]=0;const e=gDiscBuildRow({n:"Nova atividade",prep:!1,prof:0,m:t}),o=document.getElementById("disc-modal-tbody");o.appendChild(e);const a=e.querySelector('input[type="text"]');a&&(a.value="",a.focus()),gDiscUpdateFooterFromDOM(),gDiscInitDrag(o)},window.gSaveDiscModal=function(){const t=document.getElementById("disc-modal-tbody");let e=0;if(t.querySelectorAll("tr").forEach(t=>{0===gDiscRowSum(t)&&e++}),e>0&&!confirm(e+" atividade(s) sem percentual definido. Salvar assim mesmo?"))return;const o=gSt.obraFases.find(t=>t.id==_discModalPhId);if(!o)return;const a=(o.disciplinas||[]).find(t=>t.id===_discModalDiscId);a&&(a.tasks=[],t.querySelectorAll("tr").forEach(t=>{const e=t.querySelector('input[type="text"]');if(!e)return;const o=e.value.trim();if(!o)return;const n=t.querySelector(".disc-prep-tag"),r=!!n&&n.classList.contains("is-prep"),i=t.querySelector('input[type="number"]'),s=i&&parseInt(i.value)||0,d={};for(let e=1;e<=8;e++){const o=t.querySelector(`select[data-m="${e}"]`);d[e]=o&&parseInt(o.value)||0}a.tasks.push({n:o,prep:r,prof:s,m:d})}),gRecalcDiscSpan(a),window.gCloseDiscModal(),gRender(),"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma())};const EFT_ZOOM_STEPS=[6,8,10,14,18,24,32,44,60];let _eftZoomIdx=null,_eftModoFases="somado";function eftDayPx(){return null!==_eftZoomIdx?EFT_ZOOM_STEPS[_eftZoomIdx]:null}function eftZoomIn(){if(null===_eftZoomIdx){const t=_eftAutoVal||16;_eftZoomIdx=EFT_ZOOM_STEPS.findIndex(e=>e>=t),_eftZoomIdx<0&&(_eftZoomIdx=EFT_ZOOM_STEPS.length-1)}_eftZoomIdx=Math.min(_eftZoomIdx+1,EFT_ZOOM_STEPS.length-1),_redrawAbaAtiva()}function eftZoomOut(){if(null===_eftZoomIdx){const t=_eftAutoVal||16;_eftZoomIdx=EFT_ZOOM_STEPS.findIndex(e=>e>=t),_eftZoomIdx<0&&(_eftZoomIdx=EFT_ZOOM_STEPS.length-1)}_eftZoomIdx=Math.max(_eftZoomIdx-1,0),_redrawAbaAtiva()}function eftZoomFit(){_eftZoomIdx=null,_redrawAbaAtiva()}let _eftAutoVal=16;function _redrawAbaAtiva(){"efetivo"===abaAtiva&&renderEfetivo(),"histograma"===abaAtiva&&renderHistograma()}function eftZoomBar(t,e){return`<div style="display:flex;align-items:center;gap:4px;margin-left:auto;flex-shrink:0;"><button onclick="eftZoomFit()" title="Ajustar à tela"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:${e?"var(--accent-light)":"var(--bg-surface2)"};color:${e?"var(--accent)":"var(--txt-muted)"};border-color:${e?"var(--accent-border)":"var(--border-md)"};border-radius:4px;cursor:pointer;font-size:11px;line-height:1;font-family:var(--font);display:flex;align-items:center;justify-content:center;" title="Ajustar à tela">⊡</button><button onclick="eftZoomOut()" title="Reduzir colunas"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;font-family:var(--font);display:flex;align-items:center;justify-content:center;">−</button><span style="font-family:var(--font);font-size:9px;font-weight:700;color:var(--txt-dim);min-width:34px;text-align:center;">${e?"auto":t+"px"}</span><button onclick="eftZoomIn()" title="Ampliar colunas"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;font-family:var(--font);display:flex;align-items:center;justify-content:center;">+</button></div>`}const EFT_ROW_STEPS=[16,20,24,30,38,48];let _eftRowIdx=2;function eftRowH(){return EFT_ROW_STEPS[_eftRowIdx]}function eftRowZoomIn(){_eftRowIdx=Math.min(_eftRowIdx+1,EFT_ROW_STEPS.length-1),renderEfetivo()}function eftRowZoomOut(){_eftRowIdx=Math.max(_eftRowIdx-1,0),renderEfetivo()}function rowHZoomBar(){return`<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);white-space:nowrap;">linha</span><button onclick="eftRowZoomOut()"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">−</button><span style="font-family:var(--font);font-size:9px;font-weight:700;color:var(--txt-dim);min-width:28px;text-align:center;">${eftRowH()}px</span><button onclick="eftRowZoomIn()"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">+</button></div>`}const FONT_STEPS=[7,8,9,10,11,12,14];let _fontIdx=3;function eftFontSz(){return FONT_STEPS[_fontIdx]}function eftFontIn(){_fontIdx=Math.min(_fontIdx+1,FONT_STEPS.length-1),_redrawAbaAtiva()}function eftFontOut(){_fontIdx=Math.max(_fontIdx-1,0),_redrawAbaAtiva()}function fontZoomBar(){return`<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);white-space:nowrap;">fonte</span><button onclick="eftFontOut()"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">−</button><span style="font-family:var(--font);font-size:9px;font-weight:700;color:var(--txt-dim);min-width:28px;text-align:center;">${eftFontSz()}px</span><button onclick="eftFontIn()"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">+</button></div>`}function ctrlSep(){return'<div style="width:1px;height:20px;background:var(--divider);flex-shrink:0;margin:0 2px;"></div>'}const HEAT_PALETTES=[{id:0,name:"Obra (dinâmico)",stops:["#FAE8B8","#E8A030","#A86018","#4A2000"]},{id:1,name:"Tiffany A|W",stops:["#E0FAF9","#00DED8","#00A898","#005850"]},{id:2,name:"Marrom A|W",stops:["#FAE8B8","#E8A030","#A86018","#4A2000"]},{id:3,name:"Verde",stops:["#DDF4E6","#B4E6C8","#00AA50","#004A20"]},{id:4,name:"Amarelo",stops:["#FFFAE0","#FFEB96","#FFC800","#A07800"]},{id:5,name:"Azul",stops:["#DDEBFA","#B4D2F5","#3278DC","#102880"]}],FORN_COLORS=["#00DEAD","#00AA50","#005C38","#00BEEF","#007890","#00DED0","#009060","#00A8C0","#004830","#0088A0","#00C890","#006880","#003820","#00A0B8"],HEAT_CFG={palette:2,gradient:!0,discColors:[]};function sincronizarCoresObra(){const t=COR.OBRA_RAMP,e=t.length;COR.ARQ_BG=lightenHex(COR.ARQ_MOM,.92),COR.TEC_BG=lightenHex(COR.TEC_MOM,.92),COR.OBRA_BG=lightenHex(COR.OBRA_MOM,.92),HEAT_CFG.discColors=Array.from({length:14},(o,a)=>{const n=Math.min(Math.round(a/13*(e-1)),e-1);return t[n]}),HEAT_PALETTES[0].stops=[t[0],t[Math.floor(.33*e)],t[Math.floor(.66*e)],t[e-1]],HEAT_CFG.palette=1}function hexDim(t,e){const o=parseInt(t.slice(1,3),16),a=parseInt(t.slice(3,5),16),n=parseInt(t.slice(5,7),16);return`rgb(${Math.round(o*e)},${Math.round(a*e)},${Math.round(n*e)})`}function darkenHex(t,e){const o=parseInt(t.slice(1,3),16),a=parseInt(t.slice(3,5),16),n=parseInt(t.slice(5,7),16);return`#${Math.round(o*e).toString(16).padStart(2,"0")}${Math.round(a*e).toString(16).padStart(2,"0")}${Math.round(n*e).toString(16).padStart(2,"0")}`}function lightenHex(t,e){const o=parseInt(t.slice(1,3),16),a=parseInt(t.slice(3,5),16),n=parseInt(t.slice(5,7),16),r=Math.round(o+(255-o)*e),i=Math.round(a+(255-a)*e),s=Math.round(n+(255-n)*e);return`#${r.toString(16).padStart(2,"0")}${i.toString(16).padStart(2,"0")}${s.toString(16).padStart(2,"0")}`}function heatColor(t,e=1){const o=HEAT_PALETTES[(HEAT_CFG.palette||2)-1];let a,n,r;if(HEAT_CFG.gradient){const e=o.stops,i=e.length-1,s=t*i,d=Math.min(Math.floor(s),i-1),l=s-d,c=[parseInt(e[d].slice(1,3),16),parseInt(e[d].slice(3,5),16),parseInt(e[d].slice(5,7),16)],p=[parseInt(e[d+1].slice(1,3),16),parseInt(e[d+1].slice(3,5),16),parseInt(e[d+1].slice(5,7),16)];a=Math.round(c[0]+(p[0]-c[0])*l),n=Math.round(c[1]+(p[1]-c[1])*l),r=Math.round(c[2]+(p[2]-c[2])*l)}else{const e=t<.01?o.stops[0]:o.stops[Math.floor(o.stops.length/2)];a=parseInt(e.slice(1,3),16),n=parseInt(e.slice(3,5),16),r=parseInt(e.slice(5,7),16)}return`rgb(${Math.max(0,Math.round(a*e))},${Math.max(0,Math.round(n*e))},${Math.max(0,Math.round(r*e))})`}function gerarDiasModulos(t){const e=t||gSt.obraFases[0];if(!e)return{days:[],modPx:{}};const o=new Date(e.obra.start);o.setHours(0,0,0,0);const a=new Date(e.obra.end);a.setHours(0,0,0,0);const n=G.SEG_N,r=new Date(o);r.setDate(r.getDate()-7);const i=new Date(a);i.setDate(i.getDate()+7);const s=[];let d=new Date(r);for(;d<=i;){const t=d.getDay(),e=d>=o&&d<=a,n=e?0===t?0:6===t?.5:1:0;s.push({date:new Date(d),dow:t,isSat:6===t,isSun:0===t,weight:n,inObra:e}),d.setDate(d.getDate()+1)}const l=s.filter(t=>t.inObra).reduce((t,e)=>t+e.weight,0)/n;let c=0,p=1;const f=[];return s.forEach(t=>{t.inObra?(p<n&&c>=l*p&&p++,f.push({mod:p,date:t.date,dow:t.dow,isSat:t.isSat,isSun:t.isSun,weight:t.weight,buffer:!1}),c+=t.weight):f.push({mod:0,date:t.date,dow:t.dow,isSat:t.isSat,isSun:t.isSun,weight:0,buffer:!0})}),{days:f}}sincronizarCoresObra();let _eftTip=null;function getEftTip(){return _eftTip||(_eftTip=document.createElement("div"),_eftTip.id="eft-tooltip",_eftTip.style.cssText="position:fixed;background:#1A1D23;color:#EEF0F4;border-radius:8px;padding:10px 14px;font-family:var(--font);font-size:11px;z-index:9999;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4);display:none;min-width:160px;max-width:260px;",document.body.appendChild(_eftTip)),_eftTip}function showEftTip(t,e){const o=getEftTip();o.innerHTML=e,o.style.display="block",o.style.left=t.clientX+14+"px",o.style.top=t.clientY-8+"px"}function hideEftTip(){getEftTip().style.display="none"}function moveEftTip(t){const e=getEftTip();e.style.left=t.clientX+14+"px",e.style.top=t.clientY-8+"px"}function fmtDateEft(t){return t.getDate().toString().padStart(2,"0")+"/"+(t.getMonth()+1).toString().padStart(2,"0")}function renderEfetivo(){const t=document.getElementById("pane-efetivo");t.innerHTML="",t.style.display="flex",t.style.flexDirection="column",t.style.overflow="hidden";const e=gSt.obraFases[0];if(!e)return void(t.innerHTML='<div class="pane-placeholder"><div class="ph-title">Configure a obra primeiro</div></div>');const o=(e.disciplinas||[]).filter(t=>!1!==t.ativo),a=(gerarDiasModulos(e),G.SEG_N);let n=1;o.forEach(t=>{for(let e=1;e<=a;e++){const o=t.tasks.filter(t=>(t.m[e]||0)>0).reduce((t,e)=>t+(e.prof||0),0);o>n&&(n=o)}});const r={};for(let t=1;t<=a;t++)r[t]=o.reduce((e,o)=>e+o.tasks.filter(e=>(e.m[t]||0)>0).reduce((t,e)=>t+(e.prof||0),0),0);o.map(t=>{const e={};for(let o=1;o<=a;o++){const a=t.tasks.filter(t=>(t.m[o]||0)>0);e[o]={total:a.reduce((t,e)=>t+(e.prof||0),0),tasks:a,hasService:a.some(t=>!gDiscIsPrep(t)),hasPrep:a.some(t=>gDiscIsPrep(t))}}return e});const i=document.createElement("div");i.style.cssText="flex-shrink:0;display:flex;align-items:center;gap:8px;padding:4px 12px;border-bottom:1px solid var(--border);background:var(--bg-panel);";const s=gSt.obraFases.length>1?`\n ${ctrlSep()}\n <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button onclick="_eftModoFases='somado';renderEfetivo()"\n style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-radius:4px 0 0 4px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;background:${"somado"===_eftModoFases?"var(--accent)":"var(--bg-surface2)"};color:${"somado"===_eftModoFases?"#fff":"var(--txt-muted)"};border-color:${"somado"===_eftModoFases?"var(--accent)":"var(--border-md)"};"\n title="Somar todas as fases num único efetivo">∑ Somado</button><button onclick="_eftModoFases='separado';renderEfetivo()"\n style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-radius:0 4px 4px 0;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;background:${"separado"===_eftModoFases?"var(--accent)":"var(--bg-surface2)"};color:${"separado"===_eftModoFases?"#fff":"var(--txt-muted)"};border-color:${"separado"===_eftModoFases?"var(--accent)":"var(--border-md)"};"\n title="Ver cada fase de obra separadamente">⊟ Separado</button></div>`:"";i.innerHTML=` <span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);white-space:nowrap;">1 prof</span><div style="height:10px;width:140px;border-radius:3px;overflow:hidden;display:flex;flex-shrink:0;"> ${Array.from({length:16},(t,e)=>`<div style="flex:1;background:${heatColor(e/15)};"></div>`).join("")} </div><span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);white-space:nowrap;">${n} prof</span> ${s} `,t.appendChild(i);const d=document.createElement("div");d.className="chart-scroll",d.style.cssText="flex:1;min-height:0;overflow:auto;",t.appendChild(d);const dkFmt=t=>{const e=new Date(t);return e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0")},l="separado"===_eftModoFases&&gSt.obraFases.length>1,c=new Map;gSt.obraFases.forEach(t=>{const{days:e}=gerarDiasModulos(t);e.forEach(t=>{if(t.buffer)return;const e=dkFmt(t.date);c.has(e)||c.set(e,{...t})})});const p=[...c.entries()].sort(([t],[e])=>t.localeCompare(e)).map(([,t])=>t);
// Prefixar dias de pré-obra no efetivo
(function(){
  var poDays=[];
  gSt.obraFases.forEach(function(_of,_fi){var d=getPreObraDays(_fi);d.forEach(function(x){if(!c.has(G.fmtISO(x.date)))poDays.push(x);});});
  if(poDays.length){
    var seen=new Set(p.map(function(x){return G.fmtISO(x.date);}));
    var newDays=poDays.filter(function(x){return!seen.has(G.fmtISO(x.date));}).sort(function(a,b){return G.ms(a.date)-G.ms(b.date);});
    Array.prototype.splice.apply(p,[0,0].concat(newDays));
  }
})();
if(p.length>1){const t=[];for(let e=0;e<p.length-1;e++){t.push(p[e]);let o=new Date(p[e].date);o.setDate(o.getDate()+1);const a=new Date(p[e+1].date);for(;o<a;){const e=o.getDay();t.push({date:new Date(o),dow:e,isSat:6===e,isSun:0===e,buffer:!0,mod:0,weight:0}),o.setDate(o.getDate()+1)}}t.push(p[p.length-1]),p.length=0,p.push(...t)}if(l)gSt.obraFases.forEach((t,e)=>{const o=document.createElement("div");o.style.cssText=`display:flex;align-items:center;gap:8px;padding:5px 12px; background:${darkenHex(COR.OBRA_MOM,.72)}; font-family:var(--font);font-size:10px;font-weight:700;color:#fff; text-transform:uppercase;letter-spacing:.06em; ${e>0?"margin-top:12px;":""}`,o.textContent=t.nome?.trim()||`Fase ${t.id}`,d.appendChild(o);const n=(t.disciplinas||[]).filter(t=>!1!==t.ativo),{days:r}=gerarDiasModulos(t),i=new Map;r.forEach(t=>{t.buffer||i.set(dkFmt(t.date),t.mod)});const s=n.map(t=>{const e={};for(let o=1;o<=a;o++){const a=t.tasks.filter(t=>(t.m[o]||0)>0);if(!a.length)continue;const n=a.reduce((t,e)=>t+(e.prof||0),0),i=a.some(t=>!gDiscIsPrep(t)),s=a.some(t=>gDiscIsPrep(t));r.forEach(t=>{t.buffer||t.isSun||t.mod!==o||(e[dkFmt(t.date)]={total:n,tasks:a,hasService:i,hasPrep:s})})}return e}),l={};p.forEach(t=>{if(t.buffer||t.isSun)return;const e=dkFmt(t.date);var _poFi=getPreObraEfetivoByDay(e);l[e]=(n.reduce((t,o,a)=>t+(s[a][e]?.total||0),0))+(_poFi[e]||0)});const c={};for(let t=1;t<=a;t++)c[t]=n.reduce((e,o)=>e+o.tasks.filter(e=>(e.m[t]||0)>0).reduce((t,e)=>t+(e.prof||0),0),0);renderEfetivoBloco(null,{days:p,disc:n,profByDay:s,totalByDate:l,totalByMod:c,dateToMod:i},d,e>0)});else{const t=(gSt.obraFases[0].disciplinas||[]).filter(t=>!1!==t.ativo),e=t.map((t,e)=>{const o={};return gSt.obraFases.forEach(t=>{const{days:n}=gerarDiasModulos(t),r=(t.disciplinas||[]).filter(t=>!1!==t.ativo)[e];if(r)for(let t=1;t<=a;t++){const e=r.tasks.filter(e=>(e.m[t]||0)>0);if(!e.length)continue;const a=e.reduce((t,e)=>t+(e.prof||0),0),i=e.some(t=>!gDiscIsPrep(t)),s=e.some(t=>gDiscIsPrep(t));n.forEach(e=>{if(e.buffer||e.isSun||e.mod!==t)return;const n=dkFmt(e.date);o[n]||(o[n]={total:0,hasService:!1,hasPrep:!1}),o[n].total+=a,o[n].hasService=o[n].hasService||i,o[n].hasPrep=o[n].hasPrep||s})}}),o}),o={};p.forEach(t=>{if(t.buffer||t.isSun)return;const a=dkFmt(t.date);var _poT=getPreObraEfetivoTotal();o[a]=(e.reduce((t,e)=>t+(e[a]?.total||0),0))+(_poT[a]||0)});
// Adicionar disciplinas de pré-obra como linhas extras
var _poAllDiscs=[];var _poAllPbD=[];
gSt.obraFases.forEach(function(_of,_fi){
  var _poD=getPreObraDiscsByDay(_fi);
  _poD.forEach(function(pd){_poAllDiscs.push(pd);_poAllPbD.push(pd.profByDay);});
});
var _tFinal=t.concat(_poAllDiscs),_eFinal=e.concat(_poAllPbD);
if(_poAllDiscs.length){_tFinal=_poAllDiscs.concat(t);_eFinal=_poAllPbD.concat(e);}
renderEfetivoBloco(null,{days:p,disc:_tFinal,profByDay:_eFinal,totalByDate:o},d,!1)}}function renderEfetivoBloco(t,e,o,a){const n=G.SEG_N,dkFmt=t=>{const e=new Date(t);return e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0")};let r,i,s,d,l;if(e)r=e.days,i=e.disc,s=e.profByDay,d=e.totalByDate,l=e.totalByMod||{};else{i=(t.disciplinas||[]).filter(t=>!1!==t.ativo);const{days:e}=gerarDiasModulos(t);r=e,s=i.map(t=>{const e={};for(let o=1;o<=n;o++){const a=t.tasks.filter(t=>(t.m[o]||0)>0);if(!a.length)continue;const n=a.reduce((t,e)=>t+(e.prof||0),0),i=a.some(t=>!gDiscIsPrep(t)),s=a.some(t=>gDiscIsPrep(t));r.forEach(t=>{if(t.buffer||t.isSun||t.mod!==o)return;const r=dkFmt(t.date);e[r]={total:n,tasks:a,hasService:i,hasPrep:s}})}return e}),d={},r.forEach(t=>{if(t.buffer||t.isSun)return;const e=dkFmt(t.date);d[e]=i.reduce((t,o,a)=>t+(s[a][e]?.total||0),0)}),l={};for(let t=1;t<=n;t++)l[t]=i.reduce((e,o)=>e+o.tasks.filter(e=>(e.m[t]||0)>0).reduce((t,e)=>t+(e.prof||0),0),0)}let c=1;i.forEach((t,e)=>{Object.values(s[e]||{}).forEach(t=>{(t.total||0)>c&&(c=t.total)})});const p=document.createElement("div");p.style.cssText="display:inline-block;vertical-align:top;",o.appendChild(p);const draw=()=>{p.innerHTML="";const a=o.clientWidth||800;if(a<=0)return;const f=eftDayPx(),u=a-G.LBL_W,g=null!==f?f:Math.max(1,u/Math.max(r.length,1));_eftAutoVal=g;const m=r.length*g,b=G.LBL_W+(null!==f?m:Math.max(m,u)),x={},h=e?.dateToMod;for(let t=1;t<=n;t++){let e=-1,o=0;r.forEach((a,n)=>{(h?h.get(dkFmt(a.date))||0:a.mod)===t&&(e<0&&(e=n),o++)}),x[t]={left:e<0?0:e*g,width:o*g}}const A=44,y=eftRowH(),E=Math.max(16,Math.round(.85*y)),D=i.length,w=A+E+4+D*y,S="http://www.w3.org/2000/svg",mk=t=>document.createElementNS(S,t);p.style.width=b+"px",p.style.height=w+"px";const C=document.createElementNS(S,"svg");C.setAttribute("width",b),C.setAttribute("height",w),C.style.cssText="display:block;",p.appendChild(C);const I=mk("rect");I.setAttribute("x",G.LBL_W),I.setAttribute("y","0"),I.setAttribute("width",b-G.LBL_W),I.setAttribute("height",w),I.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()||"#ECEEF2"),C.appendChild(I);const F=mk("rect");F.setAttribute("x",G.LBL_W),F.setAttribute("y","0"),F.setAttribute("width",b-G.LBL_W),F.setAttribute("height",A),F.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-surface2").trim()||"#F0F2F6"),C.appendChild(F);for(let t=1;t<=n;t++){const o=x[t];if(o.width<=0)continue;const a=G.LBL_W+o.left,n=4===t||6===t||8===t,r=a+o.width/2,i=mk("text");i.setAttribute("x",r),i.setAttribute("y",12.4),i.setAttribute("text-anchor","middle"),i.setAttribute("font-size","10"),i.setAttribute("font-family","Oswald,sans-serif"),i.setAttribute("font-weight","700"),i.setAttribute("fill",n&&!e?"#B83418":"rgba(100,110,130,.75)"),i.textContent="M"+t,C.appendChild(i);const s=l[t]||0;if(s&&o.width>36){const t=mk("text");t.setAttribute("x",r),t.setAttribute("y",19),t.setAttribute("text-anchor","middle"),t.setAttribute("font-size","8"),t.setAttribute("font-family","Oswald,sans-serif"),t.setAttribute("fill","rgba(80,90,110,.7)"),t.textContent=s+" prof",C.appendChild(t)}const d=n&&!e,c=mk("line");if(c.setAttribute("x1",a),c.setAttribute("x2",a),c.setAttribute("y1",0),c.setAttribute("y2",w),c.setAttribute("stroke",d?"#B83418":"rgba(0,0,0,.10)"),c.setAttribute("stroke-width",d?"2":"1"),C.appendChild(c),n&&!e){const e=mk("text");e.setAttribute("x",a+3),e.setAttribute("y",18),e.setAttribute("font-size","8"),e.setAttribute("font-family","Oswald,sans-serif"),e.setAttribute("font-weight","700"),e.setAttribute("fill","#B83418"),e.textContent=4===t?"V1":6===t?"V2":"V3",C.appendChild(e)}}const _=e?.dateToMod||null,_diaEstaFase=t=>!t.buffer&&!t.isSun&&(!_||_.has(dkFmt(t.date))),T=r.findIndex(_diaEstaFase),k=r.length-1-[...r].reverse().findIndex(_diaEstaFase),$=Math.max(5,Math.min(8,Math.round(.38*E))),R=A+Math.round(.18*E),O=w,_drawTriEft=(t,e,o)=>{const a=mk("line");a.setAttribute("x1",t),a.setAttribute("x2",t),a.setAttribute("y1",R+2*$),a.setAttribute("y2",O),a.setAttribute("stroke",o),a.setAttribute("stroke-width","1.5"),a.setAttribute("stroke-dasharray","3,2"),C.appendChild(a);const n=mk("polygon");n.setAttribute("points",t+","+(R+2*$)+" "+(t-$)+","+R+" "+(t+$)+","+R),n.setAttribute("fill",e),n.setAttribute("stroke","rgba(0,0,0,.1)"),n.setAttribute("stroke-width","0.5"),C.appendChild(n)};T>=0&&_drawTriEft(G.LBL_W+T*g+g/2,"#4CAF8A","rgba(76,175,138,.4)"),k>=0&&_drawTriEft(G.LBL_W+k*g+g/2,"#E57373","rgba(229,115,115,.4)");const B=mk("line");B.setAttribute("x1",G.LBL_W),B.setAttribute("x2",b),B.setAttribute("y1",20),B.setAttribute("y2",20),B.setAttribute("stroke","rgba(0,0,0,.10)"),B.setAttribute("stroke-width","1"),C.appendChild(B);const M=mk("rect");M.setAttribute("x",G.LBL_W),M.setAttribute("y",20),M.setAttribute("width",b-G.LBL_W),M.setAttribute("height",24),M.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim()||"#FFFFFF"),C.appendChild(M),buildDayHeaderSVG(mk,r,g,G.LBL_W,20,24).forEach(t=>C.appendChild(t));const z=mk("line");z.setAttribute("x1",0),z.setAttribute("x2",b),z.setAttribute("y1",A),z.setAttribute("y2",A),z.setAttribute("stroke","rgba(0,0,0,.18)"),z.setAttribute("stroke-width","2"),C.appendChild(z),e?.dateToMod&&[{n:"V1",mod:3},{n:"V2",mod:5},{n:"V3",mod:7}].forEach(({n:t,mod:o})=>{let a=-1;for(let t=0;t<r.length;t++)if(e.dateToMod.get(dkFmt(r[t].date))===o){a=t;break}if(a<0)return;const n=G.LBL_W+a*g,i=Math.max(6,Math.min(10,Math.round(.35*y))),s=A+E/2,d=mk("circle");d.setAttribute("cx",n),d.setAttribute("cy",s),d.setAttribute("r",i),d.setAttribute("fill","#FFD54F"),d.setAttribute("stroke","rgba(0,0,0,.15)"),d.setAttribute("stroke-width","1"),d.setAttribute("class","g-virada"),C.appendChild(d);const l=mk("text");l.setAttribute("x",n),l.setAttribute("y",s+Math.round(.38*i)),l.setAttribute("text-anchor","middle"),l.setAttribute("font-size",Math.max(6,i-1)),l.setAttribute("font-weight","700"),l.setAttribute("font-family","Oswald,sans-serif"),l.setAttribute("fill","#4A2800"),l.setAttribute("class","g-virada"),l.textContent=t,C.appendChild(l)}),r.forEach((t,e)=>{if(!t.isSat&&!t.isSun&&!t.buffer)return;const o=mk("rect");o.setAttribute("x",G.LBL_W+e*g),o.setAttribute("y",A+E+4),o.setAttribute("width",g),o.setAttribute("height",D*y),o.setAttribute("fill",t.buffer?"rgba(0,0,0,.025)":t.isSun?"rgba(140,120,80,.08)":"rgba(200,130,20,.08)"),C.appendChild(o)});const L=Math.max(...r.map(t=>d[dkFmt(t.date)]||0),1);r.forEach((t,e)=>{if(t.isSun||t.buffer)return;const o=dkFmt(t.date),a=d[o]||0;if(!a)return;const n=G.LBL_W+e*g,r=Math.min(1,(a-1)/Math.max(1,L-1)),i=Math.round((225+-195*r)*(t.isSat?.65:1)),s=`rgb(${Math.max(0,i)},${Math.max(0,i)},${Math.max(0,i)})`,l=mk("rect");if(l.setAttribute("x",n),l.setAttribute("y",44),l.setAttribute("width",Math.max(g-.5,1)),l.setAttribute("height",E),l.setAttribute("fill",s),C.appendChild(l),g>=10&&E>=12){const t=mk("text");t.setAttribute("x",n+g/2),t.setAttribute("y",44+E/2+Math.round(.38*eftFontSz())),t.setAttribute("text-anchor","middle"),t.setAttribute("font-size",Math.min(eftFontSz(),g-2)),t.setAttribute("font-family","Oswald,sans-serif"),t.setAttribute("font-weight","700"),t.setAttribute("fill",r>.55?"rgba(255,255,255,.92)":"rgba(30,30,30,.85)"),t.textContent=a,C.appendChild(t)}});const P=mk("rect");P.setAttribute("x",0),P.setAttribute("y",A+E),P.setAttribute("width",b),P.setAttribute("height",4),P.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-panel").trim()||"#F4F6FA"),C.appendChild(P);const q=mk("line");q.setAttribute("x1",0),q.setAttribute("x2",b),q.setAttribute("y1",A+E+4),q.setAttribute("y2",A+E+4),q.setAttribute("stroke","rgba(0,0,0,.15)"),q.setAttribute("stroke-width","1.5"),C.appendChild(q);for(let t=0;t<=D;t++){const e=A+E+4+t*y,o=mk("line");o.setAttribute("x1",0),o.setAttribute("x2",b),o.setAttribute("y1",e),o.setAttribute("y2",e),o.setAttribute("stroke","rgba(0,0,0,.06)"),o.setAttribute("stroke-width","1"),C.appendChild(o)}i.forEach((t,e)=>{const o=s[e],a=A+E+4+e*y;r.forEach((t,e)=>{const n=dkFmt(t.date),r=o[n];if(!r||0===r.total||t.isSun||t.buffer)return;const i=G.LBL_W+e*g,s=Math.min(1,(r.total-1)/Math.max(1,c-1)),d=t.isSat?.72:1,l=heatColor(s,d);if(r.hasService&&r.hasPrep){const t=heatColor(.45*s,d),e=mk("rect");e.setAttribute("x",i),e.setAttribute("y",a),e.setAttribute("width",Math.max(g-.5,1)),e.setAttribute("height",y/2),e.setAttribute("fill",t),C.appendChild(e);const o=mk("rect");o.setAttribute("x",i),o.setAttribute("y",a+y/2),o.setAttribute("width",Math.max(g-.5,1)),o.setAttribute("height",y-y/2),o.setAttribute("fill",l),C.appendChild(o)}else if(r.hasPrep){const t=heatColor(.45*s,d),e=mk("rect");e.setAttribute("x",i),e.setAttribute("y",a),e.setAttribute("width",Math.max(g-.5,1)),e.setAttribute("height",y),e.setAttribute("fill",t),C.appendChild(e)}else{const t=mk("rect");t.setAttribute("x",i),t.setAttribute("y",a),t.setAttribute("width",Math.max(g-.5,1)),t.setAttribute("height",y),t.setAttribute("fill",l),C.appendChild(t)}if(g>=12&&y>=14&&r.total>0){const t=mk("text");t.setAttribute("x",i+g/2),t.setAttribute("y",a+y/2+Math.round(.38*eftFontSz())),t.setAttribute("text-anchor","middle"),t.setAttribute("font-size",Math.min(eftFontSz(),g-2,y-4)),t.setAttribute("font-family","Oswald,sans-serif"),t.setAttribute("font-weight","700"),t.setAttribute("fill",s>.5?"rgba(255,255,255,.92)":"rgba(20,20,20,.7)"),t.textContent=r.total,C.appendChild(t)}})});const j=mk("g"),N=mk("rect");N.setAttribute("x",0),N.setAttribute("y",A),N.setAttribute("width",G.LBL_W),N.setAttribute("height",E+4),N.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-panel").trim()||"#F4F6FA"),j.appendChild(N);const H=mk("text");H.setAttribute("x",G.LBL_W-10),H.setAttribute("y",A+E/2+4),H.setAttribute("text-anchor","end"),H.setAttribute("font-size","9"),H.setAttribute("font-family","Oswald,sans-serif"),H.setAttribute("font-weight","700"),H.setAttribute("fill","rgba(30,30,30,.55)"),H.setAttribute("text-transform","uppercase"),H.setAttribute("letter-spacing","0.08em"),H.textContent="TOTAL DIÁRIO",j.appendChild(H);const U=mk("rect");U.setAttribute("x",0),U.setAttribute("y",0),U.setAttribute("width",G.LBL_W),U.setAttribute("height",A),U.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-surface2").trim()||"#F0F2F6"),j.appendChild(U),i.forEach((e,o)=>{const a=A+E+4+o*y,n=getDiscPal(i.indexOf(e)),r=n[0]+"22",s=mk("rect");s.setAttribute("x",0),s.setAttribute("y",a),s.setAttribute("width",G.LBL_W),s.setAttribute("height",y),s.setAttribute("fill",r),j.appendChild(s);const d=a+y/2,l=mk("rect");l.setAttribute("x",9),l.setAttribute("y",d-3),l.setAttribute("width",6),l.setAttribute("height",6),l.setAttribute("rx",1),l.setAttribute("fill",n[1]),j.appendChild(l);const c=mk("text");c.setAttribute("x",20),c.setAttribute("y",a+y/2+Math.round(.38*eftFontSz())),c.setAttribute("font-size",eftFontSz()),c.setAttribute("font-family","Oswald,sans-serif"),c.setAttribute("font-weight","700"),c.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--txt").trim()||"#1A1D23");const p=Math.floor((G.LBL_W-30)/(.6*eftFontSz()));c.textContent=e.label.length>p?e.label.slice(0,p-1)+"…":e.label,j.appendChild(c);const f=mk("rect");f.setAttribute("x",0),f.setAttribute("y",a),f.setAttribute("width",G.LBL_W),f.setAttribute("height",y),f.setAttribute("fill","transparent"),f.style.cursor="pointer",f.addEventListener("click",()=>gOpenDiscModal(t.id,e.id)),j.appendChild(f)});const Q=mk("line");Q.setAttribute("x1",G.LBL_W),Q.setAttribute("x2",G.LBL_W),Q.setAttribute("y1",0),Q.setAttribute("y2",w),Q.setAttribute("stroke","rgba(0,0,0,.20)"),Q.setAttribute("stroke-width","2"),j.appendChild(Q),C.appendChild(j),o.onscroll=()=>{j.setAttribute("transform",`translate(${o.scrollLeft},0)`)}};let f=!1;new ResizeObserver(()=>{f||(f=!0,requestAnimationFrame(()=>{f=!1,draw()}))}).observe(o),requestAnimationFrame(draw)}const HIST_H_STEPS=[120,160,200,260,320,400,500];let _histHIdx=3;function histHZoomIn(){_histHIdx=Math.min(_histHIdx+1,HIST_H_STEPS.length-1),renderHistograma()}function histHZoomOut(){_histHIdx=Math.max(_histHIdx-1,0),renderHistograma()}function histChartH(){return HIST_H_STEPS[_histHIdx]}function histVZoomBar(){return`<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;"><span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);white-space:nowrap;">altura</span><button onclick="histHZoomOut()" title="Reduzir altura"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">−</button><span style="font-family:var(--font);font-size:9px;font-weight:700;color:var(--txt-dim);min-width:30px;text-align:center;">${histChartH()}px</span><button onclick="histHZoomIn()" title="Aumentar altura"\n style="width:24px;height:22px;border:1px solid var(--border-md);background:var(--bg-surface2);color:var(--txt-muted);border-radius:4px;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;">+</button></div>`}let _histModo="barras",_histModoFases="somado";function histModoBar(){const t="curva"===_histModo;return`<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button onclick="_histModo='barras';renderHistograma()" title="Barras empilhadas" style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-radius:4px 0 0 4px;background:${t?"var(--bg-surface2)":"var(--accent)"};color:${t?"var(--txt-muted)":"#fff"};font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.04em;"> ▐▌ Barras </button><button onclick="_histModo='curva';renderHistograma()" title="Curva de efetivo" style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-left:none;border-radius:0 4px 4px 0;background:${t?"var(--accent)":"var(--bg-surface2)"};color:${t?"#fff":"var(--txt-muted)"};font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.04em;"> ∿ Curva </button></div>`}// ── Efetivo da Pré-Obra ───────────────────────────────────
function getPreObraEfetivoByDay(faseIdx) {
  var result = {}; // {isoDate: total}
  var poCfg = ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg || !poCfg.ativo) return result;

  var obraFase = gSt.obraFases[faseIdx];
  if (!obraFase) return result;

  var du = poCfg.du || 5;
  var fim = G.addD(new Date(obraFase.obra.start), -1);
  while (_isNaoUtilPO(fim)) fim = G.addD(fim, -1);
  var ini = new Date(fim), cnt = 1;
  while (cnt < du) { ini = G.addD(ini, -1); if (!_isNaoUtilPO(ini)) cnt++; }
  while (_isNaoUtilPO(ini)) ini = G.addD(ini, 1);

  var discs = _getPoDiscs(faseIdx);

  // Somar efetivo de todas as disciplinas por dia (inclui sábados)
  var cur = new Date(ini);
  while (G.ms(cur) <= G.ms(fim)) {
    if (!_isNaoUtilPO(cur)) {
      var iso = G.fmtISO(cur);
      var total = discs.reduce(function(sum, disc) {
        return sum + (disc.tasks || []).reduce(function(s, t) { return s + (t.prof || 0); }, 0);
      }, 0);
      result[iso] = (result[iso] || 0) + total;
    }
    cur = G.addD(cur, 1);
  }
  return result;
}

function getPreObraDays(faseIdx) {
  // Retorna array de day-objects {date,dow,isSat,isSun,buffer,mod} para o período de pré-obra
  var result = [];
  var poCfg = ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg || !poCfg.ativo) return result;
  var obraFase = gSt.obraFases[faseIdx];
  if (!obraFase) return result;
  var du = poCfg.du || 5;
  var fim = G.addD(new Date(obraFase.obra.start), -1);
  while (_isNaoUtilPO(fim)) fim = G.addD(fim, -1);
  var ini = new Date(fim), cnt = 1;
  while (cnt < du) { ini = G.addD(ini, -1); if (!_isNaoUtilPO(ini)) cnt++; }
  while (_isNaoUtilPO(ini)) ini = G.addD(ini, 1);
  var cur = new Date(ini);
  while (G.ms(cur) <= G.ms(fim)) {
    var dow = cur.getDay();
    if (dow !== 0) { // pula apenas domingos
      result.push({date:new Date(cur), dow:dow, isSat:dow===6, isSun:false, buffer:false, mod:0, isPreObra:true});
    }
    cur = G.addD(cur, 1);
  }
  return result;
}

function _isNaoUtilPO(d) {
  // Pré-obra trabalha sábado — só bloqueia domingos e feriados em dias de semana
  var dow = d.getDay();
  if (dow === 0) return true;          // domingo: sempre bloqueado
  if (dow === 6) return false;         // sábado: sempre permitido na pré-obra
  return CALENDARIO.isNaoUtil(d);      // segunda a sexta: segue feriados normais
}

function _getPoDiscs(faseIdx) {
  // Sempre retorna as disciplinas customizadas se existirem; senão usa o template
  var _custom = ESTADO.preObraCustom && ESTADO.preObraCustom[faseIdx];
  if (_custom && _custom.disciplinas && _custom.disciplinas.length) {
    return _custom.disciplinas.filter(function(d){return d.ativo!==false;});
  }
  var poCfg = ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg) return [];
  var tpl = typeof _preObraGetTemplate==='function' ? _preObraGetTemplate(poCfg.templateId) : null;
  if (!tpl) return [];
  return typeof _preObraMakeDiscs==='function' ? _preObraMakeDiscs(poCfg.templateId) : tpl.disciplinas.filter(function(d){return d.ativo!==false;});
}

function getPreObraDiscsByDay(faseIdx) {
  // Retorna [{label, id, profByDay: {iso:{total}}, isPO:true}] para cada disciplina de pré-obra
  var result = [];
  var poCfg = ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg || !poCfg.ativo) return result;
  var days = getPreObraDays(faseIdx);
  if (!days.length) return result;
  var discs = _getPoDiscs(faseIdx);
  discs.forEach(function(disc) {
    var totalProf = (disc.tasks||[]).reduce(function(s,t){return s+(t.prof||0);},0);
    if (!totalProf) return;
    var profByDay = {};
    days.forEach(function(d) {
      if (!_isNaoUtilPO(d.date)) {
        var iso = G.fmtISO(d.date);
        profByDay[iso] = {total: totalProf, hasService: true, hasPrep: false};
      }
    });
    result.push({label:'⚙ '+(disc.label||disc.id), id:'po_'+faseIdx+'_'+(disc.id||disc.label), profByDay: profByDay, isPO: true, color: '#C07820'});
  });
  return result;
}

function getPreObraEfetivoTotal() {
  // Retorna efetivo total de todas as fases de pré-obra por dia
  var result = {};
  gSt.obraFases.forEach(function(of, fi) {
    var byDay = getPreObraEfetivoByDay(fi);
    Object.keys(byDay).forEach(function(iso) {
      result[iso] = (result[iso] || 0) + byDay[iso];
    });
  });
  return result;
}

function renderHistograma(){const t=document.getElementById("pane-histograma");t.innerHTML="";const e=gSt.obraFases[0];if(!e)return void(t.innerHTML='<div class="pane-placeholder"><div class="ph-title">Configure a obra primeiro</div></div>');const o=G.SEG_N,a=[3,5,7],dkFmt=t=>{const e=new Date(t);return e.getFullYear()+"-"+String(e.getMonth()+1).padStart(2,"0")+"-"+String(e.getDate()).padStart(2,"0")},n=new Map;gSt.obraFases.forEach(t=>{const{days:e}=gerarDiasModulos(t);e.forEach(t=>{if(t.buffer)return;const e=dkFmt(t.date);n.has(e)||n.set(e,{...t})})});const r=[...n.entries()].sort(([t],[e])=>t.localeCompare(e)).map(([,t])=>t);
// Prefixar dias de pré-obra (acontecem antes da obra)
(function(){
  var poDays=[];
  gSt.obraFases.forEach(function(_of,_fi){var d=getPreObraDays(_fi);d.forEach(function(x){if(!n.has(G.fmtISO(x.date)))poDays.push(x);});});
  if(poDays.length){
    // Remover duplicatas e ordenar
    var seen=new Set(r.map(function(x){return G.fmtISO(x.date);}));
    var newDays=poDays.filter(function(x){return!seen.has(G.fmtISO(x.date));}).sort(function(a,b){return G.ms(a.date)-G.ms(b.date);});
    Array.prototype.splice.apply(r,[0,0].concat(newDays));
  }
})();
if(r.length>1){const t=[];for(let e=0;e<r.length-1;e++){t.push(r[e]);let o=new Date(r[e].date);o.setDate(o.getDate()+1);const a=new Date(r[e+1].date);for(;o<a;){const e=o.getDay();t.push({date:new Date(o),dow:e,isSat:6===e,isSun:0===e,buffer:!0,mod:0,weight:0}),o.setDate(o.getDate()+1)}}t.push(r[r.length-1]),r.length=0,r.push(...t)}const i=(e.disciplinas||[]).filter(t=>!1!==t.ativo),s=gSt.obraFases.length>1,d=gSt.obraFases.map(t=>{const e=(t.disciplinas||[]).filter(t=>!1!==t.ativo),{days:a}=gerarDiasModulos(t),n=new Map;a.forEach(t=>{t.buffer||n.set(dkFmt(t.date),t.mod)});const r=e.map(t=>{const e={};for(let n=1;n<=o;n++){const o=t.tasks.filter(t=>(t.m[n]||0)>0);if(!o.length)continue;const r=o.reduce((t,e)=>t+(e.prof||0),0);a.forEach(t=>{t.buffer||t.isSun||t.mod!==n||(e[dkFmt(t.date)]={total:r})})}return e});return{discF:e,profByDay:r,dateToMod:n,totalByMod:e.reduce((t,e)=>{for(let a=1;a<=o;a++)t[a]=(t[a]||0)+e.tasks.filter(t=>(t.m[a]||0)>0).reduce((t,e)=>t+(e.prof||0),0);return t},{})}}),l=document.createElement("div");l.style.cssText="flex-shrink:0;display:flex;flex-wrap:wrap;gap:4px 10px;padding:6px 14px;align-items:center;border-bottom:1px solid var(--divider);background:var(--bg-panel);",i.forEach((t,e)=>{const o=document.createElement("div");o.style.cssText="display:flex;align-items:center;gap:4px;font-size:9px;font-family:var(--font);color:var(--txt-muted);letter-spacing:.3px;",o.innerHTML=`<span style="width:10px;height:10px;border-radius:2px;background:${HEAT_CFG.discColors[e%HEAT_CFG.discColors.length]};flex-shrink:0;"></span>${t.label}`,l.appendChild(o)}),s&&l.insertAdjacentHTML("beforeend",`${ctrlSep()}<div style="display:flex;align-items:center;gap:3px;flex-shrink:0;"><button onclick="_histModoFases='somado';renderHistograma()" style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-radius:4px 0 0 4px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;background:${"somado"===_histModoFases?"var(--accent)":"var(--bg-surface2)"};color:${"somado"===_histModoFases?"#fff":"var(--txt-muted)"};">∑ Somado</button><button onclick="_histModoFases='separado';renderHistograma()" style="height:22px;padding:0 8px;border:1px solid var(--border-md);border-radius:0 4px 4px 0;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;background:${"separado"===_histModoFases?"var(--accent)":"var(--bg-surface2)"};color:${"separado"===_histModoFases?"#fff":"var(--txt-muted)"};">⊟ Separado</button></div>`),l.insertAdjacentHTML("beforeend",histModoBar()),t.appendChild(l),t.style.display="flex",t.style.flexDirection="column";const c=document.createElement("div");c.className="chart-scroll",c.style.cssText="flex:1;min-height:0;overflow:auto;position:relative;background:var(--bg);",t.appendChild(c);const p="separado"===_histModoFases&&s,f=p?gSt.obraFases.map((t,e)=>({label:t.nome?.trim()||`Fase ${t.id}`,days:r,disc:d[e].discF,profByDay:d[e].profByDay,dateToMod:d[e].dateToMod,totalByMod:d[e].totalByMod})):[{label:null,days:r,disc:i,profByDay:i.map((t,e)=>{const o={};return gSt.obraFases.forEach((t,a)=>{const n=d[a].profByDay[e];n&&Object.entries(n).forEach(([t,e])=>{o[t]||(o[t]={total:0}),o[t].total+=e.total})}),o}),dateToMod:null,totalByMod:null}];f.forEach((t,_fi)=>{
  // Adicionar discs de pré-obra ao bloco
  var _pdList=getPreObraDiscsByDay(_fi);
  if(_pdList.length){
    t.disc=[..._pdList,...t.disc];
    t.profByDay=[..._pdList.map(pd=>pd.profByDay),...t.profByDay];
  }
  t.preObraByDay=getPreObraEfetivoByDay(_fi);
  t.totalByDate={},r.forEach(e=>{if(e.buffer||e.isSun)return;const o=dkFmt(e.date);t.totalByDate[o]=(t.disc.reduce((e,a,n)=>e+(t.profByDay[n][o]?.total||0),0))});
  t.maxVal=Math.max(...r.map(e=>t.totalByDate[dkFmt(e.date)]||0),1);t.displayMax=Math.ceil(t.maxVal*1.18);
  t.hasPreObra=Object.keys(t.preObraByDay||{}).length>0;
});const u=32,g=G.LBL_W,m=[];f.forEach((t,e)=>{if(p){const o=document.createElement("div");o.style.cssText=`flex-shrink:0;display:flex;align-items:center;gap:8px;padding:5px 12px;\n background:${darkenHex(COR.OBRA_MOM,.72)};\n font-family:var(--font);font-size:10px;font-weight:700;color:#fff;\n text-transform:uppercase;letter-spacing:.06em;\n ${e>0?"margin-top:12px;":""}`,o.textContent=t.label,c.appendChild(o)}const n=document.createElement("div");n.style.cssText=`position:relative;padding-top:${0===e?"16":"4"}px;`,c.appendChild(n),m.push(()=>{n.innerHTML="";const e=c.clientWidth||900,i=histChartH()+u+44,s=eftDayPx(),d=t.days,l=null!==s?s:Math.max(1,(e-g)/Math.max(d.length,1)),p=g,f=d.length*l,m=i-u-44,b={};for(let e=1;e<=o;e++){let o=-1,a=0;d.forEach((n,r)=>{(t.dateToMod?t.dateToMod.get(dkFmt(n.date))||0:n.mod)===e&&(o<0&&(o=r),a++)}),b[e]={left:o<0?0:o*l,width:a*l}}const x=t.displayMax||t.maxVal,h=t.totalByDate,A=document.createElementNS("http://www.w3.org/2000/svg","svg");A.setAttribute("width",Math.max(e,p+f)),A.setAttribute("height",i),A.style.display="block";const y=x<=5?1:x<=10?2:x<=20?5:10,E=[];for(let t=0;t<=x;t+=y)E.push(t);E[E.length-1]<x&&E.push(x),E.forEach(t=>{const e=u+m-t/x*m,o=document.createElementNS("http://www.w3.org/2000/svg","line");o.setAttribute("x1",p),o.setAttribute("x2",p+f),o.setAttribute("y1",e),o.setAttribute("y2",e),o.setAttribute("stroke",0===t?"rgba(0,0,0,.20)":"rgba(0,0,0,.07)"),o.setAttribute("stroke-width",0===t?"1.5":"1"),A.appendChild(o);const a=document.createElementNS("http://www.w3.org/2000/svg","text");a.setAttribute("x",p-6),a.setAttribute("y",e+4),a.setAttribute("text-anchor","end"),a.setAttribute("font-size",eftFontSz()),a.setAttribute("font-family","Oswald,sans-serif"),a.setAttribute("fill","rgba(90,75,55,.75)"),a.textContent=t,A.appendChild(a)});const D=document.createElementNS("http://www.w3.org/2000/svg","text");D.setAttribute("x",11),D.setAttribute("y",u+m/2),D.setAttribute("text-anchor","middle"),D.setAttribute("font-size",Math.max(7,eftFontSz()-2)),D.setAttribute("font-family","Oswald,sans-serif"),D.setAttribute("fill","rgba(90,75,55,.55)"),D.setAttribute("transform",`rotate(-90,11,${u+m/2})`),D.textContent="profissionais / dia",A.appendChild(D),d.forEach((t,e)=>{if(!t.isSat&&!t.isSun&&!t.buffer)return;const o=document.createElementNS("http://www.w3.org/2000/svg","rect");o.setAttribute("x",p+e*l),o.setAttribute("y",u),o.setAttribute("width",l),o.setAttribute("height",m),o.setAttribute("fill",t.buffer?"rgba(0,0,0,.025)":t.isSun?"rgba(140,120,80,.08)":"rgba(200,130,20,.10)"),A.appendChild(o)});
// Linha separadora Pré-Obra / Obra
(function(){
  var _lastPO=-1,_firstObra=-1;
  d.forEach(function(day,di){
    if(day.isPreObra&&!day.buffer&&!day.isSun) _lastPO=di;
    else if(!day.isPreObra&&!day.buffer&&!day.isSun&&_firstObra<0) _firstObra=di;
  });
  if(_lastPO>=0&&_firstObra>_lastPO){
    // Posição entre o último dia de pré-obra e o primeiro dia de obra
    var _sepX=p+_firstObra*l;
    // Faixa sombreada fina de separação
    var _band=document.createElementNS("http://www.w3.org/2000/svg","rect");
    _band.setAttribute("x",_sepX-1);_band.setAttribute("y",u-8);
    _band.setAttribute("width",2);_band.setAttribute("height",m+12);
    _band.setAttribute("fill","rgba(180,52,18,.18)");
    A.appendChild(_band);
    // Linha tracejada
    var _line=document.createElementNS("http://www.w3.org/2000/svg","line");
    _line.setAttribute("x1",_sepX);_line.setAttribute("x2",_sepX);
    _line.setAttribute("y1",u-8);_line.setAttribute("y2",u+m+4);
    _line.setAttribute("stroke","#B83418");_line.setAttribute("stroke-width","1.5");
    _line.setAttribute("stroke-dasharray","5,3");_line.setAttribute("opacity","0.75");
    A.appendChild(_line);
    // Label "PRÉ-OBRA" acima da linha
    var _lbl=document.createElementNS("http://www.w3.org/2000/svg","text");
    _lbl.setAttribute("x",_sepX-4);_lbl.setAttribute("y",u-10);
    _lbl.setAttribute("text-anchor","end");
    _lbl.setAttribute("font-size",Math.max(7,eftFontSz()-1));
    _lbl.setAttribute("font-family","Oswald,sans-serif");
    _lbl.setAttribute("font-weight","700");
    _lbl.setAttribute("fill","#B83418");
    _lbl.setAttribute("opacity","0.80");
    _lbl.textContent="PRÉ-OBRA ◀";
    A.appendChild(_lbl);
    var _lbl2=document.createElementNS("http://www.w3.org/2000/svg","text");
    _lbl2.setAttribute("x",_sepX+4);_lbl2.setAttribute("y",u-10);
    _lbl2.setAttribute("text-anchor","start");
    _lbl2.setAttribute("font-size",Math.max(7,eftFontSz()-1));
    _lbl2.setAttribute("font-family","Oswald,sans-serif");
    _lbl2.setAttribute("font-weight","700");
    _lbl2.setAttribute("fill","#B83418");
    _lbl2.setAttribute("opacity","0.80");
    _lbl2.textContent="▶ OBRA";
    A.appendChild(_lbl2);
  }
})();for(let e=2;e<=o;e++){if(b[e].width<=0)continue;const o=p+b[e].left,n=a.includes(e-1),r=n&&!!t.dateToMod,i=document.createElementNS("http://www.w3.org/2000/svg","line");if(i.setAttribute("x1",o),i.setAttribute("x2",o),i.setAttribute("y1",r?22:u),i.setAttribute("y2",u+m),i.setAttribute("stroke",r?"#B83418":"rgba(0,0,0,.10)"),i.setAttribute("stroke-width",r?"2":"1"),r||i.setAttribute("stroke-dasharray","3,3"),A.appendChild(i),n&&t.dateToMod){const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",o+4),t.setAttribute("y",30),t.setAttribute("font-size",Math.max(7,eftFontSz()-2)),t.setAttribute("font-family","Oswald,sans-serif"),t.setAttribute("fill","#B83418"),t.setAttribute("font-weight","700"),t.textContent=4===e?"V1":6===e?"V2":"V3",A.appendChild(t)}}const _diaEstaFaseH=e=>!e.buffer&&!e.isSun&&(!t.dateToMod||t.dateToMod.has(dkFmt(e.date))),w=d.findIndex(_diaEstaFaseH),S=d.length-1-[...d].reverse().findIndex(_diaEstaFaseH),_addTriHist=(t,e)=>{const o=u+m+3,a=document.createElementNS("http://www.w3.org/2000/svg","polygon");a.setAttribute("points",t+","+o+" "+(t-6)+","+(o+6)+" "+(t+6)+","+(o+6)),a.setAttribute("fill",e),a.setAttribute("stroke","rgba(0,0,0,.1)"),a.setAttribute("stroke-width","0.5"),A.appendChild(a)};if(w>=0&&_addTriHist(p+w*l+l/2,"#4CAF8A"),S>=0&&_addTriHist(p+S*l+l/2,"#E57373"),"barras"===_histModo){const e=l>10?1:0,a=Math.max(1,l-e);d.forEach((o,n)=>{if(o.isSun||o.buffer)return;const r=dkFmt(o.date),i=p+n*l+e,s=o.isSat?.75:1;let d=u+m;t.disc.forEach((e,o)=>{const n=t.profByDay[o][r]?.total||0;if(!n)return;const c=n/x*m;d-=c;const p=HEAT_CFG.discColors[o%HEAT_CFG.discColors.length],f=document.createElementNS("http://www.w3.org/2000/svg","rect");f.setAttribute("x",i),f.setAttribute("y",d),f.setAttribute("width",a),f.setAttribute("height",c),f.setAttribute("fill",s<1?hexDim(p,s):p),f.setAttribute("rx",l>10?"1":"0"),A.appendChild(f)})});for(let e=1;e<=o;e++){const o=b[e];if(o.width<=0)continue;const a=t.totalByMod?t.totalByMod[e]||0:t.disc.reduce((o,a,n)=>{let i=0;return r.forEach(o=>{o.buffer||o.isSun||(t.dateToMod?t.dateToMod.get(dkFmt(o.date))||0:o.mod)===e&&(i+=t.profByDay[n][dkFmt(o.date)]?.total||0)}),o+i},0);if(!a)continue;const n=p+o.left+o.width/2,i=u+m-a/x*m-5;if(i<40)continue;const s=document.createElementNS("http://www.w3.org/2000/svg","text");s.setAttribute("x",n),s.setAttribute("y",i),s.setAttribute("text-anchor","middle"),s.setAttribute("font-size",eftFontSz()),s.setAttribute("font-family","Oswald,sans-serif"),s.setAttribute("font-weight","600"),s.setAttribute("fill","rgba(60,35,0,.80)"),s.textContent=a,A.appendChild(s)}}else{const e="#00AEDF",a="rgba(0,174,223,0.15)",n=d.map((t,e)=>{const o=dkFmt(t.date),a=t.isSun||t.buffer?0:h[o]||0;return{x:p+e*l+l/2,y:u+m-(a>0?a/x*m:0),v:a,day:t,dk:o}}).filter(t=>!t.day.buffer);if(n.length>1){const r=u+m;let i=`M${n[0].x},${r} L${n[0].x},${n[0].y}`;for(let t=1;t<n.length;t++){const e=n[t-1],o=n[t],a=(e.x+o.x)/2;i+=` C${a},${e.y} ${a},${o.y} ${o.x},${o.y}`}i+=` L${n[n.length-1].x},${r} Z`;const s=document.createElementNS("http://www.w3.org/2000/svg","path");s.setAttribute("d",i),s.setAttribute("fill",a),A.appendChild(s);let d=`M${n[0].x},${n[0].y}`;for(let t=1;t<n.length;t++){const e=n[t-1],o=n[t],a=(e.x+o.x)/2;d+=` C${a},${e.y} ${a},${o.y} ${o.x},${o.y}`}const c=document.createElementNS("http://www.w3.org/2000/svg","path");c.setAttribute("d",d),c.setAttribute("fill","none"),c.setAttribute("stroke",e),c.setAttribute("stroke-width","2.5"),c.setAttribute("stroke-linecap","round"),c.setAttribute("stroke-linejoin","round"),A.appendChild(c);for(let t=1;t<=o;t++){const o=b[t];if(o.width<=0)continue;const a=p+o.left+o.width/2;let r=null,i=1/0;if(n.forEach(t=>{const e=Math.abs(t.x-a);e<i&&(i=e,r=t)}),!r||!r.v)continue;const s=document.createElementNS("http://www.w3.org/2000/svg","circle");s.setAttribute("cx",r.x),s.setAttribute("cy",r.y),s.setAttribute("r","5"),s.setAttribute("fill",e),s.setAttribute("stroke","#fff"),s.setAttribute("stroke-width","2"),A.appendChild(s);const d=r.y-10;if(d>38){const t=document.createElementNS("http://www.w3.org/2000/svg","text");t.setAttribute("x",r.x),t.setAttribute("y",d),t.setAttribute("text-anchor","middle"),t.setAttribute("font-size",eftFontSz()+1),t.setAttribute("font-family","Oswald,sans-serif"),t.setAttribute("font-weight","700"),t.setAttribute("fill",e),t.textContent=r.v,A.appendChild(t)}}n.forEach(e=>{if(!e.v)return;
// Label do total diário em cima de cada ponto da curva
if(l>=8){const _cy=e.y-10;if(_cy>u+4){const _cl=document.createElementNS("http://www.w3.org/2000/svg","text");_cl.setAttribute("x",e.x);_cl.setAttribute("y",_cy);_cl.setAttribute("text-anchor","middle");_cl.setAttribute("font-size",Math.max(6,Math.min(eftFontSz()-1,l-3)));_cl.setAttribute("font-family","Oswald,sans-serif");_cl.setAttribute("font-weight","700");_cl.setAttribute("fill",e.day.isSat?"rgba(160,90,0,.90)":"#00AEDF");_cl.textContent=e.v;A.appendChild(_cl);}}
const o=document.createElementNS("http://www.w3.org/2000/svg","rect");o.setAttribute("x",e.x-l/2),o.setAttribute("y",u),o.setAttribute("width",l),o.setAttribute("height",m),o.setAttribute("fill","transparent");const a=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][e.day.dow],n=t.dateToMod?t.dateToMod.get(e.dk)||"?":e.day.mod;o.addEventListener("mouseenter",o=>{let r=`<div style="font-family:var(--font);font-size:10px;font-weight:700;color:#00C8FF;margin-bottom:6px;">${a} ${fmtDateEft(e.day.date)} — M${n}</div>`;t.disc.forEach((o,a)=>{const n=t.profByDay[a][e.dk]?.total||0;n&&(r+=`<div style="display:flex;align-items:center;gap:5px;margin:2px 0;"><div style="width:8px;height:8px;border-radius:2px;background:${HEAT_CFG.discColors[a%HEAT_CFG.discColors.length]};flex-shrink:0;"></div><span style="flex:1;font-size:10px;">${o.label}</span><span style="font-size:10px;font-weight:700;color:#D4A848;">${n}</span></div>`)}),r+=`<div style="border-top:1px solid rgba(255,255,255,.15);margin-top:5px;padding-top:4px;font-size:11px;color:#D4A848;">Total: <strong>${e.v}</strong> prof/dia</div>`,showEftTip(o,r)}),o.addEventListener("mousemove",moveEftTip),o.addEventListener("mouseleave",hideEftTip),A.appendChild(o)})}}const C=u+m,I=document.createElementNS("http://www.w3.org/2000/svg","line");I.setAttribute("x1",p),I.setAttribute("x2",p+(null!==s?f:Math.max(f,e-p))),I.setAttribute("y1",C),I.setAttribute("y2",C),I.setAttribute("stroke","rgba(0,0,0,.20)"),I.setAttribute("stroke-width","1.5"),A.appendChild(I);for(let t=1;t<=o;t++){const e=b[t];if(e.width<=0)continue;const o=p+e.left+e.width/2,a=document.createElementNS("http://www.w3.org/2000/svg","text");a.setAttribute("x",o),a.setAttribute("y",C+14-2),a.setAttribute("text-anchor","middle"),a.setAttribute("font-size",eftFontSz()),a.setAttribute("font-family","Oswald,sans-serif"),a.setAttribute("fill","rgba(90,75,55,.75)"),a.textContent="M"+t,A.appendChild(a)}const F=document.createElementNS("http://www.w3.org/2000/svg","line");F.setAttribute("x1",p),F.setAttribute("x2",p+(null!==s?f:Math.max(f,e-p))),F.setAttribute("y1",C+14),F.setAttribute("y2",C+14),F.setAttribute("stroke","rgba(0,0,0,.08)"),F.setAttribute("stroke-width","1"),A.appendChild(F);const _=document.createElementNS("http://www.w3.org/2000/svg","rect");_.setAttribute("x",p),_.setAttribute("y",C+14),_.setAttribute("width",null!==s?f:Math.max(f,e-p)),_.setAttribute("height",30),_.setAttribute("fill",getComputedStyle(document.documentElement).getPropertyValue("--bg-surface").trim()||"#FFFFFF"),_.setAttribute("opacity","0.6"),A.appendChild(_),buildDayHeaderSVG(t=>document.createElementNS("http://www.w3.org/2000/svg",t),d,l,p,C+14,30).forEach(t=>A.appendChild(t)),"barras"===_histModo&&d.forEach((e,o)=>{if(e.isSun||e.buffer)return;const a=dkFmt(e.date),n=h[a]||0;if(!n)return;
// Label do total diário em cima da barra
if(l>=8){const _barTopY=u+m-n/x*m;const _lbl=document.createElementNS("http://www.w3.org/2000/svg","text");_lbl.setAttribute("x",p+o*l+l/2);_lbl.setAttribute("y",Math.max(u+9,_barTopY-3));_lbl.setAttribute("text-anchor","middle");_lbl.setAttribute("font-size",Math.max(6,Math.min(eftFontSz()-1,l-3)));_lbl.setAttribute("font-family","Oswald,sans-serif");_lbl.setAttribute("font-weight","700");_lbl.setAttribute("fill",e.isSat?"rgba(160,90,0,.90)":"rgba(60,35,0,.82)");_lbl.textContent=n;A.appendChild(_lbl);}
const r=document.createElementNS("http://www.w3.org/2000/svg","rect");r.setAttribute("x",p+o*l),r.setAttribute("y",u),r.setAttribute("width",l),r.setAttribute("height",m),r.setAttribute("fill","transparent"),r.style.cursor="default";const i=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][e.dow],s=t.dateToMod?t.dateToMod.get(a)||"?":e.mod;r.addEventListener("mouseenter",o=>{let r=`<div style="font-family:var(--font);font-size:10px;font-weight:700;color:#00C8FF;margin-bottom:6px;">${i} ${fmtDateEft(e.date)} — M${s}</div>`;t.disc.forEach((e,o)=>{const n=t.profByDay[o][a]?.total||0;n&&(r+=`<div style="display:flex;align-items:center;gap:5px;margin:2px 0;"><div style="width:8px;height:8px;border-radius:2px;background:${HEAT_CFG.discColors[o%HEAT_CFG.discColors.length]};flex-shrink:0;"></div><span style="flex:1;font-size:10px;">${e.label}</span><span style="font-size:10px;font-weight:700;color:#D4A848;">${n}</span></div>`)}),r+=`<div style="border-top:1px solid rgba(255,255,255,.15);margin-top:5px;padding-top:4px;font-size:11px;color:#D4A848;">Total: <strong>${n}</strong> prof/dia</div>`,showEftTip(o,r)}),r.addEventListener("mousemove",moveEftTip),r.addEventListener("mouseleave",hideEftTip),A.appendChild(r)}),n.appendChild(A)})});let b=!1;const redrawAll=()=>{m.forEach(t=>t())};new ResizeObserver(()=>{b||(b=!0,requestAnimationFrame(()=>{b=!1,redrawAll()}))}).observe(c),requestAnimationFrame(redrawAll)}function renderFornecedores(){const t=document.getElementById("pane-fornecedores");t.innerHTML="",t.style.display="flex",t.style.flexDirection="column",t.style.overflow="hidden";const e=gSt.obraFases[0];if(!e)return void(t.innerHTML='<div class="pane-placeholder"><div class="ph-title">Configure a obra primeiro</div></div>');const o=e.disciplinas||[],a=G.SEG_N;window._fornData||(window._fornData={});const n=document.createElement("div");n.style.cssText="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);background:var(--bg-panel);",n.innerHTML='<div><span style="font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt);">Fornecedores por Disciplina</span><span style="font-family:var(--font);font-size:9px;color:var(--txt-dim);margin-left:10px;">Clique em uma célula para editar</span></div>',t.appendChild(n);const r=document.createElement("div");r.style.cssText="flex:1;overflow:auto;";const i=document.createElement("table");i.style.cssText="width:100%;border-collapse:collapse;font-family:var(--body);font-size:11px;";const s=document.createElement("thead");let d='<tr style="background:var(--bg-surface2);position:sticky;top:0;z-index:5;"><th style="width:140px;padding:8px 12px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border-md);border-right:2px solid var(--border-md);">Disciplina</th><th style="width:160px;padding:8px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border-md);border-right:1px solid var(--border);">Fornecedor</th><th style="width:100px;padding:8px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border-md);border-right:1px solid var(--border);">Responsável</th>';for(let t=1;t<=a;t++){const e=3===t||5===t;d+=`<th style="width:50px;padding:8px 4px;text-align:center;font-family:var(--font);font-size:9px;font-weight:700;color:${e?"#B83418":"var(--txt-muted)"};border-bottom:2px solid var(--border-md);border-right:${e?"2px solid #B83418":"1px solid var(--border)"};">M${t}</th>`}d+='<th style="padding:8px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border-md);">Observações</th></tr>',s.innerHTML=d,i.appendChild(s);const l=document.createElement("tbody");// Adicionar linha de Pré-Obra quando ativa
  var _poDiscs=[];
  gSt.obraFases.forEach(function(of,fi){
    var poCfg=ESTADO.cfg.obraFases&&ESTADO.cfg.obraFases[fi]&&ESTADO.cfg.obraFases[fi].preObra;
    if(!poCfg||!poCfg.ativo)return;
    var tpl=typeof _preObraGetTemplate==='function'?_preObraGetTemplate(poCfg.templateId):null;
    var ds=typeof _preObraMakeDiscs==='function'?_preObraMakeDiscs(poCfg.templateId):(tpl?tpl.disciplinas.filter(function(d){return d.ativo!==false;}):[]);
    ds.forEach(function(pd){_poDiscs.push({id:'po_'+fi+'_'+pd.id,label:'⚙ PO'+(gSt.obraFases.length>1?' F'+(fi+1):'')+' · '+pd.label,isPO:true,faseIdx:fi});});
  });
  if(_poDiscs.length>0){
    const _poHdr=document.createElement('tr');
    _poHdr.innerHTML='<td colspan="'+(4+a)+'" style="padding:5px 12px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A6010;background:#FEF6E4;border-bottom:1px solid #E8D088;">Pré-Obra</td>';
    l.appendChild(_poHdr);
    _poDiscs.forEach(function(pd,po){
      const _poKey='po_'+po;
      window._fornData[_poKey]||(window._fornData[_poKey]={fornecedor:'',responsavel:'',obs:'',mods:{}});
      const _poRow=window._fornData[_poKey],_poPal=getDiscPal(o.length+po),_poBg=_poPal[0]+'22';
      const _poTr=document.createElement('tr');
      _poTr.style.cssText='border-bottom:1px solid var(--divider);background:'+_poBg+';';
      var _poH='<td style="padding:7px 12px;border-right:2px solid var(--border-md);"><div style="display:flex;align-items:center;gap:5px;"><span style="width:5px;height:5px;border-radius:1px;background:'+_poPal[1]+';flex-shrink:0;"></span><span style="font-family:var(--font);font-size:10px;font-weight:700;color:#6A3810;">'+pd.label+'</span></div></td>';
      _poH+='<td style="padding:4px 6px;border-right:1px solid var(--border);"><input type="text" value="'+(_poRow.fornecedor||'')+'" placeholder="Nome do fornecedor…" style="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;"></td>';
      _poH+='<td style="padding:4px 6px;border-right:1px solid var(--border);"><input type="text" value="'+(_poRow.responsavel||'')+'" placeholder="Responsável…" style="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;"></td>';
      _poTr.innerHTML=_poH;
      for(let m=1;m<=a;m++){_poTr.innerHTML+='<td style="text-align:center;padding:4px 2px;border-right:1px solid var(--border);"><span style="font-size:9px;color:#A09060;">–</span></td>';}
      _poTr.innerHTML+='<td style="padding:4px 6px;"><input type="text" value="'+(_poRow.obs||'')+'" placeholder="Observações…" style="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;"></td>';
      l.appendChild(_poTr);
    });
  }
  o.forEach((t,o)=>{const n=`${e.id}_${t.id}`;window._fornData[n]||(window._fornData[n]={fornecedor:"",responsavel:"",obs:"",mods:{}});const r=window._fornData[n],i=getDiscPal(o),s=HEAT_CFG.discColors[o%HEAT_CFG.discColors.length],d=document.createElement("tr");d.style.cssText="border-bottom:1px solid var(--divider);transition:background .1s;",d.addEventListener("mouseenter",()=>d.style.background="var(--bg-surface2)"),d.addEventListener("mouseleave",()=>d.style.background="");const c=document.createElement("td");c.style.cssText="padding:7px 12px;border-right:2px solid var(--border-md);",c.innerHTML=`<div style="display:flex;align-items:center;gap:5px;"><span style="width:5px;height:5px;border-radius:1px;background:${i[1]};flex-shrink:0;"></span><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt);">${t.label}</span></div>`,d.appendChild(c);const p=document.createElement("td");p.style.cssText="padding:4px 6px;border-right:1px solid var(--border);";const f=document.createElement("input");f.type="text",f.value=r.fornecedor,f.placeholder="Nome do fornecedor…",f.style.cssText="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;color:var(--txt);font-family:var(--body);",f.addEventListener("focus",()=>f.style.borderColor="var(--accent)"),f.addEventListener("blur",()=>{f.style.borderColor="transparent",r.fornecedor=f.value}),p.appendChild(f),d.appendChild(p);const u=document.createElement("td");u.style.cssText="padding:4px 6px;border-right:1px solid var(--border);";const g=document.createElement("input");g.type="text",g.value=r.responsavel,g.placeholder="Responsável…",g.style.cssText="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;color:var(--txt);font-family:var(--body);",g.addEventListener("focus",()=>g.style.borderColor="var(--accent)"),g.addEventListener("blur",()=>{g.style.borderColor="transparent",r.responsavel=g.value}),u.appendChild(g),d.appendChild(u);for(let e=1;e<=a;e++){const o=t.tasks.some(t=>(t.m[e]||0)>0),a=3===e||5===e,n=document.createElement("td");if(n.style.cssText=`text-align:center;padding:4px 2px;border-right:${a?"2px solid rgba(184,52,24,.35)":"1px solid var(--border)"};`,o){const t=document.createElement("div");t.style.cssText=`width:14px;height:14px;border-radius:3px;background:${s};margin:auto;opacity:.85;`,t.title=`M${e}: ativo`,n.appendChild(t)}else n.innerHTML='<span style="color:var(--txt-dim);font-size:10px;">—</span>';d.appendChild(n)}const m=document.createElement("td");m.style.cssText="padding:4px 6px;";const b=document.createElement("input");b.type="text",b.value=r.obs,b.placeholder="Observações…",b.style.cssText="width:100%;padding:4px 6px;font-size:11px;background:transparent;border:1px solid transparent;border-radius:3px;outline:none;color:var(--txt);font-family:var(--body);",b.addEventListener("focus",()=>b.style.borderColor="var(--accent)"),b.addEventListener("blur",()=>{b.style.borderColor="transparent",r.obs=b.value}),m.appendChild(b),d.appendChild(m),l.appendChild(d)}),i.appendChild(l),r.appendChild(i),t.appendChild(r)}const _origSwitchTab=switchTab;window.switchTab=function(t){_origSwitchTab(t),"efetivo"===t?renderEfetivo():"histograma"===t?renderHistograma():"fornecedores"===t?renderFornecedores():"cronograma"===t&&"function"==typeof gRender&&gRender()},document.addEventListener("DOMContentLoaded",()=>{ativSincronizarG();carregarDadosSB().then(ok=>{try{if(!ok)estadoParaUI();renderProjFases();renderObraFases();motorRecalc();atualizarResumoDatas();requestAnimationFrame(()=>{setTimeout(gRender,80);});}catch(e){console.error('[INIT]',e);}try{const _st=sessionStorage.getItem('aw_crono_status')||'sim';const _nm=sessionStorage.getItem('aw_crono_nome')||ESTADO.meta.nome||'';const _ht=document.querySelector('.hdr-title');if(_ht){_ht.innerHTML='Planejamento<em> de Obra</em>'+(_nm?' · <span style="opacity:.6;">'+_nm+'</span>':'')+(_st==='frozen'?'<span style="font-size:9px;background:rgba(0,185,80,.2);color:#00B950;padding:1px 6px;border-radius:8px;margin-left:6px;">❄ Congelado</span>':'');}if(_st==='frozen'){const _b=document.getElementById('btn-plano-fino');if(_b)_b.style.display='none';const _w=document.getElementById('pf-watermark');if(_w)_w.style.display='none'/*plano fino removido v6.03.08*/;}}catch{}});}),window.addEventListener("resize",()=>{"function"==typeof gRender&&gRender()}),document.getElementById("modal-confirm").addEventListener("click",function(t){t.target===this&&fecharConfirm()})
function earqUpdateColors(){
  const c=COR?.ARQ_MOM||'#185FA5';
  const el=document.getElementById('earq-arq-label');
  if(el)el.style.color=c;
}
function earqGerarPDF(){
  if(!window.jspdf||!window.jspdf.jsPDF){
    alert('Biblioteca PDF não carregada. Verifique sua conexão e recarregue a página.');
    return;
  }
  try{
  const ea=earqGetEstado();
  const rows=earqGetRows();
  const BRL=v=>'R$ '+Math.round(v).toLocaleString('pt-BR');
  const getCota=r=>{const o=ea.cotas?.[r.key];return(null!=o&&!o._isDefault)?o:{dir:r.defA?.hDir??0,ger:r.defA?.hGer??0};};
  // Cor ARQ dinâmica
  const _hex=COR?.ARQ_MOM||'#185FA5';
  const _r=parseInt(_hex.slice(1,3),16);
  const _g=parseInt(_hex.slice(3,5),16);
  const _b=parseInt(_hex.slice(5,7),16);
  const _rl=Math.round(_r*0.12+243);
  const _gl=Math.round(_g*0.12+243);
  const _bl=Math.round(_b*0.12+243);
  const FCOLS=[_hex,'#2A5AA8','#8A3AA8','#2A8A5A'];

  // Agrupar por fase
  const fases={};
  rows.forEach(r=>{if(!fases[r.faseLabel])fases[r.faseLabel]={idx:r.faseIdx,rows:[]};fases[r.faseLabel].rows.push(r);});

  // Totais globais
  let totH=0,totD=0,totG=0,totC=0;
  rows.forEach(r=>{const c=getCota(r);totH+=r.hArq;totD+=c.dir||0;totG+=c.ger||0;totC+=r.hArq*ea.chArq+(c.dir||0)*ea.chDir+(c.ger||0)*ea.chGer;});

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210, ML=14, MR=14, MT=16, cw=W-ML-MR;
  let y=MT;

  // ── Cabeçalho ─────────────────────────────────────────────
  // Barra azul A|W — altura 10mm para dar fôlego
  doc.setFillColor(_r,_g,_b);
  doc.rect(ML,y,cw,10,'F');
  // Lado esquerdo: "ATHIÉ WOHNRATH" bold + separador + subtítulo normal
  doc.setFont('helvetica','bold');
  doc.setFontSize(9);
  doc.setTextColor(255,255,255);
  doc.text('ATHIÉ WOHNRATH',ML+3,y+6.5);
  // Medir largura do nome para posicionar separador
  const nomeW=doc.getTextWidth('ATHIÉ WOHNRATH');
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(Math.min(255,_r+130),Math.min(255,_g+130),Math.min(255,_b+130));
  doc.text('|',ML+3+nomeW+2,y+6.5);
  doc.setTextColor(255,255,255);
  doc.text('Estimativa de Custos de Arquitetura',ML+3+nomeW+6,y+6.5);
  // Data de emissão — margem direita segura (W-MR-2)
  const hoje=new Date().toLocaleDateString('pt-BR');
  doc.setFontSize(7.5);
  doc.text('Emissão: '+hoje,W-MR-2,y+6.5,{align:'right'});
  y+=18;

  // Dados do projeto
  doc.setTextColor(30,40,60);
  doc.setFont('helvetica','bold');
  doc.setFontSize(14);
  const nome=ESTADO.meta?.nome||'Projeto';
  const cod=ESTADO.meta?.codigo||'—';
  doc.text(nome+' — '+cod,ML,y);
  y+=6;
  doc.setFont('helvetica','normal');
  doc.setFontSize(8);
  doc.setTextColor(100,110,130);
  const gi=ESTADO.meta?.gi||'—', gp=ESTADO.meta?.gp||'—';
  doc.text('GI: '+gi+'   GP: '+gp,ML,y);
  y+=8;

  // Linha separadora
  doc.setDrawColor(210,215,225);
  doc.setLineWidth(0.3);
  doc.line(ML,y,W-MR,y);
  y+=5;

  // ── Tabelas por fase ──────────────────────────────────────
  const faseEntries=Object.entries(fases);
  faseEntries.forEach(([faseLbl,fase],fi)=>{
    const fColHex=FCOLS[fase.idx%FCOLS.length];
    const fColRGB=fColHex==='#185FA5'?[24,95,165]:fColHex==='#2A5AA8'?[42,90,168]:fColHex==='#8A3AA8'?[138,58,168]:[42,138,90];

    // Cabeçalho da fase
    if(y>250){doc.addPage();y=MT;}
    doc.setFillColor(_rl,_gl,_bl);
    doc.rect(ML,y,cw,6,'F');
    doc.setDrawColor(...fColRGB);
    doc.setLineWidth(1);
    doc.line(ML,y,ML,y+6);
    doc.setLineWidth(0.3);
    doc.setFont('helvetica','bold');
    doc.setFontSize(8);
    doc.setTextColor(...fColRGB);
    doc.text(faseLbl.toUpperCase(),ML+3,y+4);

    // Custo da fase (calcular)
    let fC=0;
    fase.rows.forEach(r=>{const c=getCota(r);fC+=r.hArq*ea.chArq+(c.dir||0)*ea.chDir+(c.ger||0)*ea.chGer;});
    doc.text(BRL(fC),W-MR-2,y+4,{align:'right'});
    y+=8;

    // Cabeçalho da tabela
    const cols=[
      {header:'Atividade',dataKey:'nome'},
      {header:'DU',dataKey:'du'},
      {header:'Dir. h',dataKey:'hdDir'},
      {header:'Custo Dir.',dataKey:'cDir'},
      {header:'Ger. h',dataKey:'hdGer'},
      {header:'Custo Ger.',dataKey:'cGer'},
      {header:'Arq. h',dataKey:'hArq'},
      {header:'Custo Arq.',dataKey:'cArq'},
      {header:'Total',dataKey:'total'},
    ];

    const tableData=[];
    let fH=0,fD=0,fG=0,fDc=0,fGc=0,fAc=0,fTc=0;
    fase.rows.forEach(r=>{
      const cota=getCota(r);
      const hD=cota.dir||0,hG=cota.ger||0;
      const cD=hD*ea.chDir,cG=hG*ea.chGer,cA=r.hArq*ea.chArq,cT=cD+cG+cA;
      fH+=r.hArq;fD+=hD;fG+=hG;fDc+=cD;fGc+=cG;fAc+=cA;fTc+=cT;
      tableData.push({
        nome:r.nome, du:String(r.du),
        hdDir:hD?hD+'h':'—', cDir:cD?BRL(cD):'—',
        hdGer:hG?hG+'h':'—', cGer:cG?BRL(cG):'—',
        hArq:r.hArq?r.hArq+'h':'—', cArq:cA?BRL(cA):'—',
        total:cT?BRL(cT):'—'
      });
    });
    // Linha de subtotal
    tableData.push({
      nome:'Subtotal '+faseLbl, du:'',
      hdDir:fD?fD+'h':'—', cDir:BRL(fDc),
      hdGer:fG?fG+'h':'—', cGer:BRL(fGc),
      hArq:fH?fH+'h':'—', cArq:BRL(fAc),
      total:BRL(fTc),
      _subtotal:true
    });

    doc.autoTable({
      startY:y,
      margin:{left:ML,right:MR},
      columns:cols,
      body:tableData,
      theme:'plain',
      styles:{fontSize:7.5,cellPadding:{top:2,bottom:2,left:3,right:3},font:'helvetica',textColor:[30,40,60],lineColor:[220,224,232],lineWidth:0.2},
      headStyles:{fillColor:[_rl,_gl,_bl],textColor:[80,90,110],fontStyle:'bold',fontSize:7,halign:'right'},
      columnStyles:{
        nome:{halign:'left',fontStyle:'bold',cellWidth:32},
        du:{halign:'right',cellWidth:10},
        hdDir:{halign:'right',cellWidth:14,textColor:[83,74,183]},
        cDir:{halign:'right',cellWidth:20,textColor:[83,74,183]},
        hdGer:{halign:'right',cellWidth:14,textColor:[15,110,86]},
        cGer:{halign:'right',cellWidth:20,textColor:[15,110,86]},
        hArq:{halign:'right',cellWidth:14,textColor:[_r,_g,_b]},
        cArq:{halign:'right',cellWidth:20,textColor:[_r,_g,_b]},
        total:{halign:'right',cellWidth:24,fontStyle:'bold',textColor:[Math.round(_r*0.6),Math.round(_g*0.6),Math.round(_b*0.6)]},
      },
      didParseCell:function(data){
        if(data.row.raw&&data.row.raw._subtotal){
          data.cell.styles.fillColor=[242,245,252];
          data.cell.styles.fontStyle='bold';
          data.cell.styles.lineColor=[_r,_g,_b];
        }
      },
    });
    y=doc.lastAutoTable.finalY+6;
  });

  // ── Total Geral ───────────────────────────────────────────
  if(y>265){doc.addPage();y=MT;}
  doc.setFillColor(_r,_g,_b);
  doc.rect(ML,y,cw,9,'F');
  doc.setFont('helvetica','bold');
  doc.setFontSize(8);
  doc.setTextColor(255,255,255);
  doc.text('TOTAL GERAL ESTIMADO',ML+3,y+6);
  doc.setFontSize(10);
  doc.text(BRL(totC),W-MR-2,y+6,{align:'right'});
  y+=13;

  // Linha de detalhamento
  doc.setFont('helvetica','normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80,90,110);
  doc.text(totH+'h ARQ    '+totD+'h Diretoria    '+totG+'h Gerente',ML,y);
  y+=10;

  // ── Rodapé em todas as páginas ────────────────────────────
  const totalPages=doc.getNumberOfPages();
  for(let i=1;i<=totalPages;i++){
    doc.setPage(i);
    const ry=297-10;
    doc.setDrawColor(210,215,225);
    doc.setLineWidth(0.3);
    doc.line(ML,ry-3,W-MR,ry-3);
    doc.setFont('helvetica','normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150,155,165);
    doc.text('Estimativa de Custos ARQ — '+nome+' — '+cod,ML,ry);
    doc.text('Arq R$'+Math.round(ea.chArq)+'/h  ·  Dir R$'+Math.round(ea.chDir)+'/h  ·  Ger R$'+Math.round(ea.chGer)+'/h',ML+50,ry,{align:'center'});
    doc.text('Pág. '+i+' / '+totalPages,W-MR-2,ry,{align:'right'});
  }

  // Download
  const filename='Estimativa_ARQ_'+(cod!=='—'?cod:nome.replace(/\s+/g,'_'))+'.pdf';
  doc.save(filename);
  }catch(err){alert('Erro ao gerar PDF: '+err.message);console.error(err);}
};


// ═══════════════════════════════════════════════════════════
// MODAL VISÃO UNIFICADA DA OBRA
// ═══════════════════════════════════════════════════════════
let _ouPhId = null;

function abrirObraUnificada(phId) {
  _ouPhId = phId;
  const fase = gSt.obraFases.find(f => f.id == phId);
  if (!fase) return;
  const nomeFase = gSt.obraFases.length > 1
    ? (fase.nome?.trim() || ('Fase ' + phId))
    : 'Obra Total';
  document.getElementById('ou-titulo').textContent = nomeFase;
  ouRender();
  document.getElementById('modal-ou-overlay').style.display = 'flex';
}

function fecharObraUnificada() {
  document.getElementById('modal-ou-overlay').style.display = 'none';
  _ouPhId = null;
  gRender();
  if (typeof renderEfetivo === 'function') renderEfetivo();
  if (typeof renderHistograma === 'function') renderHistograma();
}

function ouGetFase() {
  return gSt.obraFases.find(f => f.id == _ouPhId);
}

function ouImprimir() {
  const fase = ouGetFase();
  if (!fase) return;
  const discs = (fase.disciplinas || []).filter(d => d.ativo !== false);
  const cod = ESTADO.meta?.codigo || '';
  const nomeProj = ESTADO.meta?.nome || 'Planejamento de Obra';
  const nomeFase = fase.nome || 'Obra';
  const gi = ESTADO.meta?.gi || '';
  const gp = ESTADO.meta?.gp || '';
  const hoje = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'long', year:'numeric'});

  // Totais de efetivo por módulo
  const totEft = Array(9).fill(0);
  discs.forEach(disc => {
    (disc.tasks || []).forEach(t => {
      for (let m = 1; m <= 8; m++) totEft[m] += (t.prof || 0) * ((t.m[m] || 0) / 100);
    });
  });

  // Linhas da tabela
  let rows = '';
  discs.forEach((disc, di) => {
    const discColor = ['#8B4513','#A0522D','#6B3410','#C07820','#8B6914','#5A3A00','#7A4010','#4A2800'][di % 8];
    rows += '<tr style="background:#F4F6F8;">'
      + '<td colspan="11" style="padding:5px 8px;font-family:Oswald,sans-serif;font-size:11px;font-weight:700;color:'+discColor+';border:0.5px solid #D8DCE4;border-left:3px solid '+discColor+';">'+disc.label+'</td>'
      + '</tr>';
    (disc.tasks || []).forEach(task => {
      const totalTask = Array.from({length:8},(_,i)=>i+1).reduce((s,m)=>s+(task.prof||0)*((task.m[m]||0)/100),0);
      const modCells = Array.from({length:8},(_,i)=>i+1).map(m => {
        const pct = task.m[m] || 0;
        const prof = task.prof || 0;
        if (pct === 0) {
          return '<td style="padding:3px;text-align:center;font-size:9px;border:0.5px solid #D8DCE4;color:#DDD;">—</td>';
        }
        const bg = 'background:rgba(139,69,19,'+(pct/100*0.12+0.04)+');';
        const content = prof > 0
          ? '<span style="font-size:9px;font-weight:700;color:#3A2000;">'+prof+'</span>'
            + '<span style="display:inline-block;width:1.5px;height:12px;background:#8B5010;margin:0 3px;vertical-align:middle;"></span>'
            + '<span style="font-size:8px;color:#6B3000;">'+pct+'%</span>'
          : '<span style="font-size:8px;color:#6B3000;">'+pct+'%</span>';
        return '<td style="padding:3px 4px;text-align:center;font-size:9px;border:0.5px solid #D8DCE4;'+bg+'white-space:nowrap;">'+content+'</td>';
      }).join('');
      rows += '<tr>'
        + '<td style="padding:4px 8px 4px 16px;font-size:10px;border:0.5px solid #D8DCE4;color:#3A4A5A;">'+task.n+'</td>'
        + '<td style="padding:4px 3px;text-align:center;font-size:9px;border:0.5px solid #D8DCE4;color:#6A7585;">'+(task.prep?'Prep.':'Exec.')+'</td>'
        + '<td style="padding:4px 3px;text-align:center;font-size:10px;font-weight:700;border:0.5px solid #D8DCE4;">'+(task.prof||'')+'</td>'
        + modCells
        + '<td style="padding:4px 3px;text-align:center;font-size:10px;font-weight:700;border:0.5px solid #D8DCE4;color:#1A5294;">'+(totalTask>0?Math.round(totalTask*10)/10:'')+'</td>'
        + '</tr>';
    });
  });

  // Linha de totais
  const modTotCells = Array.from({length:8},(_,i)=>i+1).map(m =>
    '<td style="padding:5px 3px;text-align:center;font-size:10px;font-weight:700;border:0.5px solid #D8DCE4;background:#1A2535;color:#00DEDB;">'+(totEft[m]>0?Math.round(totEft[m]*10)/10:'')+'</td>'
  ).join('');
  rows += '<tr style="background:#1A2535;">'
    + '<td colspan="2" style="padding:5px 8px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#9AA0AF;border:0.5px solid #2A3545;">TOTAL EFETIVO / MÓDULO</td>'
    + '<td style="padding:5px 3px;border:0.5px solid #2A3545;"></td>'
    + modTotCells
    + '<td style="padding:5px 3px;border:0.5px solid #2A3545;"></td>'
    + '</tr>';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Visão Unificada — ${nomeProj}</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Barlow:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Barlow',sans-serif;color:#1A2535;background:#fff;font-size:10px;}
  @page{size:A4 portrait;margin:10mm 12mm;}
  @media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  table{border-collapse:collapse;width:100%;}
</style>
</head><body>

<!-- CABEÇALHO -->
<div style="display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:8px;border-bottom:2.5px solid #00DEDB;margin-bottom:12px;">
  <div>
    <div style="font-family:Oswald,sans-serif;font-size:8px;font-weight:400;letter-spacing:.2em;text-transform:uppercase;color:#9AA0AF;margin-bottom:3px;">Athié Wohnrath · Planejamento de Obra</div>
    <div style="font-family:Oswald,sans-serif;font-size:22px;font-weight:700;text-transform:uppercase;color:#1A2535;line-height:1;">Visão Unificada <span style="color:#00DEDB;">${nomeFase}</span></div>
    <div style="font-size:10px;color:#5A6275;margin-top:3px;">${cod?cod+' · ':''}${nomeProj}</div>
  </div>
  <div style="text-align:right;font-size:9px;color:#9AA0AF;line-height:2;">
    ${gi?`<div><strong style="color:#1A2535;">GI:</strong> ${gi}</div>`:''}
    ${gp?`<div><strong style="color:#1A2535;">GP:</strong> ${gp}</div>`:''}
    <div><strong style="color:#1A2535;">Emitido em:</strong> ${hoje}</div>
  </div>
</div>

<!-- TABELA -->
<table>
  <thead>
    <tr style="background:#1A2535;">
      <th style="padding:6px 8px;text-align:left;font-family:Oswald,sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9AA0AF;border:0.5px solid #2A3545;min-width:130px;">Disciplina / Tarefa</th>
      <th style="padding:6px 4px;text-align:center;font-family:Oswald,sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9AA0AF;border:0.5px solid #2A3545;width:44px;">Tipo</th>
      <th style="padding:6px 4px;text-align:center;font-family:Oswald,sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9AA0AF;border:0.5px solid #2A3545;width:38px;">Efet.</th>
      ${Array.from({length:8},(_,i)=>'<th style="padding:6px 4px;text-align:center;font-family:Oswald,sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9AA0AF;border:0.5px solid #2A3545;width:34px;">M'+(i+1)+'</th>').join('')}
      <th style="padding:6px 4px;text-align:center;font-family:Oswald,sans-serif;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9AA0AF;border:0.5px solid #2A3545;width:38px;">Total</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<!-- RODAPÉ -->
<div style="margin-top:10px;padding-top:8px;border-top:0.5px solid #E8ECF0;display:flex;justify-content:space-between;font-size:8px;color:#9AA0AF;">
  <div>Athié Wohnrath · Visão Unificada · ${hoje}</div>
  <div>${cod||nomeProj} · Documento gerado automaticamente</div>
</div>

<!-- BOTÕES -->
<div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:10px;">
  <button onclick="window.close()" style="height:36px;padding:0 16px;background:#F4F6F8;border:1px solid #D8DCE4;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#5A6275;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;">Fechar</button>
  <button onclick="window.print()" style="height:36px;padding:0 20px;background:#00DEDB;border:none;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#0D1117;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;">🖨 Imprimir / PDF</button>
</div>

</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
window.ouImprimir = ouImprimir;


function ouRender() {
  const fase = ouGetFase();
  if (!fase) return;
  const discs = fase.disciplinas || [];
  const PERC_OPTS = [0, 25, 50, 75, 100];
  const SEL_STYLE = 'width:100%;border:none;background:transparent;font-family:inherit;font-size:10px;text-align:center;cursor:pointer;outline:none;';
  const TD = (content, extra='') => `<td style="padding:5px 6px;border:1px solid var(--border);${extra}">${content}</td>`;

  // Linha de totais de efetivo por módulo
  const totEft = Array(9).fill(0); // índices 1..8
  discs.forEach(disc => {
    (disc.tasks || []).forEach(t => {
      for (let m = 1; m <= 8; m++) {
        totEft[m] += (t.prof || 0) * ((t.m[m] || 0) / 100);
      }
    });
  });

  let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;">';

  // Cabeçalho
  html += '<thead><tr style="background:var(--bg-surface2);position:sticky;top:0;z-index:10;">';
  html += TD('<b>Disciplina / Tarefa</b>', 'min-width:160px;text-align:left;font-weight:700;');
  html += TD('<b>Tipo</b>', 'width:90px;text-align:center;font-weight:700;');
  html += TD('<b>Efetivo</b>', 'width:60px;text-align:center;font-weight:700;');
  for (let m = 1; m <= 8; m++) html += TD(`<b>M${m}</b>`, 'width:54px;text-align:center;font-weight:700;');
  html += TD('<b>Total</b>', 'width:50px;text-align:center;font-weight:700;');
  html += TD('<b>Ações</b>', 'width:44px;text-align:center;font-weight:700;');
  html += '</tr></thead><tbody>';

  discs.forEach((disc, di) => {
    const pal = getDiscPal(di);
    const cor = pal[1];
    const corBg = pal[0] + '22';
    const isExp = disc._ouExpanded !== false;

    // Linha cabeçalho da disciplina
    html += `<tr style="cursor:pointer;background:${cor};" onclick="ouToggleDisc(${di})">`;
    html += `<td colspan="12" style="padding:8px 10px;border:1px solid var(--border);font-family:var(--font);font-size:12px;font-weight:700;color:#fff;">`;
    html += `<span style="margin-right:8px;">${isExp ? '▼' : '▶'}</span>${disc.label}`;
    html += `<button onclick="event.stopPropagation();ouAdicionarTarefa(${di})" style="float:right;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;cursor:pointer;margin-left:6px;">+ Tarefa</button>`;
    html += `<button onclick="event.stopPropagation();ouRemoverDisc(${di})" style="float:right;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;cursor:pointer;">🗑</button>`;
    html += `</td></tr>`;

    if (!isExp) return;

    (disc.tasks || []).forEach((task, ti) => {
      const total = Object.values(task.m).reduce((s, v) => s + (v || 0), 0);
      const incompleto = total > 0 && total !== 100;
      const rowBg = incompleto ? 'rgba(255,200,0,.10)' : (di % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)');

      html += `<tr style="background:${rowBg};">`;

      // Nome
      html += `<td style="padding:4px 4px 4px 20px;border:1px solid var(--border);">`;
      html += `<input type="text" value="${task.n.replace(/"/g,'\"')}" onchange="ouSetNome(${di},${ti},this.value)" style="width:100%;border:none;background:transparent;font-size:11px;font-family:var(--body);">`;
      html += `</td>`;

      // Tipo
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<select onchange="ouSetTipo(${di},${ti},this.value)" style="${SEL_STYLE}">`;
      html += `<option value="SERVIÇO" ${!task.prep?'selected':''}>SERVIÇO</option>`;
      html += `<option value="PREPARAÇÃO" ${task.prep?'selected':''}>PREP</option>`;
      html += `</select></td>`;

      // Efetivo
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<input type="number" min="0" max="99" value="${task.prof||0}" onchange="ouSetProf(${di},${ti},this.value)" style="width:44px;border:1px solid var(--border);border-radius:3px;text-align:center;font-size:11px;padding:2px 0;">`;
      html += `</td>`;

      // M1-M8
      for (let m = 1; m <= 8; m++) {
        const perc = task.m[m] || 0;
        const mbg = perc > 0 ? `background:${corBg};` : '';
        html += `<td style="padding:2px;border:1px solid var(--border);text-align:center;${mbg}">`;
        html += `<select onchange="ouSetPerc(${di},${ti},${m},this.value)" style="${SEL_STYLE}${perc>0?'color:'+cor+';font-weight:700;':''}">`;
        PERC_OPTS.forEach(p => { html += `<option value="${p}" ${perc===p?'selected':''}>${p===0?'—':p+'%'}</option>`; });
        html += `</select></td>`;
      }

      // Total
      const totCor = incompleto ? '#B85000' : total===100 ? '#006A20' : '#8A95A8';
      const totBg = incompleto ? 'rgba(255,160,0,.15)' : total===100 ? 'rgba(0,180,80,.08)' : '';
      html += `<td style="padding:4px;border:1px solid var(--border);text-align:center;background:${totBg};color:${totCor};font-weight:700;">${total}%${incompleto?' ⚠':''}</td>`;

      // Remover tarefa
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<button onclick="ouRemoverTarefa(${di},${ti})" style="background:none;border:1px solid #E08080;color:#C04040;border-radius:3px;padding:2px 5px;font-size:11px;cursor:pointer;">✕</button>`;
      html += `</td></tr>`;
    });
  });

  // Linha totais de efetivo
  html += `<tr style="background:var(--bg-surface2);border-top:2px solid var(--border-md);">`;
  html += TD('<b>Efetivo total / módulo</b>', 'text-align:left;font-weight:700;color:var(--txt-muted);');
  html += TD('', ''); html += TD('', '');
  for (let m = 1; m <= 8; m++) {
    const v = totEft[m];
    html += TD(`<b>${v > 0 ? v.toFixed(1).replace(/\.0$/,'') : '—'}</b>`, `text-align:center;color:${v>0?COR.OBRA_MOM:'var(--txt-dim)'};`);
  }
  html += TD('', ''); html += TD('', '');
  html += '</tr>';

  // Linha adicionar nova disciplina
  html += `<tr><td colspan="12" style="padding:10px;text-align:center;border:1px solid var(--border);background:var(--bg-surface);">`;
  html += `<button onclick="ouAdicionarDisc()" style="background:var(--accent);color:#fff;border:none;padding:6px 16px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600;">+ Nova Disciplina</button>`;
  html += `</td></tr>`;

  html += '</tbody></table>';
  document.getElementById('ou-content').innerHTML = html;

  // Alertas
  const nAlertas = discs.reduce((s, d) => s + (d.tasks||[]).filter(t => {
    const tot = Object.values(t.m).reduce((a,b)=>a+(b||0),0);
    return tot > 0 && tot !== 100;
  }).length, 0);
  const badge = document.getElementById('ou-badge-alerta');
  if (badge) { badge.textContent = nAlertas > 0 ? `⚠ ${nAlertas} alerta${nAlertas>1?'s':''}` : ''; badge.style.display = nAlertas > 0 ? '' : 'none'; }
}

function ouToggleDisc(di) {
  const fase = ouGetFase(); if (!fase) return;
  const disc = fase.disciplinas[di]; if (!disc) return;
  disc._ouExpanded = disc._ouExpanded === false ? true : false;
  ouRender();
}

function ouSetNome(di, ti, val) {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas[di].tasks[ti].n = val;
}

function ouSetTipo(di, ti, val) {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas[di].tasks[ti].prep = (val === 'PREPARAÇÃO');
}

function ouSetProf(di, ti, val) {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas[di].tasks[ti].prof = Math.max(0, parseInt(val) || 0);
  ouRender();
}

function ouSetPerc(di, ti, m, val) {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas[di].tasks[ti].m[m] = parseInt(val) || 0;
  ouRender();
}

function ouAdicionarTarefa(di) {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas[di].tasks.push({ n: 'Nova Atividade', prep: false, prof: 1, m: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0} });
  ouRender();
}

function ouRemoverTarefa(di, ti) {
  const fase = ouGetFase(); if (!fase) return;
  const disc = fase.disciplinas[di];
  if (disc.tasks.length <= 1) { showToast('A disciplina precisa ter ao menos 1 tarefa'); return; }
  disc.tasks.splice(ti, 1);
  ouRender();
}

function ouAdicionarDisc() {
  const fase = ouGetFase(); if (!fase) return;
  fase.disciplinas.push({
    id: 'custom_' + Date.now(),
    label: 'Nova Disciplina',
    ativo: true, start: 1, end: 8,
    _ouExpanded: true,
    tasks: [{ n: 'Atividade Principal', prep: false, prof: 1, m: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0} }]
  });
  ouRender();
}

function ouRemoverDisc(di) {
  const fase = ouGetFase(); if (!fase) return;
  if (!confirm('Remover a disciplina "' + (fase.disciplinas[di]?.label || '') + '" e todas as suas tarefas?')) return;
  fase.disciplinas.splice(di, 1);
  ouRender();
}


// ═══════════════════════════════════════════════════════════
// TEMPLATES DE TIPO DE OBRA
// ═══════════════════════════════════════════════════════════
const OBRA_TEMPLATES = [
  {
    id: 'escritorio-padrao',
    label: '🏢 Escritório Padrão',
    desc: 'Escritório corporativo completo — 8 módulos, 14 disciplinas padrão A|W',
    disciplinas: null // null = usa DISC_DEFS padrão (preenchido em runtime)
  },
  {
    id: 'areas-molhadas',
    label: '🚿 Áreas Molhadas',
    desc: 'Banheiros, vestiários e áreas úmidas — civil e hidráulico intensos, sem forro modular',
    disciplinas: [
      {id:'eletrica',label:'Elétrica',ativo:true,start:1,end:7,tasks:[
        {n:'Quadro elétrico / disjuntores',prep:false,prof:3,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},
        {n:'Cabeamento iluminação áreas molhadas',prep:false,prof:2,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},
        {n:'Pontos de tomada e infraestrutura',prep:false,prof:2,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},
        {n:'Luminária e conectorização',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:50,6:50,7:0,8:0}}
      ]},
      {id:'ac',label:'Ar Condicionado',ativo:true,start:2,end:5,tasks:[
        {n:'Exaustão mecânica / ventilação',prep:false,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},
        {n:'Equipamentos e dutos',prep:false,prof:3,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},
        {n:'Startup e testes',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:100,6:0,7:0,8:0}}
      ]},
      {id:'gesso',label:'Gesso / Drywall',ativo:true,start:1,end:4,tasks:[
        {n:'Paredes divisórias (drywall RU)',prep:false,prof:5,m:{1:50,2:50,3:0,4:0,5:0,6:0,7:0,8:0}},
        {n:'Forro gesso (áreas secas)',prep:false,prof:3,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},
        {n:'Masseamento e acabamento',prep:false,prof:2,m:{1:0,2:0,3:0,4:100,5:0,6:0,7:0,8:0}}
      ]},
      {id:'civil',label:'Civil / Hidráulico',ativo:true,start:1,end:6,tasks:[
        {n:'Demolições e quebras',prep:false,prof:6,m:{1:100,2:0,3:0,4:0,5:0,6:0,7:0,8:0}},
        {n:'Impermeabilização (piso e paredes)',prep:false,prof:4,m:{1:0,2:100,3:0,4:0,5:0,6:0,7:0,8:0}},
        {n:'Rede hidráulica fria e quente',prep:false,prof:4,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},
        {n:'Esgoto e ventilação sanitária',prep:false,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},
        {n:'Testes de estanqueidade',prep:false,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},
        {n:'Revestimento cerâmico piso',prep:false,prof:4,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},
        {n:'Revestimento cerâmico parede',prep:false,prof:4,m:{1:0,2:0,3:0,4:25,5:50,6:25,7:0,8:0}}
      ]},
      {id:'spk',label:'SPK / Hidrante',ativo:true,start:1,end:5,tasks:[
        {n:'Ramais e chuveiros automáticos',prep:false,prof:3,m:{1:0,2:50,3:50,4:0,5:0,6:0,7:0,8:0}},
        {n:'Testes e pressurização',prep:false,prof:2,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}}
      ]},
      {id:'sdai',label:'SDAI / Detecção',ativo:true,start:2,end:6,tasks:[
        {n:'Cabeamento e detectores',prep:false,prof:2,m:{1:0,2:0,3:100,4:0,5:0,6:0,7:0,8:0}},
        {n:'Endereçamento e testes',prep:false,prof:1,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}}
      ]},
      {id:'dados',label:'Dados / TI',ativo:true,start:3,end:5,tasks:[
        {n:'Pontos de dados',prep:false,prof:1,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}}
      ]},
      {id:'pintura',label:'Pintura',ativo:true,start:4,end:7,tasks:[
        {n:'Pintura áreas secas (teto/paredes ext.)',prep:false,prof:3,m:{1:0,2:0,3:0,4:50,5:50,6:0,7:0,8:0}},
        {n:'Retoques e acabamentos',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}
      ]},
      {id:'forro',label:'Forro Modular',ativo:false,start:1,end:1,tasks:[
        {n:'N/A — não aplicável para áreas molhadas',prep:false,prof:0,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0}}
      ]},
      {id:'piso',label:'Piso / Carpete',ativo:false,start:1,end:1,tasks:[
        {n:'N/A — substituído por cerâmica (Civil)',prep:false,prof:0,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0}}
      ]},
      {id:'marcenaria',label:'Marcenaria',ativo:true,start:5,end:7,tasks:[
        {n:'Follow e aprovação',prep:true,prof:1,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},
        {n:'Bancadas e móveis molhados',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}
      ]},
      {id:'vidros',label:'Vidros / DPT',ativo:true,start:5,end:7,tasks:[
        {n:'Vidros e divisórias box',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}}
      ]},
      {id:'mobiliario',label:'Mobiliário / Louças',ativo:true,start:6,end:8,tasks:[
        {n:'Agendamento e entrega louças',prep:true,prof:1,m:{1:0,2:0,3:50,4:50,5:0,6:0,7:0,8:0}},
        {n:'Instalação louças e metais',prep:false,prof:3,m:{1:0,2:0,3:0,4:0,5:0,6:50,7:50,8:0}},
        {n:'Acessórios e acabamentos',prep:false,prof:2,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:100}}
      ]},
      {id:'multimidia',label:'Multimídia',ativo:false,start:1,end:1,tasks:[
        {n:'N/A — não aplicável',prep:false,prof:0,m:{1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0}}
      ]}
    ]
  }
];

function obraTemplateGetDiscs(templateId) {
  const tpl = OBRA_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return null;
  if (tpl.disciplinas !== null) {
    return tpl.disciplinas.map(d => ({
      ...d,
      tasks: d.tasks.map(t => ({...t, m: {...t.m}}))
    }));
  }
  // escritorio-padrao: usa DISC_DEFS
  return DISC_DEFS.map(def => ({
    id: def.id, label: def.label, ativo: true,
    start: def.start ?? 1, end: def.end ?? 8,
    tasks: (def.tasks || []).map(t => ({n:t.n, prep:t.prep, prof:t.prof||0, m:{...t.m}}))
  }));
}

function aplicarTemplate(faseIdx, templateId) {
  const fase = gSt.obraFases[faseIdx];
  if (!fase) return;
  const tpl = OBRA_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return;
  const novas = obraTemplateGetDiscs(templateId);
  if (!novas) return;
  fase.disciplinas = novas;
  // Salvar escolha no ESTADO para persistir
  if (!ESTADO.cfg.obraFases[faseIdx]) ESTADO.cfg.obraFases[faseIdx] = {};
  ESTADO.cfg.obraFases[faseIdx].templateId = templateId;
  ativSincronizarG();
  gRender();
  if (typeof renderEfetivo === 'function' && abaAtiva === 'efetivo') renderEfetivo();
  if (typeof renderHistograma === 'function' && abaAtiva === 'histograma') renderHistograma();
  showToast(`Template "${tpl.label}" aplicado à Fase ${faseIdx + 1}`);
}


// ═══════════════════════════════════════════════════════════
// GERENCIAR TEMPLATES — editor unificado v3
// ═══════════════════════════════════════════════════════════

function _tplCarregarCustom() {
  try { const r = localStorage.getItem('aw_obra_templates'); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function _tplSalvarCustom(arr) {
  try { localStorage.setItem('aw_obra_templates', JSON.stringify(arr)); } catch {}
}
function tplGetTodos() {
  const custom = _tplCarregarCustom();
  const customIds = new Set(custom.map(t => t.id));
  // Templates padrão que não foram editados + todos os customizados (incluindo padrões editados)
  const padrao = OBRA_TEMPLATES.filter(t => !customIds.has(t.id));
  return [...padrao, ...custom];
}

// ── Estado do editor ──────────────────────────────────────
let _tplEditorId = null;
let _tplEditorData = null; // { disciplinas: [...] } — espelha estrutura de fase.disciplinas

// ── Abrir gerenciador (lista) ─────────────────────────────

// ── Tipografia Gantt ──
// ── Tipografia do Gantt por nível ──────────────────────────

var _ganttTypoDefaults = {
  T1: { fs: 13, fw: 700, ff: 'Oswald, sans-serif' },
  T2: { fs: 12, fw: 700, ff: 'Oswald, sans-serif' },
  N1: { fs: 11, fw: 700, ff: 'Oswald, sans-serif' },
  N2: { fs: 11, fw: 700, ff: 'Oswald, sans-serif' }
};

function gGetTypo(level) {
  var cfg = ESTADO && ESTADO.cfg && ESTADO.cfg.ganttTypo;
  var def = _ganttTypoDefaults[level];
  if (!cfg || !cfg[level]) return Object.assign({}, def);
  return {
    fs: cfg[level].fs || def.fs,
    fw: cfg[level].fw || def.fw,
    ff: cfg[level].ff || def.ff
  };
}
window.gGetTypo = gGetTypo;

function gSetTypo(level, prop, val) {
  if (!ESTADO.cfg) ESTADO.cfg = {};
  if (!ESTADO.cfg.ganttTypo) ESTADO.cfg.ganttTypo = {};
  if (!ESTADO.cfg.ganttTypo[level]) ESTADO.cfg.ganttTypo[level] = {};
  ESTADO.cfg.ganttTypo[level][prop] = val;
  gAplicarTypo();
  onCfgChange();
  salvarDados();
}
window.gSetTypo = gSetTypo;

function gAplicarTypo() {
  var styleId = 'gantt-typo-css';
  var el = document.getElementById(styleId) || document.createElement('style');
  el.id = styleId;
  var rules = [];
  ['T1','T2','N1','N2'].forEach(function(lv) {
    var t = gGetTypo(lv);
    var cls = lv.toLowerCase();
    rules.push(
      '#g-lbl-col .g' + cls + ', #g-tl-inner .g' + cls + ' {' +
      'font-size:' + t.fs + 'px !important;' +
      'font-weight:' + t.fw + ' !important;' +
      'font-family:' + t.ff + ' !important;' +
      '}'
    );
  });
  el.textContent = rules.join('\n');
  if (!el.parentNode) document.head.appendChild(el);
  // Atualizar displays no configurador se abertos
  ['T1','T2','N1','N2'].forEach(function(lv) {
    var t = gGetTypo(lv);
    var cls = lv.toLowerCase();
    var elFs = document.getElementById('gt-' + cls + '-fs');
    if (elFs) elFs.textContent = t.fs;
    var elFw = document.getElementById('gt-' + cls + '-fw');
    if (elFw) elFw.value = t.fw;
    var elFf = document.getElementById('gt-' + cls + '-ff');
    if (elFf) elFf.value = t.ff;
  });
}
window.gAplicarTypo = gAplicarTypo;

// ── Resize Coluna ──
function gInitColResize() {
  var handle = document.getElementById('g-col-resize-handle');
  if (!handle) return;
  var startX, startW;
  handle.addEventListener('mousedown', function(e) {
    e.preventDefault(); startX = e.clientX; startW = G.LBL_W;
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    function onMove(e) { var newW = Math.max(120,Math.min(320,startW+e.clientX-startX)); if(!ESTADO.cfg)ESTADO.cfg={}; ESTADO.cfg.lblW=newW; gRender(); }
    function onUp() { document.body.style.cursor=''; document.body.style.userSelect=''; document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); salvarDados(); }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });
}
window.gInitColResize = gInitColResize;

// ── Modais Pré-Obra ──
// ── v5.07: Modal de edição da Pré-Obra por cronograma ─────

function abrirModalPreObra(faseIdx) {
  document.getElementById('modal-po-overlay')?.remove();
  if (!ESTADO.preObraCustom) ESTADO.preObraCustom = {};
  if (!ESTADO.preObraCustom[faseIdx]) {
    var poCfg = (ESTADO.cfg.obraFases[faseIdx]||{}).preObra || {templateId:'pre-obra-padrao',du:5};
    var tplBase = typeof _preObraGetTemplate==='function' ? _preObraGetTemplate(poCfg.templateId) : null;
    ESTADO.preObraCustom[faseIdx] = {
      du: poCfg.du||5,
      disciplinas: tplBase ? JSON.parse(JSON.stringify(tplBase.disciplinas)) : []
    };
  }
  var ov = document.createElement('div');
  ov.id = 'modal-po-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.addEventListener('click', function(e){ if(e.target===ov) fecharModalPreObra(); });
  document.body.appendChild(ov);
  _poRenderModal(faseIdx);
}
window.abrirModalPreObra = abrirModalPreObra;

function fecharModalPreObra() {
  document.getElementById('modal-po-overlay')?.remove();
}
window.fecharModalPreObra = fecharModalPreObra;

function _poRenderModal(faseIdx) {
  var ov = document.getElementById('modal-po-overlay');
  if (!ov) return;
  var custom = ESTADO.preObraCustom[faseIdx];
  var discs = custom.disciplinas || [];
  var DISC_COLORS = ['#C07820','#A86018','#E8A840','#B86C10','#CC8820','#F0B850','#986010','#D87828'];

  var discsHtml = discs.map(function(disc, di) {
    var ativo = disc.ativo !== false;
    var dc = DISC_COLORS[di % DISC_COLORS.length];

    var tableHdr = '<div style="display:grid;grid-template-columns:1fr 90px 70px 28px;gap:4px;padding:4px 10px 4px 36px;background:rgba(0,0,0,.04);border-bottom:1px solid rgba(0,0,0,.06);">'
      + '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A7060;">Tarefa</span>'
      + '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A7060;text-align:center;">Tipo</span>'
      + '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A7060;text-align:center;">Efetivo</span>'
      + '<span></span></div>';

    var tasksHtml = tableHdr + (disc.tasks||[]).map(function(task, ti) {
      var isPrep = task.prep === true;
      return '<div style="display:grid;grid-template-columns:1fr 90px 70px 28px;gap:4px;padding:5px 10px 5px 36px;border-bottom:1px solid rgba(0,0,0,.04);align-items:center;">'
        + '<input type="text" value="'+task.n.replace(/"/g,'&quot;')+'" '
        + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].tasks['+ti+'].n=this.value;onCfgChange();" '
        + 'style="height:26px;padding:0 7px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;width:100%;">'
        + '<select data-fi="'+faseIdx+'" data-di="'+di+'" data-ti="'+ti+'" onchange="_poSetPrep(this)" '
        + 'style="height:26px;padding:0 4px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:10px;font-family:var(--font);font-weight:700;width:100%;">'
        + '<option value="SERVIÇO" '+(isPrep?'':'selected')+'>SERVIÇO</option>'
        + '<option value="PREP" '+(isPrep?'selected':'')+'>PREP</option>'
        + '</select>'
        + '<input type="number" min="1" max="50" value="'+(task.prof||2)+'" '
        + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].tasks['+ti+'].prof=parseInt(this.value)||1;onCfgChange();gRender();" '
        + 'style="height:26px;padding:0 4px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;text-align:center;width:100%;">'
        + '<button onclick="_poRemoverTarefa('+faseIdx+','+di+','+ti+')" '
        + 'style="width:24px;height:24px;background:none;border:none;cursor:pointer;font-size:13px;color:var(--txt-dim);">✕</button>'
        + '</div>';
    }).join('');

    return '<div data-po-disc="'+di+'" draggable="true" style="border-radius:8px;margin-bottom:10px;overflow:hidden;border:1px solid rgba(0,0,0,.08);">'
      + '<div style="display:flex;align-items:center;gap:8px;padding:0 10px;background:'+dc+';height:36px;" data-po-disc-hdr="'+di+'">'
      + '<span style="opacity:.5;font-size:13px;flex-shrink:0;cursor:grab;">⠿</span>'
      + '<input type="text" value="'+disc.label.replace(/"/g,'&quot;')+'" '
      + 'onclick="event.stopPropagation();" '
      + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].label=this.value;onCfgChange();" '
      + 'style="flex:1;height:26px;padding:0 8px;border:none;border-radius:4px;background:rgba(255,255,255,.18);color:#fff;font-size:12px;font-weight:700;font-family:var(--font);">'
      + '<label style="display:flex;align-items:center;gap:4px;font-size:10px;color:rgba(255,255,255,.85);cursor:pointer;flex-shrink:0;" onclick="event.stopPropagation();">'
      + '<input type="checkbox" '+(ativo?'checked':'')+' '
      + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].ativo=this.checked;onCfgChange();gRender();" '
      + 'style="accent-color:#fff;"> Ativa</label>'
      + '<button onclick="event.stopPropagation();_poRemoverDisc('+faseIdx+','+di+')" '
      + 'style="height:24px;padding:0 8px;background:rgba(180,20,20,.22);border:1px solid rgba(255,255,255,.3);border-radius:4px;font-size:9px;font-weight:700;color:#fff;cursor:pointer;flex-shrink:0;font-family:var(--font);">✕ Disc.</button>'
      + '</div>'
      + '<div style="background:var(--bg-surface);">' + tasksHtml
      + '<div style="padding:6px 10px 6px 36px;"><button onclick="_poAdicionarTarefa('+faseIdx+','+di+')" '
      + 'style="font-size:10px;color:'+dc+';background:none;border:none;cursor:pointer;font-family:var(--font);font-weight:700;">+ Tarefa</button></div>'
      + '</div></div>';
  }).join('');

  ov.innerHTML = '<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.45);width:100%;max-width:820px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--bg-surface2);">'
    + '<div style="width:6px;height:22px;border-radius:2px;background:#C07820;flex-shrink:0;"></div>'
    + '<div style="flex:1;">'
    + '<div style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);">Pré-Obra · Fase '+(faseIdx+1)+'</div>'
    + '<div style="font-size:10px;color:var(--txt-muted);margin-top:1px;">Edição específica deste cronograma — não altera o template</div>'
    + '</div>'
    + '<label style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--txt-muted);flex-shrink:0;">Duração (DU)'
    + '<input type="number" min="1" max="30" value="'+custom.du+'" '
    + 'onchange="ESTADO.preObraCustom['+faseIdx+'].du=parseInt(this.value)||5;ESTADO.cfg.obraFases['+faseIdx+'].preObra.du=parseInt(this.value)||5;onCfgChange();gRender();" '
    + 'style="width:52px;height:28px;padding:0 6px;border:1px solid var(--border);border-radius:5px;background:var(--bg-surface);color:var(--txt);font-family:var(--font);font-size:12px;font-weight:700;text-align:center;"></label>'
    + '<button onclick="fecharModalPreObra()" style="width:30px;height:30px;background:var(--bg-surface);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:14px;color:var(--txt-muted);">✕</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:16px 20px;">' + discsHtml
    + '<button onclick="_poAdicionarDisc('+faseIdx+')" '
    + 'style="width:100%;height:34px;background:var(--bg-surface2);border:1px dashed var(--border);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);cursor:pointer;">+ Adicionar Disciplina</button>'
    + '</div>'
    + '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
    + '<button onclick="_poResetarCustom('+faseIdx+')" style="font-size:10px;color:var(--txt-dim);background:none;border:none;cursor:pointer;font-family:var(--font);">↺ Restaurar template</button>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="fecharModalPreObra()" style="height:32px;padding:0 16px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);cursor:pointer;">Cancelar</button>'
    + '<button onclick="_poSalvar('+faseIdx+')" style="height:32px;padding:0 20px;background:var(--accent);border:none;border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:#0D1117;cursor:pointer;">✓ Salvar</button>'
    + '</div></div></div>';

  _poInitDragDisc(faseIdx);
}
function _poAdicionarDisc(faseIdx) {
  ESTADO.preObraCustom[faseIdx].disciplinas.push({id:'disc-'+Date.now(),label:'Nova Disciplina',ativo:true,tasks:[{n:'Nova tarefa',prof:2}]});
  onCfgChange(); _poRenderModal(faseIdx);
  var _sc=document.querySelector('#modal-po-overlay [style*="overflow-y:auto"]');
  if(_sc) requestAnimationFrame(function(){_sc.scrollTop=_sc.scrollHeight;});
}
window._poAdicionarDisc = _poAdicionarDisc;

function _poRemoverDisc(faseIdx, di) {
  ESTADO.preObraCustom[faseIdx].disciplinas.splice(di,1);
  onCfgChange(); gRender(); _poRenderModal(faseIdx);
}
window._poRemoverDisc = _poRemoverDisc;

function _poAdicionarTarefa(faseIdx, di) {
  ESTADO.preObraCustom[faseIdx].disciplinas[di].tasks.push({n:'Nova tarefa',prof:2});
  onCfgChange(); _poRenderModal(faseIdx);
  // Scroll até a disciplina que recebeu a tarefa
  var _disc=document.querySelector('#modal-po-overlay [data-po-disc="'+di+'"]');
  if(_disc) requestAnimationFrame(function(){_disc.scrollIntoView({behavior:'smooth',block:'end'});});
}
window._poAdicionarTarefa = _poAdicionarTarefa;

function _poRemoverTarefa(faseIdx, di, ti) {
  ESTADO.preObraCustom[faseIdx].disciplinas[di].tasks.splice(ti,1);
  onCfgChange(); gRender(); _poRenderModal(faseIdx);
}
window._poRemoverTarefa = _poRemoverTarefa;

function _poResetarCustom(faseIdx) {
  if (!confirm('Restaurar o template original? As edições desta fase serão perdidas.')) return;
  delete ESTADO.preObraCustom[faseIdx];
  onCfgChange(); gRender(); abrirModalPreObra(faseIdx);
}
window._poResetarCustom = _poResetarCustom;

function _poSalvar(faseIdx) {
  onCfgChange(); salvarDados(); gRender(); fecharModalPreObra();
}
window._poSalvar = _poSalvar;

function _poInitDragDisc(faseIdx) {
  var ov = document.getElementById('modal-po-overlay');
  if (!ov) return;
  var els = ov.querySelectorAll('[data-po-disc]');
  var dragSrc = null;
  els.forEach(function(el) {
    el.addEventListener('dragstart', function(e) { dragSrc=el; e.dataTransfer.effectAllowed='move'; el.style.opacity='.4'; });
    el.addEventListener('dragend', function() { el.style.opacity='1'; });
    el.addEventListener('dragover', function(e) { e.preventDefault(); });
    el.addEventListener('drop', function(e) {
      e.stopPropagation();
      if (dragSrc===el) return;
      var from=parseInt(dragSrc.dataset.poDisc);
      var to=parseInt(el.dataset.poDisc);
      var discs=ESTADO.preObraCustom[faseIdx].disciplinas;
      var moved=discs.splice(from,1)[0];
      discs.splice(to,0,moved);
      onCfgChange(); gRender(); _poRenderModal(faseIdx);
    });
  });
}

// ── Modal de disciplina da Pré-Obra (padrão da obra) ──────

function _poOpenDiscModal(faseIdx, di) {
  var custom = ESTADO.preObraCustom && ESTADO.preObraCustom[faseIdx];
  if (!custom) return;
  var disc = custom.disciplinas[di];
  if (!disc) return;

  var existing = document.getElementById('modal-po-disc');
  if (existing) existing.remove();

  var _discCors = (function(){
    var arr = typeof getDiscPal==='function' ? getDiscPal(di) : ['#C07820','#8B4513'];
    return Array.isArray(arr) ? arr : [arr, arr];
  })();

  var ov = document.createElement('div');
  ov.id = 'modal-po-disc';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px;';
  document.body.appendChild(ov);

  function render() {
    var tasks = disc.tasks || [];
    var rows = tasks.map(function(task, ti) {
      return '<tr style="border-bottom:1px solid #E8E0D0;">'
        + '<td style="width:28px;padding:4px;text-align:center;border-right:1px solid #E8E0D0;cursor:grab;color:#BBA070;">⠿</td>'
        + '<td style="padding:4px 8px;border-right:1px solid #E8E0D0;">'
        + '<input type="text" value="'+task.n.replace(/"/g,'&quot;')+'" '
        + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].tasks['+ti+'].n=this.value;onCfgChange();" '
        + 'style="width:100%;height:28px;padding:0 6px;border:1px solid #E0D8C8;border-radius:4px;font-size:12px;background:#FFFDF8;color:#3A2800;">'
        + '</td>'
        + '<td style="width:70px;padding:4px;text-align:center;border-right:1px solid #E8E0D0;">'
        + '<input type="number" min="1" max="50" value="'+(task.prof||2)+'" '
        + 'onchange="ESTADO.preObraCustom['+faseIdx+'].disciplinas['+di+'].tasks['+ti+'].prof=parseInt(this.value)||1;onCfgChange();gRender();" '
        + 'style="width:52px;height:28px;padding:0 6px;border:1px solid #E0D8C8;border-radius:4px;font-size:13px;text-align:center;background:#FFFDF8;color:#3A2800;">'
        + '</td>'
        + '<td style="width:60px;padding:4px;text-align:center;">'
        + '<button onclick="_poMoverTarefa('+faseIdx+','+di+','+ti+',-1)" '
        + 'style="width:24px;height:24px;background:#F2EDE4;border:1px solid #D8C8A8;border-radius:3px;cursor:pointer;font-size:12px;color:#7A5A30;">↑</button>'
        + '<button onclick="_poMoverTarefa('+faseIdx+','+di+','+ti+',1)" '
        + 'style="width:24px;height:24px;background:#F2EDE4;border:1px solid #D8C8A8;border-radius:3px;cursor:pointer;font-size:12px;color:#7A5A30;">↓</button>'
        + '</td>'
        + '<td style="width:32px;padding:4px;text-align:center;">'
        + '<button onclick="_poRemoverTarefaDisc('+faseIdx+','+di+','+ti+')" '
        + 'style="width:24px;height:24px;background:rgba(180,20,20,.08);border:1px solid rgba(180,20,20,.2);border-radius:3px;cursor:pointer;font-size:12px;color:#B41414;">✕</button>'
        + '</td>'
        + '</tr>';
    }).join('');

    ov.innerHTML = '<div style="background:#FFF8F0;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.3);width:100%;max-width:520px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;">'
      + '<div style="height:5px;background:linear-gradient(to right,'+_discCors[0]+','+_discCors[1]+');border-radius:12px 12px 0 0;flex-shrink:0;"></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px 10px;border-bottom:1px solid #EEE4C8;">'
      + '<div>'
      + '<div style="font-family:var(--font,sans-serif);font-size:15px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#3A2800;">'+disc.label+'</div>'
      + '<div style="font-size:10px;color:#9A8A6A;margin-top:2px;">'+(tasks.length)+' atividade(s) configurada(s)</div>'
      + '</div>'
      + '<button onclick="document.getElementById(\'modal-po-disc\').remove();_poRenderModal('+faseIdx+');" '
      + 'style="width:28px;height:28px;background:none;border:none;cursor:pointer;font-size:18px;color:#9A8A6A;">✕</button>'
      + '</div>'
      + '<div style="flex:1;overflow-y:auto;">'
      + '<table style="width:100%;border-collapse:collapse;">'
      + '<thead><tr style="background:#F2EDE4;">'
      + '<th style="width:28px;padding:8px 4px;border-right:1px solid #E8E0D0;"></th>'
      + '<th style="text-align:left;padding:8px 12px;font-family:var(--font,sans-serif);font-size:12px;font-weight:700;letter-spacing:.06em;color:#7A5A30;border-right:1px solid #E8E0D0;">Atividade</th>'
      + '<th style="width:70px;padding:8px 4px;font-family:var(--font,sans-serif);font-size:11px;font-weight:700;color:#9A8A6A;border-right:1px solid #E8E0D0;text-align:center;">Efetivo</th>'
      + '<th style="width:60px;padding:8px 4px;font-family:var(--font,sans-serif);font-size:11px;font-weight:700;color:#9A8A6A;border-right:1px solid #E8E0D0;text-align:center;">Ordem</th>'
      + '<th style="width:32px;"></th>'
      + '</tr></thead>'
      + '<tbody>'+rows+'</tbody>'
      + '</table>'
      + '</div>'
      + '<div style="padding:10px 16px;border-top:1px solid #EEE4C8;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">'
      + '<button onclick="_poAdicionarTarefaDisc('+faseIdx+','+di+')" '
      + 'style="height:30px;padding:0 14px;background:#F2EDE4;border:1px solid #D8C8A8;border-radius:5px;font-family:var(--font,sans-serif);font-size:10px;font-weight:700;color:#7A5A30;cursor:pointer;">+ Atividade</button>'
      + '<button id="po-disc-save" onclick="document.getElementById(\'modal-po-disc\').remove();_poRenderModal('+faseIdx+');onCfgChange();gRender();" '
      + 'style="height:30px;padding:0 20px;background:'+_discCors[1]+';border:none;border-radius:5px;font-family:var(--font,sans-serif);font-size:11px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.04em;">Salvar</button>'
      + '</div>'
      + '</div>';

    window._poDiscRender = render;
  }

  render();
}
window._poOpenDiscModal = _poOpenDiscModal;

function _poAdicionarTarefaDisc(faseIdx, di) {
  ESTADO.preObraCustom[faseIdx].disciplinas[di].tasks.push({n:'Nova atividade', prof:2});
  onCfgChange();
  if (window._poDiscRender) window._poDiscRender();
}
window._poAdicionarTarefaDisc = _poAdicionarTarefaDisc;

function _poRemoverTarefaDisc(faseIdx, di, ti) {
  ESTADO.preObraCustom[faseIdx].disciplinas[di].tasks.splice(ti, 1);
  onCfgChange();
  if (window._poDiscRender) window._poDiscRender();
}
window._poRemoverTarefaDisc = _poRemoverTarefaDisc;

function _poMoverTarefa(faseIdx, di, ti, dir) {
  var tasks = ESTADO.preObraCustom[faseIdx].disciplinas[di].tasks;
  var newIdx = ti + dir;
  if (newIdx < 0 || newIdx >= tasks.length) return;
  var moved = tasks.splice(ti, 1)[0];
  tasks.splice(newIdx, 0, moved);
  onCfgChange();
  if (window._poDiscRender) window._poDiscRender();
}
window._poMoverTarefa = _poMoverTarefa;

// ── v5.08: Popup da Pré-Obra (padrão do popup de obra) ────

function _poShowPop(faseIdx, rect) {
  gClosePop();

  var obraFase = gSt.obraFases[faseIdx];
  if (!obraFase) return;

  var poCfg = ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg) return;

  var _custom = ESTADO.preObraCustom && ESTADO.preObraCustom[faseIdx];
  var du = (_custom ? _custom.du : null) || poCfg.du || 5;

  // Calcular datas
  var fim = G.addD(new Date(obraFase.obra.start), -1);
  while (CALENDARIO.isNaoUtil(fim)) fim = G.addD(fim, -1);
  var ini = new Date(fim), cnt = 1;
  while (cnt < du) { ini = G.addD(ini, -1); if (!CALENDARIO.isNaoUtil(ini)) cnt++; }
  while (CALENDARIO.isNaoUtil(ini)) ini = G.addD(ini, 1);

  var cm = darkenHex(COR.OBRA_MOM, .72);

  var html = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1A2535;">'
    + '<span style="width:9px;height:9px;border-radius:2px;background:'+cm+';display:inline-block;flex-shrink:0;"></span>'
    + 'Pré-Obra — Fase '+(faseIdx+1)+'</div>'
    // Início (somente leitura — calculado)
    + '<label style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">'
    + '<span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Início</span>'
    + '<input type="date" value="'+G.fmtISO(ini)+'" disabled style="flex:1;border:1px solid #E8E0D4;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;background:#F8F4EE;color:#A09080;">'
    + '</label>'
    // Fim (somente leitura — travado no início da obra)
    + '<label style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">'
    + '<span style="width:38px;font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;">Fim</span>'
    + '<input type="date" value="'+G.fmtISO(fim)+'" disabled style="flex:1;border:1px solid #E8E0D4;border-radius:4px;padding:5px 8px;font-size:12px;font-family:inherit;background:#F8F4EE;color:#A09080;">'
    + '</label>'
    // Vínculo FI
    + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;padding:6px 8px;background:#F0F8FF;border:1px solid #C0D8F0;border-radius:5px;font-size:10px;color:#2A6090;">'
    + '<span style="font-size:12px;">🔗</span>'
    + '<span><strong>FI com Obra F'+(faseIdx+1)+'</strong> — fim da pré-obra = dia anterior ao início da obra</span>'
    + '</div>'
    // Duração
    + '<div style="border-top:1px solid #EEF0F4;padding-top:12px;">'
    + '<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:8px;">Duração</div>'
    + '<div style="display:flex;align-items:center;gap:0;border:1px solid #C8CDD8;border-radius:6px;overflow:hidden;height:38px;">'
    + '<button onclick="_poPopAdjust('+faseIdx+',-1)" style="width:38px;height:100%;border:none;border-right:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:14px;color:#5A6275;">−</button>'
    + '<div id="po-pop-du" style="flex:1;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#1A2535;gap:6px;">'
    + du+'<span style="font-size:11px;font-weight:400;color:#8A95A8;">dias úteis</span></div>'
    + '<button onclick="_poPopAdjust('+faseIdx+',1)" style="width:38px;height:100%;border:none;border-left:1px solid #C8CDD8;background:#F4F6F8;cursor:pointer;font-size:14px;color:#5A6275;">+</button>'
    + '</div>'
    + '</div>'
    // Botão aplicar
    + '<button onclick="_poPopAplicar('+faseIdx+')" style="width:100%;margin-top:12px;height:36px;background:'+cm+';border:none;border-radius:6px;font-family:var(--font,sans-serif);font-size:11px;font-weight:700;color:#fff;cursor:pointer;letter-spacing:.04em;">Aplicar</button>';

  var o = document.getElementById('g-pop-el');
  if (!o) { o = document.createElement('div'); o.id = 'g-pop-el'; document.body.appendChild(o); }
  o.style.cssText = 'position:fixed;z-index:9200;background:#fff;border-radius:10px;box-shadow:0 4px 32px rgba(0,0,0,.18);padding:16px;width:240px;border:1px solid #E8ECF0;';
  o.innerHTML = html;

  // Posicionar próximo ao clique
  var top = rect ? rect.bottom + 8 : 200;
  var left = rect ? rect.left : 200;
  if (left + 240 > window.innerWidth) left = window.innerWidth - 256;
  o.style.top = top + 'px';
  o.style.left = left + 'px';

  // Fechar ao clicar fora
  setTimeout(function() {
    document.addEventListener('click', function _close(e) {
      if (!o.contains(e.target)) { gClosePop(); document.removeEventListener('click', _close); }
    });
  }, 100);
}
window._poShowPop = _poShowPop;

function _poPopAdjust(faseIdx, delta) {
  var _custom = ESTADO.preObraCustom && ESTADO.preObraCustom[faseIdx];
  var poCfg = ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  var du = (_custom ? _custom.du : null) || (poCfg && poCfg.du) || 5;
  var newDu = Math.max(1, du + delta);
  if (poCfg) poCfg.du = newDu;
  if (_custom) _custom.du = newDu;
  // Atualizar display
  var el = document.getElementById('po-pop-du');
  if (el) el.innerHTML = newDu + '<span style="font-size:11px;font-weight:400;color:#8A95A8;">dias úteis</span>';
  onCfgChange(); gRender();
}
window._poPopAdjust = _poPopAdjust;

function _poPopAplicar(faseIdx) {
  onCfgChange(); salvarDados(); gClosePop();
}
window._poPopAplicar = _poPopAplicar;

// ── Efetivo Pré-Obra ──
// ── Pré-obra integrada no Efetivo ──────────────────────────────────
// Gera dias e disciplinas da pré-obra para prefixar no renderEfetivoBloco

function _poGerarDiasEfetivo(obraFase, du) {
  // Retorna array de day objects no formato gerarDiasModulos, com mod:-1 (PRÉ)
  var fim = new Date(obraFase.obra.start);
  fim.setDate(fim.getDate() - 1);
  // Recuar até dia útil
  while (fim.getDay() === 0 || fim.getDay() === 6) fim.setDate(fim.getDate() - 1);

  var ini = new Date(fim);
  var cnt = 1;
  while (cnt < du) {
    ini.setDate(ini.getDate() - 1);
    if (ini.getDay() !== 0 && ini.getDay() !== 6) cnt++;
  }

  var days = [];
  var cur = new Date(ini);
  var fimTime = fim.getTime();
  while (cur.getTime() <= fimTime) {
    var dow = cur.getDay();
    var isSun = dow === 0, isSat = dow === 6;
    days.push({
      date: new Date(cur),
      dow: dow,
      isSat: isSat,
      isSun: isSun,
      weight: isSun ? 0 : isSat ? 0.5 : 1,
      buffer: false,
      mod: -1  // -1 = PRÉ
    });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
window._poGerarDiasEfetivo = _poGerarDiasEfetivo;

function _poGerarDiscEfetivo(faseIdx) {
  // Retorna array de disciplinas da pré-obra com profByDay simulado
  var poCfg = ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[faseIdx] && ESTADO.cfg.obraFases[faseIdx].preObra;
  if (!poCfg || !poCfg.ativo) return null;

  var obraFase = gSt.obraFases[faseIdx];
  if (!obraFase) return null;

  var _cust = ESTADO.preObraCustom && ESTADO.preObraCustom[faseIdx];
  var du = (_cust ? _cust.du : null) || poCfg.du || 5;

  var discs;
  if (_cust && _cust.disciplinas && _cust.disciplinas.length) {
    discs = _cust.disciplinas.filter(function(d) { return d.ativo !== false; });
  } else {
    var tpl = typeof _preObraGetTemplate === 'function' ? _preObraGetTemplate(poCfg.templateId) : null;
    if (!tpl) return null;
    discs = tpl.disciplinas.filter(function(d) { return d.ativo !== false; });
  }

  var poDays = _poGerarDiasEfetivo(obraFase, du);
  var dkFmt = function(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  };

  // Para cada disciplina, criar profByDay com o mesmo valor em todos os dias
  var profByDay = discs.map(function(disc) {
    var efTotal = (disc.tasks || []).reduce(function(s, t) { return s + (t.prof || 0); }, 0);
    var dayMap = {};
    poDays.forEach(function(day) {
      if (!day.isSun && !day.buffer) {
        var k = dkFmt(day.date);
        dayMap[k] = { total: efTotal, tasks: disc.tasks || [], hasService: true, hasPrep: false, isPre: true };
      }
    });
    return dayMap;
  });

  return { discs: discs, days: poDays, profByDay: profByDay, du: du };
}
window._poGerarDiscEfetivo = _poGerarDiscEfetivo;

// ── Fornecedores Técnicos ──
// ── Disciplinas e Fornecedores Técnicos ─────────────────────────────────────

const DISCIPLINAS_TEC = [
  {id:'09.001', label:'Projeto Técnico de Acessibilidade'},
  {id:'09.006', label:'Projeto Técnico de Automação'},
  {id:'09.007', label:'Projeto Técnico de Cabeamento de Dados e Voz / Telecomunicações'},
  {id:'09.030', label:'Projeto Técnico de Instalação Elétrica / SPDA'},
  {id:'09.031', label:'Projeto Técnico de Instalação Hidrossanitária e Gás'},
  {id:'09.033', label:'Projeto Luminotécnico'},
  {id:'09.039', label:'Projeto Técnico de Rede de Sprinklers e Hidrantes'},
  {id:'09.041', label:'Projeto Técnico de Sistema de Ar Condicionado, Ventilação e Exaustão'},
  {id:'09.042', label:'Projeto Técnico de Sistema de Áudio e Vídeo'},
  {id:'09.043', label:'Projeto Técnico de Sistema de Detecção e Alarme de Incêndio'},
  {id:'09.046', label:'Projeto Técnico de Sistema de Segurança Patrimonial (CFTV, Controle de Acesso, Alarme)'},
  {id:'09.078', label:'Consultoria Técnica para Regularização no Corpo de Bombeiros'},
];

const FORNECEDORES_TEC_PADRAO = [
  {id:'forn_09030_01', disciplinaId:'09.030', nome:'Tecplan Engenharia Elétrica'},
  {id:'forn_09031_01', disciplinaId:'09.031', nome:'HidroTec Projetos'},
  {id:'forn_09039_01', disciplinaId:'09.039', nome:'FireSafe Consultoria'},
  {id:'forn_09041_01', disciplinaId:'09.041', nome:'ClimaPro Sistemas'},
  {id:'forn_09043_01', disciplinaId:'09.043', nome:'Detecta Segurança'},
];

function tecFornInit() {
  // Inicializa fornecedores técnicos no ESTADO com os padrões se ainda não existir
  if (!ESTADO.cfg.tecFornecedores) {
    ESTADO.cfg.tecFornecedores = FORNECEDORES_TEC_PADRAO.map(f => ({...f, rowOverrides: {}}));
  }
}
window.tecFornInit = tecFornInit;

function tecFornGetAll() {
  tecFornInit();
  return ESTADO.cfg.tecFornecedores || [];
}
window.tecFornGetAll = tecFornGetAll;

function tecFornGetDisciLabel(id) {
  var d = DISCIPLINAS_TEC.find(function(d){ return d.id === id; });
  return d ? d.label : id;
}
window.tecFornGetDisciLabel = tecFornGetDisciLabel;

function tecFornAdd(disciplinaId, nome) {
  tecFornInit();
  var id = 'forn_' + disciplinaId.replace('.','') + '_' + Date.now();
  ESTADO.cfg.tecFornecedores.push({id: id, disciplinaId: disciplinaId, nome: nome, rowOverrides: {}});
  onCfgChange(); salvarDados(); gRender(); tecFornRenderModal();
}
window.tecFornAdd = tecFornAdd;

function tecFornRemove(id) {
  tecFornInit();
  ESTADO.cfg.tecFornecedores = ESTADO.cfg.tecFornecedores.filter(function(f){ return f.id !== id; });
  onCfgChange(); salvarDados(); gRender(); tecFornRenderModal();
}
window.tecFornRemove = tecFornRemove;

function tecFornRenderModal() {
  var el = document.getElementById('ou-tec-content');
  if (!el) return;
  var forns = tecFornGetAll();
  
  // Agrupar por disciplina
  var byDisc = {};
  forns.forEach(function(f) {
    if (!byDisc[f.disciplinaId]) byDisc[f.disciplinaId] = [];
    byDisc[f.disciplinaId].push(f);
  });

  var html = '<div style="font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);margin-bottom:14px;">Fornecedores alocados neste projeto</div>';
  
  // Lista de fornecedores por disciplina
  if (forns.length === 0) {
    html += '<div style="padding:20px;text-align:center;color:var(--txt-muted);font-size:12px;">Nenhum fornecedor cadastrado. Adicione abaixo.</div>';
  } else {
    html += '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;">';
    html += '<thead><tr style="background:var(--bg-surface2);">'
      + '<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border);">Cód.</th>'
      + '<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border);">Disciplina</th>'
      + '<th style="padding:8px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border);">Fornecedor</th>'
      + '<th style="padding:8px 10px;border-bottom:2px solid var(--border);width:32px;"></th>'
      + '</tr></thead><tbody>';
    
    forns.forEach(function(f) {
      var disc = DISCIPLINAS_TEC.find(function(d){ return d.id === f.disciplinaId; });
      html += '<tr style="border-bottom:1px solid var(--border);">'
        + '<td style="padding:8px 10px;font-size:10px;font-weight:700;color:var(--txt-muted);white-space:nowrap;">' + f.disciplinaId + '</td>'
        + '<td style="padding:8px 10px;color:var(--txt);">' + (disc ? disc.label : f.disciplinaId) + '</td>'
        + '<td style="padding:8px 10px;font-weight:600;color:var(--txt);">'
        + '<input type="text" value="' + f.nome.replace(/"/g,'&quot;') + '" onchange="tecFornRenomear(\'' + f.id + '\',this.value)" style="width:100%;border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:11px;background:var(--bg-surface2);color:var(--txt);font-family:var(--body);">'
        + '</td>'
        + '<td style="padding:8px 6px;text-align:center;">'
        + '<button onclick="tecFornRemove(\'' + f.id + '\')" style="background:none;border:none;cursor:pointer;color:#E57373;font-size:14px;" title="Remover">✕</button>'
        + '</td></tr>';
    });
    html += '</tbody></table>';
  }

  // Formulário para adicionar novo fornecedor
  html += '<div style="border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg-surface);">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--txt);margin-bottom:10px;">Adicionar fornecedor</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;">';
  
  var discOpts = DISCIPLINAS_TEC.map(function(d){
    return '<option value="' + d.id + '">' + d.id + ' — ' + d.label + '</option>';
  }).join('');
  
  html += '<div><label style="font-size:9px;color:var(--txt-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">Disciplina</label>'
    + '<select id="tec-add-disc" style="width:100%;height:32px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;padding:0 8px;">'
    + discOpts + '</select></div>';
  
  html += '<div><label style="font-size:9px;color:var(--txt-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;">Nome do fornecedor</label>'
    + '<input type="text" id="tec-add-nome" placeholder="Ex: Empresa XYZ Engenharia" style="width:100%;height:32px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;padding:0 8px;box-sizing:border-box;font-family:var(--body);"></div>';
  
  html += '<button onclick="var d=document.getElementById(\'tec-add-disc\').value,n=document.getElementById(\'tec-add-nome\').value.trim();if(n)tecFornAdd(d,n);" '
    + 'style="height:32px;padding:0 16px;background:var(--accent,#00AEDF);color:#fff;border:none;border-radius:4px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;">+ Adicionar</button>';
  
  html += '</div></div>';
  
  el.innerHTML = html;
}
window.tecFornRenderModal = tecFornRenderModal;

function tecFornSetContato(fornId, field, value) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.contato) f.contato = {};
  f.contato[field] = value;
  onCfgChange(); salvarDados();
}
window.tecFornSetContato = tecFornSetContato;

function tecFornRenomear(id, nome) {
  tecFornInit();
  var f = ESTADO.cfg.tecFornecedores.find(function(f){ return f.id === id; });
  if (f) { f.nome = nome; onCfgChange(); salvarDados(); gRender(); }
}
window.tecFornRenomear = tecFornRenomear;

// ── Plano Fino Aba TEC ──
function pfSwitchTab(tab) {
  var btnArq = document.getElementById('pf-btn-arq');
  var btnTec = document.getElementById('pf-btn-tec');
  var body   = document.getElementById('pf-body');
  if (btnArq) { btnArq.style.color = tab==='arq'?'var(--accent)':'rgba(255,255,255,.3)'; btnArq.style.borderBottom = tab==='arq'?'2px solid var(--accent)':'2px solid transparent'; }
  if (btnTec) { btnTec.style.color = tab==='tec'?'var(--accent)':'rgba(255,255,255,.3)'; btnTec.style.borderBottom = tab==='tec'?'2px solid var(--accent)':'2px solid transparent'; }
  if (!body) return;
  if (tab === 'tec') {
    window._pfArqHTML = body.innerHTML;
    window._pfArqOverflow = body.style.overflow;
    body.style.overflow = 'auto';
    body.style.height = '100%';
    body.innerHTML = '';
    pfRenderTec(body);
  } else {
    if (window._pfArqHTML !== undefined) {
      body.innerHTML = window._pfArqHTML;
      body.style.overflow = window._pfArqOverflow || 'hidden';
      body.style.height = '';
      if (typeof _pfIniciarInteracoes === 'function') _pfIniciarInteracoes();
    }
  }
  window._pfTabAtual = tab;
}
window.pfSwitchTab = pfSwitchTab;

function pfRenderTec(el) {
  if (!el) el = document.getElementById('pf-body-tec') || document.getElementById('pf-body');
  if (!el) return;
  tecFornInit();
  var forns = tecFornGetAll();
  var fase = gSt.obraFases[0];
  var tecSubs = fase && fase.rows && fase.rows.tec && fase.rows.tec.subs;

  el.innerHTML = '';

  // Título
  var hdr = document.createElement('div');
  hdr.style.cssText = 'font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);margin-bottom:16px;';
  hdr.textContent = 'Fornecedores de Projetos Técnicos';
  el.appendChild(hdr);

  // Tabela de fornecedores
  var tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;';

  var thead = document.createElement('thead');
  var theadCols = ['Cód.','Disciplina','Fornecedor','Kickoff','EP','AP','EX',''];
  var trHead = document.createElement('tr');
  trHead.style.background = 'var(--bg-surface2)';
  theadCols.forEach(function(col, ci) {
    var th = document.createElement('th');
    th.style.cssText = 'padding:8px 10px;text-align:' + (ci >= 3 && ci <= 6 ? 'center' : 'left') + ';font-size:9px;font-weight:700;text-transform:uppercase;color:var(--txt-muted);border-bottom:2px solid var(--border);';
    th.textContent = col;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  tbl.appendChild(thead);

  var tbody = document.createElement('tbody');
  if (forns.length === 0) {
    var emptyTr = document.createElement('tr');
    var emptyTd = document.createElement('td');
    emptyTd.colSpan = 8;
    emptyTd.style.cssText = 'padding:20px;text-align:center;color:var(--txt-muted);font-size:12px;';
    emptyTd.textContent = 'Nenhum fornecedor cadastrado.';
    emptyTr.appendChild(emptyTd);
    tbody.appendChild(emptyTr);
  } else {
    var tecIds = ['koTec','epTec','apTec','exTec'];
    forns.forEach(function(f) {
      var disc = DISCIPLINAS_TEC.find(function(d){ return d.id === f.disciplinaId; });
      var tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';

      // Cód
      var td0 = document.createElement('td');
      td0.style.cssText = 'padding:8px 10px;font-size:10px;font-weight:700;color:var(--txt-muted);white-space:nowrap;';
      td0.textContent = f.disciplinaId;
      tr.appendChild(td0);

      // Disciplina
      var td1 = document.createElement('td');
      td1.style.cssText = 'padding:8px 10px;color:var(--txt);max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      td1.textContent = disc ? disc.label : f.disciplinaId;
      tr.appendChild(td1);

      // Nome (editável)
      var td2 = document.createElement('td');
      td2.style.cssText = 'padding:8px 10px;';
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = f.nome;
      inp.style.cssText = 'width:160px;border:1px solid var(--border);border-radius:4px;padding:4px 8px;font-size:11px;background:var(--bg-surface2);color:var(--txt);font-family:var(--body);';
      inp.addEventListener('change', (function(fid){ return function(){ tecFornRenomear(fid, this.value); }; })(f.id));
      td2.appendChild(inp);
      tr.appendChild(td2);

      // Contato
      var td3 = document.createElement('td');
      td3.style.cssText = 'padding:6px 10px;';
      var ctDiv = document.createElement('div');
      ctDiv.style.cssText = 'display:flex;flex-direction:column;gap:3px;min-width:160px;';
      var ct = f.contato || {};
      var ctFields = [{key:'nome',ph:'Nome do contato'},{key:'tel',ph:'Telefone'},{key:'email',ph:'E-mail'}];
      ctFields.forEach(function(field) {
        var ctInp = document.createElement('input');
        ctInp.type = 'text'; ctInp.value = ct[field.key] || ''; ctInp.placeholder = field.ph;
        ctInp.style.cssText = 'width:100%;border:1px solid var(--border);border-radius:3px;padding:3px 6px;font-size:10px;background:var(--bg-surface2);color:var(--txt);font-family:var(--body);';
        ctInp.addEventListener('change', (function(fid, fkey){ return function(v){ tecFornSetContato(fid,fkey,this.value); }; })(f.id, field.key));
        ctDiv.appendChild(ctInp);
      });
      td3.appendChild(ctDiv);
      tr.appendChild(td3);

      // 4 datas
      tecIds.forEach(function(tecId) {
        var sub = tecSubs && tecSubs[tecId];
        var ovr = f.rowOverrides && f.rowOverrides[tecId];
        var start = ovr ? ovr.start : (sub ? sub.start : null);
        var du = sub ? G.diff(sub.start, sub.end) + 1 : '—';
        var tdD = document.createElement('td');
        tdD.style.cssText = 'padding:8px 6px;text-align:center;font-size:10px;color:var(--txt-muted);';
        tdD.innerHTML = start
          ? G.fmtBR(new Date(start)) + '<br><span style="font-size:9px;">' + du + ' DU</span>'
          : '—';
        tr.appendChild(tdD);
      });

      // Remover
      var tdX = document.createElement('td');
      tdX.style.cssText = 'padding:8px 6px;text-align:center;';
      var btnX = document.createElement('button');
      btnX.style.cssText = 'background:none;border:none;cursor:pointer;color:#E57373;font-size:14px;';
      btnX.title = 'Remover';
      btnX.textContent = '✕';
      btnX.addEventListener('click', (function(fid){ return function(){ tecFornRemove(fid); pfRenderTec(); }; })(f.id));
      tdX.appendChild(btnX);
      tr.appendChild(tdX);
      tbody.appendChild(tr);
    });
  }
  tbl.appendChild(tbody);
  el.appendChild(tbl);

  // Formulário adicionar
  var formDiv = document.createElement('div');
  formDiv.style.cssText = 'border:1px solid var(--border);border-radius:8px;padding:14px;background:var(--bg-surface);';

  var formTitle = document.createElement('div');
  formTitle.style.cssText = 'font-size:10px;font-weight:700;color:var(--txt);margin-bottom:10px;';
  formTitle.textContent = 'Adicionar fornecedor';
  formDiv.appendChild(formTitle);

  var grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;';

  // Select disciplina
  var selDiv = document.createElement('div');
  var selLbl = document.createElement('label');
  selLbl.style.cssText = 'font-size:9px;color:var(--txt-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;';
  selLbl.textContent = 'Disciplina';
  var sel = document.createElement('select');
  sel.id = 'pf-tec-add-disc';
  sel.style.cssText = 'width:100%;height:32px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;padding:0 8px;';
  DISCIPLINAS_TEC.forEach(function(d) {
    var opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.id + ' — ' + d.label;
    sel.appendChild(opt);
  });
  selDiv.appendChild(selLbl); selDiv.appendChild(sel);
  grid.appendChild(selDiv);

  // Input nome
  var nomeDiv = document.createElement('div');
  var nomeLbl = document.createElement('label');
  nomeLbl.style.cssText = 'font-size:9px;color:var(--txt-muted);display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;';
  nomeLbl.textContent = 'Nome do fornecedor';
  var nomeInp = document.createElement('input');
  nomeInp.type = 'text';
  nomeInp.id = 'pf-tec-add-nome';
  nomeInp.placeholder = 'Ex: Empresa XYZ Engenharia';
  nomeInp.style.cssText = 'width:100%;height:32px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;padding:0 8px;box-sizing:border-box;font-family:var(--body);';
  nomeDiv.appendChild(nomeLbl); nomeDiv.appendChild(nomeInp);
  grid.appendChild(nomeDiv);

  // Botão adicionar
  var addBtn = document.createElement('button');
  addBtn.style.cssText = 'height:32px;padding:0 16px;background:var(--accent,#00AEDF);color:#fff;border:none;border-radius:4px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;';
  addBtn.textContent = '+ Adicionar';
  addBtn.addEventListener('click', function() {
    var d = document.getElementById('pf-tec-add-disc').value;
    var n = document.getElementById('pf-tec-add-nome').value.trim();
    if (n) { tecFornAdd(d, n); pfRenderTec(); }
  });
  grid.appendChild(addBtn);
  formDiv.appendChild(grid);
  el.appendChild(formDiv);
}
window.pfRenderTec = pfRenderTec;

// ── Fornecedores Técnicos no Gantt ──────────────────────────────────────────

// Inicializar expanded e rowOverrides em cada fornecedor
function tecFornGanttInit() {
  if (!ESTADO.cfg.tecFornecedores) return;
  ESTADO.cfg.tecFornecedores.forEach(function(f) {
    if (f.expanded === undefined) f.expanded = true;
    if (!f.rowOverrides) f.rowOverrides = {};
    if (!f.contato) f.contato = {nome:'', tel:'', email:''};
  });
}
window.tecFornGanttInit = tecFornGanttInit;

// Colapsar/expandir um fornecedor
function tecFornToggle(fornId) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (f) { f.expanded = !f.expanded; onCfgChange(); gRender(); }
}
window.tecFornToggle = tecFornToggle;

// Colapsar/expandir TODOS os fornecedores
function tecFornToggleAll() {
  var forns = ESTADO.cfg.tecFornecedores || [];
  var anyExpanded = forns.some(function(f){return f.expanded;});
  forns.forEach(function(f){ f.expanded = !anyExpanded; });
  onCfgChange(); gRender();
}
window.tecFornToggleAll = tecFornToggleAll;

// Calcular datas efetivas de um fornecedor (respeitando overrides)
function tecFornGetDates(forn, tecSubs) {
  function _toISO(v) { if(!v) return null; if(typeof v==='string') return v.slice(0,10); if(v instanceof Date) return G.fmtISO(v); return null; }
  var result = {};
  var tecIds = G.TEC_IDS || ['koTec','epTec','apTec','exTec'];
  tecIds.forEach(function(tecId) {
    var sub = tecSubs && tecSubs[tecId];
    var ovr = forn.rowOverrides && forn.rowOverrides[tecId];
    result[tecId] = {
      start: _toISO((ovr && ovr.start) || (sub && sub.start)),
      end:   _toISO((ovr && ovr.end)   || (sub && sub.end))
    };
  });
  return result;
}
window.tecFornGetDates = tecFornGetDates;

// Calcular span total de um fornecedor (início do ko até fim do ex)
function tecFornGetSpan(forn, tecSubs) {
  var dates = tecFornGetDates(forn, tecSubs);
  var starts = [], ends = [];
  function parseFornDate(v) { if(!v) return null; if(v instanceof Date) return v; return G.parseD(v); }
  Object.values(dates).forEach(function(d) {
    if (d.start) starts.push(parseFornDate(d.start));
    if (d.end)   ends.push(parseFornDate(d.end));
  });
  if (!starts.length) return null;
  return {
    start: new Date(Math.min.apply(null, starts)),
    end:   new Date(Math.max.apply(null, ends))
  };
}
window.tecFornGetSpan = tecFornGetSpan;

// Calcular span total de TODOS os fornecedores (para barra principal de TÉCNICOS)
function tecFornGetGlobalSpan(tecSubs) {
  var forns = ESTADO.cfg.tecFornecedores || [];
  if (!forns.length) return null;
  var starts = [], ends = [];
  forns.forEach(function(f) {
    var span = tecFornGetSpan(f, tecSubs);
    if (span) { starts.push(span.start); ends.push(span.end); }
  });
  if (!starts.length) return null;
  return {
    start: new Date(Math.min.apply(null, starts)),
    end:   new Date(Math.max.apply(null, ends))
  };
}
window.tecFornGetGlobalSpan = tecFornGetGlobalSpan;

// Aplicar drag a um fornecedor individual
function tecFornApplyDrag(fornId, tecId, mode, deltaDays) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.rowOverrides) f.rowOverrides = {};
  var sub = (gSt.projFases[0]?.rows?.tec?.subs || {})[tecId];
  var _toDate = function(v) {
    if(!v) return null;
    if(v instanceof Date) return new Date(v);
    if(typeof v==='string') return G.parseD(v);
    return null;
  };
  var curStart = _toDate((f.rowOverrides[tecId] && f.rowOverrides[tecId].start) || (sub && sub.start));
  var curEnd   = _toDate((f.rowOverrides[tecId] && f.rowOverrides[tecId].end)   || (sub && sub.end));
  if (!curStart || !curEnd) return;
  var newStart = new Date(curStart), newEnd = new Date(curEnd);
  if (mode === 'move' || mode === 'left')  { newStart = G.addD(curStart, deltaDays); while(CALENDARIO.isNaoUtil(newStart)) newStart = G.addD(newStart, deltaDays>0?1:-1); }
  if (mode === 'move' || mode === 'right') { newEnd   = G.addD(curEnd,   deltaDays); while(CALENDARIO.isNaoUtil(newEnd))   newEnd   = G.addD(newEnd,   deltaDays>0?1:-1); }
  if (G.ms(newEnd) < G.ms(newStart)) { if(mode==='left') newStart=G.addD(newEnd,-1); else newEnd=G.addD(newStart,1); }
  f.rowOverrides[tecId] = {start: G.fmtISO(newStart), end: G.fmtISO(newEnd)};
  // Vínculo interno
  if (tecFornVincInt(f, tecId)) tecFornEncadear(f.id, tecId);
  // Vínculo externo: propagar start para todos vinculados
  if (tecFornVincExt(f, tecId)) {
    tecFornPropagaExt(f.id, tecId, G.fmtISO(newStart), G.fmtISO(newEnd));
  }
  onCfgChange(); salvarDados(); gRender();
}
window.tecFornApplyDrag = tecFornApplyDrag;

// Minimodal de fornecedor (ao clicar na barrinha)
function tecFornShowPop(fornId, tecId, rect) {
  gClosePop();
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  var sub = (gSt.projFases[0]?.rows?.tec?.subs || {})[tecId];
  var ovr = f.rowOverrides && f.rowOverrides[tecId];
  var start = ovr ? ovr.start : (sub ? sub.start : null);
  var end   = ovr ? ovr.end   : (sub ? sub.end   : null);
  var du = start && end ? CALENDARIO.contarDU(new Date(start), new Date(end)) : '—';
  var tecNames = G.TEC_NAMES || {koTec:'Kickoff',epTec:'EP',apTec:'AP',exTec:'EX'};
  var color = darkenHex(COR.TEC_MOM, .72);
  var contato = f.contato || {};

  var n = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px;font-size:11px;font-weight:700;color:#1A2535;">'
    + '<span style="width:9px;height:9px;border-radius:2px;background:'+color+';display:inline-block;flex-shrink:0;"></span>'
    + '<div><div style="font-size:11px;font-weight:700;">'+f.nome+'</div>'
    + '<div style="font-size:9px;font-weight:400;color:#6A7A8A;">'+f.disciplinaId+' · '+(tecNames[tecId]||tecId)+'</div></div>'
    + '<button onclick="gClosePop()" style="margin-left:auto;border:none;background:none;cursor:pointer;color:#A0A8B8;font-size:16px;line-height:1;padding:0;">✕</button></div>'
    + (contato.nome ? '<div style="font-size:10px;color:#6A7A8A;margin-bottom:10px;">👤 '+contato.nome+(contato.tel?' · '+contato.tel:'')+'</div>' : '')
    + '<div style="display:grid;grid-template-columns:auto 1fr;gap:5px 8px;margin-bottom:12px;font-size:11px;">'
    + '<span style="color:#8A95A8;font-weight:700;font-size:9px;text-transform:uppercase;align-self:center;">Início</span>'
    + '<span style="border:1px solid #E8E0D4;border-radius:4px;padding:4px 8px;background:#F8F4EE;color:#4A3820;">'+(start?G.fmtBR(new Date(start)):'—')+'</span>'
    + '<span style="color:#8A95A8;font-weight:700;font-size:9px;text-transform:uppercase;align-self:center;">Fim</span>'
    + '<span style="border:1px solid #E8E0D4;border-radius:4px;padding:4px 8px;background:#F8F4EE;color:#4A3820;">'+(end?G.fmtBR(new Date(end)):'—')+'</span>'
    + '<span style="color:#8A95A8;font-weight:700;font-size:9px;text-transform:uppercase;align-self:center;">DU</span>'
    + '<span style="border:1px solid #E8E0D4;border-radius:4px;padding:4px 8px;background:#F8F4EE;font-weight:700;color:#2A4A8A;">'+du+' DU</span>'
    + '</div>'
    + (ovr ? '<button onclick="tecFornResetOvr(\''+fornId+'\',\''+tecId+'\');gClosePop();" style="width:100%;margin-top:4px;padding:5px;font-size:10px;background:none;border:1px solid #C0C8D4;border-radius:4px;cursor:pointer;color:#6A7A8A;">↺ Restaurar data original</button>' : '');

  // Criar popup direto
  var _pop = document.createElement('div');
  _pop.id = 'g-pop-el';
  _pop.style.cssText = 'position:fixed;background:#fff;border-radius:10px;z-index:3000;box-shadow:0 10px 36px rgba(0,0,0,.22);border:1px solid #DDE1E8;font-family:var(--body,sans-serif);padding:16px;width:260px;visibility:hidden;';
  _pop.innerHTML = n;
  document.body.appendChild(_pop);
  requestAnimationFrame(function(){
    var pw=_pop.offsetWidth||260, ph=_pop.offsetHeight||200;
    var vw=window.innerWidth, vh=window.innerHeight;
    var rx=rect.right||rect.left||0, ry=rect.top||0;
    var left=rx+8; if(left+pw>vw-8) left=rx-pw-8; left=Math.max(8,left);
    var top=ry; if(top+ph>vh-8) top=vh-ph-8; top=Math.max(8,top);
    _pop.style.left=left+'px'; _pop.style.top=top+'px'; _pop.style.visibility='visible';
    setTimeout(function(){document.addEventListener('mousedown',gPopOutside);},0);
  });
}
window.tecFornShowPop = tecFornShowPop;

// Resetar override de uma atividade
function tecFornResetOvr(fornId, tecId) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (f && f.rowOverrides) { delete f.rowOverrides[tecId]; onCfgChange(); salvarDados(); gRender(); }
}
window.tecFornResetOvr = tecFornResetOvr;

// ── Visão Unificada de Fornecedores Técnicos ────────────────────────────────

function tecFornSetView(view) {
  if (!ESTADO.cfg) ESTADO.cfg = {};
  ESTADO.cfg.tecFornView = view;
  // Atualizar botões no Config
  var btnSep = document.getElementById('btn-tec-view-sep');
  var btnUni = document.getElementById('btn-tec-view-uni');
  var isUni  = view === 'unificado';
  if (btnSep) { btnSep.style.background = isUni ? 'var(--bg-surface2)' : 'var(--accent)'; btnSep.style.color = isUni ? 'var(--txt-muted)' : '#fff'; btnSep.style.border = isUni ? '1px solid var(--border)' : '1px solid var(--accent)'; }
  if (btnUni) { btnUni.style.background = isUni ? 'var(--accent)' : 'var(--bg-surface2)'; btnUni.style.color = isUni ? '#fff' : 'var(--txt-muted)'; btnUni.style.border = isUni ? '1px solid var(--accent)' : '1px solid var(--border)'; }
  onCfgChange(); salvarDados(); gRender();
}
window.tecFornSetView = tecFornSetView;

function tecFornGetView() {
  return (ESTADO.cfg && ESTADO.cfg.tecFornView) || 'unificado';
}
window.tecFornGetView = tecFornGetView;

// Modal por fornecedor (visão unificada)

window.tecFornAbrirModal = tecFornAbrirModal;

// Setar data de início ou fim de uma etapa
function tecFornSetDate(fornId, tecId, field, value) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.rowOverrides) f.rowOverrides = {};
  var _setduSubs = {};
  gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(_setduSubs,s); });
  var sub = _setduSubs[tecId];
  if (!f.rowOverrides[tecId]) f.rowOverrides[tecId] = {start:sub?sub.start:value, end:sub?sub.end:value};
  f.rowOverrides[tecId][field] = value;
  onCfgChange(); salvarDados(); gRender();
}
window.tecFornSetDate = tecFornSetDate;

// Setar duração (DU) de uma etapa -- calcula novo fim a partir do início
function tecFornSetDU(fornId, tecId, du) {
  if (du < 1) return false; // proteção
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return false;
  if (!f.rowOverrides) f.rowOverrides = {};
  var allSubs = {};
  gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(allSubs,s); });
  var sub = allSubs[tecId];
  var ovr = f.rowOverrides[tecId];
  var start = (ovr && ovr.start) || (sub && sub.start);
  if (!start) return false;
  // Converter para ISO se for Date
  if (start instanceof Date) start = G.fmtISO(start);
  // Calcular novo fim: start + (du-1) dias úteis
  var d = (typeof start === "string") ? G.parseD(start) : new Date(start); var count = 0;
  while (count < du - 1) { d = G.addD(d, 1); if (!CALENDARIO.isNaoUtil(d)) count++; }
  while (CALENDARIO.isNaoUtil(d)) d = G.addD(d, 1);
  var newEnd = G.fmtISO(d);
  if (!f.rowOverrides[tecId]) f.rowOverrides[tecId] = {start: start, end: newEnd};
  else { f.rowOverrides[tecId].start = start; f.rowOverrides[tecId].end = newEnd; }
  return true;
}
window.tecFornSetDU = tecFornSetDU;
window.tecFornSetDU = tecFornSetDU;

// Renderização unificada dos fornecedores no Gantt

window.tecFornRenderUnificado = tecFornRenderUnificado;

function tecFornApplyJoint(fornId, tecId, nextTecId, deltaDays) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.rowOverrides) f.rowOverrides = {};
  var sub1 = (gSt.projFases[0]?.rows?.tec?.subs||{})[tecId];
  var sub2 = (gSt.projFases[0]?.rows?.tec?.subs||{})[nextTecId];
  var d1 = f.rowOverrides[tecId] || {start:sub1?sub1.start:null, end:sub1?sub1.end:null};
  var d2 = f.rowOverrides[nextTecId] || {start:sub2?sub2.start:null, end:sub2?sub2.end:null};
  if (!d1.end || !d2.start) return;
  // Mover fim do seg1 e início do seg2
  var newEnd1   = G.addD(new Date(d1.end),   deltaDays);
  var newStart2 = G.addD(new Date(d2.start), deltaDays);
  while (CALENDARIO.isNaoUtil(newEnd1))   newEnd1   = G.addD(newEnd1,   deltaDays>0?1:-1);
  while (CALENDARIO.isNaoUtil(newStart2)) newStart2 = G.addD(newStart2, deltaDays>0?1:-1);
  f.rowOverrides[tecId]     = {start:d1.start, end:G.fmtISO(newEnd1)};
  f.rowOverrides[nextTecId] = {start:G.fmtISO(newStart2), end:d2.end};
  onCfgChange(); salvarDados(); gRender();
}
window.tecFornApplyJoint = tecFornApplyJoint;

// ── Modal único de fornecedor (versão separada e unificada) ─────────────────
// ── Helpers de vínculo interno e externo de etapas TEC ──────────────────────
function tecFornVincInt(f, tecId) {
  // vínculo interno: essa etapa encadeia com a próxima deste fornecedor?
  if (!f.vincInterno) f.vincInterno = {};
  return f.vincInterno[tecId] !== false; // padrão true
}
function tecFornSetVincInt(f, tecId, val) {
  if (!f.vincInterno) f.vincInterno = {};
  f.vincInterno[tecId] = val;
}
function tecFornVincExt(f, tecId) {
  // vínculo externo: essa etapa anda junto com os outros fornecedores?
  if (!f.vincExterno) f.vincExterno = {};
  return f.vincExterno[tecId] !== false; // padrão true
}
function tecFornSetVincExt(f, tecId, val) {
  if (!f.vincExterno) f.vincExterno = {};
  f.vincExterno[tecId] = val;
}
// Propaga mudança de uma etapa para outros fornecedores vinculados externamente
function tecFornPropagaExt(fornId, tecId, newStart, newEnd) {
  if (tecId === 'koTec') return; // KO tem lógica própria
  var fns = ESTADO.cfg.tecFornecedores || [];
  fns.forEach(function(fn2) {
    if (fn2.id === fornId) return; // pula o próprio
    if (!tecFornVincExt(fn2, tecId)) return; // não vinculado externamente
    if (!fn2.rowOverrides) fn2.rowOverrides = {};
    var cur = fn2.rowOverrides[tecId] || {};
    // Propaga apenas o start (mantém a duração original do fornecedor)
    var allSubs = {};
    gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(allSubs,s); });
    var curEnd = cur.end || (allSubs[tecId] ? G.fmtISO(allSubs[tecId].end) : newEnd);
    fn2.rowOverrides[tecId] = { start: newStart, end: curEnd };
    // Propaga internamente (cascata) se vínculo interno ativo
    if (tecFornVincInt(fn2, tecId)) {
      tecFornEncadear(fn2.id, tecId);
    }
  });
}
window.tecFornVincInt = tecFornVincInt;
window.tecFornSetVincInt = tecFornSetVincInt;
window.tecFornVincExt = tecFornVincExt;
window.tecFornSetVincExt = tecFornSetVincExt;
window.tecFornPropagaExt = tecFornPropagaExt;


function tecFornAbrirModal(fornId) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  // Garantir estruturas de vínculo inicializadas
  if (!f.vincInterno) f.vincInterno = {};
  if (!f.vincExterno) f.vincExterno = {};
  var subs = (gSt.projFases[0]?.rows?.tec?.subs) || {};
  var tecIds   = G.TEC_IDS   || ['koTec','epTec','apTec','exTec'];
  var tecNames = G.TEC_NAMES || {koTec:'Kickoff',epTec:'EP',apTec:'AP',exTec:'EX'};
  var tecColors = G.C_TEC || [];
  var colTec   = darkenHex(COR.TEC_MOM, .72);
  var contato  = f.contato || {};
  var existing = document.getElementById('modal-tec-forn');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'modal-tec-forn';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:9500;display:flex;align-items:center;justify-content:center;';
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-panel,#fff);border-radius:12px;width:560px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.32);font-family:var(--body,sans-serif);';

  // Header
  var hdr = document.createElement('div');
  hdr.style.cssText = 'padding:16px 20px;border-bottom:3px solid '+colTec+';display:flex;align-items:flex-start;gap:10px;';
  var disc = (DISCIPLINAS_TEC||[]).find(function(d){return d.id===f.disciplinaId;});
  hdr.innerHTML = '<div style="width:10px;height:10px;border-radius:2px;background:'+colTec+';flex-shrink:0;margin-top:3px;"></div>'
    +'<div style="flex:1;">'
    +'<div style="font-family:var(--font);font-size:13px;font-weight:700;color:var(--txt);">'+f.nome+'</div>'
    +'<div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">'+f.disciplinaId+(disc?' · '+disc.label:'')+'</div>'
    +'</div>'
    +'<button onclick="document.getElementById(\'modal-tec-forn\').remove()" style="background:none;border:none;cursor:pointer;color:var(--txt-muted);font-size:18px;line-height:1;padding:0;">✕</button>';
  modal.appendChild(hdr);

  var body = document.createElement('div');
  body.style.cssText = 'padding:18px 20px;';

  // Contato
  var ctSec = document.createElement('div');
  ctSec.style.cssText = 'margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--border);';
  var ctTitle = document.createElement('div');
  ctTitle.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--txt-muted);margin-bottom:10px;';
  ctTitle.textContent = 'Ponto de contato';
  ctSec.appendChild(ctTitle);
  var ctGrid = document.createElement('div');
  ctGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;';
  [{key:'nome',lbl:'Nome',ph:'Nome do contato'},{key:'tel',lbl:'Telefone',ph:'(11) 00000-0000'},{key:'email',lbl:'E-mail',ph:'email@empresa.com'}].forEach(function(field) {
    var w = document.createElement('div');
    var l = document.createElement('label');
    l.style.cssText = 'font-size:9px;font-weight:600;text-transform:uppercase;color:var(--txt-muted);display:block;margin-bottom:3px;letter-spacing:.05em;';
    l.textContent = field.lbl;
    var inp = document.createElement('input');
    inp.type='text'; inp.value=contato[field.key]||''; inp.placeholder=field.ph;
    inp.style.cssText = 'width:100%;border:1px solid var(--border);border-radius:4px;padding:5px 8px;font-size:11px;background:var(--bg-surface2);color:var(--txt);box-sizing:border-box;font-family:var(--body);';
    inp.addEventListener('change',(function(k){return function(){tecFornSetContato(f.id,k,this.value);f.contato=f.contato||{};f.contato[k]=this.value;};})(field.key));
    w.appendChild(l); w.appendChild(inp); ctGrid.appendChild(w);
  });
  ctSec.appendChild(ctGrid);
  body.appendChild(ctSec);

  // Etapas
  var etTitle = document.createElement('div');
  etTitle.style.cssText = 'font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--txt-muted);margin-bottom:12px;';
  etTitle.textContent = 'Etapas — datas encadeadas';
  body.appendChild(etTitle);

  // Montar datas atuais
  function toISO(v) { if(!v) return ''; if(typeof v==='string') return v.slice(0,10); if(v instanceof Date) return G.fmtISO(v); return ''; }
  function getDates() {
    var freshSubs = {};
    gSt.projFases.forEach(function(pf) { var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(freshSubs,s); });
    var result = {};
    tecIds.forEach(function(tid) {
      var sub = freshSubs[tid];
      var ovr = f.rowOverrides && f.rowOverrides[tid];
      result[tid] = {
        start: toISO((ovr&&ovr.start) || (sub&&sub.start)) || '',
        end:   toISO((ovr&&ovr.end)   || (sub&&sub.end))   || ''
      };
    });
    return result;
  }

  // Rerender etapas
  function renderEtapas() {
    etGrid.innerHTML = '';
    var dates = getDates();
    tecIds.forEach(function(tecId, ti) {
      var d = dates[tecId];
      var barColor = tecColors[ti%Math.max(1,tecColors.length)] || colTec;
      var du = d.start && d.end ? CALENDARIO.contarDU(new Date(d.start), new Date(d.end)) : 0;
      var isKO = tecId === 'koTec';

      var row = document.createElement('div');
      row.style.cssText = isKO
        ? 'display:grid;grid-template-columns:85px 52px 150px 90px 110px 28px;gap:5px;align-items:start;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border);'
        : 'display:grid;grid-template-columns:85px 52px 95px 95px 110px 28px;gap:5px;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border);';

      // Label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'display:flex;align-items:center;gap:6px;';
      var dot = document.createElement('span');
      if (isKO) {
        dot.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill="'+colTec+'"/></svg>';
      } else {
        dot.style.cssText = 'width:10px;height:8px;border-radius:2px;background:'+barColor+';flex-shrink:0;border-top:2px solid #0f3d2e;display:inline-block;';
      }
      var ltxt = document.createElement('span');
      ltxt.style.cssText = 'font-size:11px;font-weight:700;color:var(--txt);';
      ltxt.textContent = tecNames[tecId]||tecId;
      lbl.appendChild(dot); lbl.appendChild(ltxt);

      row.appendChild(lbl);

      // Coluna de vínculos (célula própria na grid, só para não-KO)
      var vincCell = document.createElement('div');
      vincCell.style.cssText = 'display:flex;flex-direction:column;gap:3px;align-items:stretch;';
      if (!isKO) {
        var hasNext = tecIds.indexOf(tecId) < tecIds.length - 1;
        var _btnStyle = function(active, cor) {
          var c = active ? cor : '#C8D4D8';
          var bg = active ? 'rgba('+cor+',0.08)' : 'transparent';
          return 'padding:2px 3px;border-radius:3px;cursor:pointer;font-size:8px;font-weight:700;font-family:var(--font);border:1px solid '+c+';background:'+(active?'rgba(0,0,0,0.04)':'transparent')+';color:'+(active?cor:'#9AABB8')+';text-align:center;white-space:nowrap;width:100%;display:block;line-height:14px;';
        };
        if (hasNext) {
          var viBtn = document.createElement('button');
          var _vi = tecFornVincInt(f, tecId);
          viBtn.title = _vi ? 'Encadeia com próxima' : 'Próxima etapa livre';
          viBtn.style.cssText = 'padding:2px 3px;border-radius:3px;cursor:pointer;font-size:8px;font-weight:700;font-family:var(--font);border:1px solid '+(_vi?'#009EA8':'#C8D4D8')+';background:'+(_vi?'rgba(0,158,168,.10)':'transparent')+';color:'+(_vi?'#007A88':'#9AABB8')+';text-align:center;white-space:nowrap;width:100%;display:block;line-height:14px;';
          viBtn.innerHTML = (_vi ? '🔗 seq' : '⛓ seq');
          viBtn.addEventListener('click', (function(tid, btn){return function(){
            var nv = !tecFornVincInt(f, tid);
            tecFornSetVincInt(f, tid, nv);
            onCfgChange(); salvarDados(); renderEtapas();
          };})(tecId, viBtn));
          vincCell.appendChild(viBtn);
        }
        var veBtn = document.createElement('button');
        var _ve = tecFornVincExt(f, tecId);
        veBtn.title = _ve ? 'Anda junto com outros' : 'Data independente';
        veBtn.style.cssText = 'padding:2px 3px;border-radius:3px;cursor:pointer;font-size:8px;font-weight:700;font-family:var(--font);border:1px solid '+(_ve?'#E07000':'#C8D4D8')+';background:'+(_ve?'rgba(224,112,0,.10)':'transparent')+';color:'+(_ve?'#B05800':'#9AABB8')+';text-align:center;white-space:nowrap;width:100%;display:block;line-height:14px;';
        veBtn.innerHTML = (_ve ? '🔗 sin' : '⛓ sin');
        veBtn.addEventListener('click', (function(tid, btn){return function(){
          var nv = !tecFornVincExt(f, tid);
          tecFornSetVincExt(f, tid, nv);
          btn.style.borderColor = nv?'#E07000':'#C8D4D8';
          btn.style.background  = nv?'rgba(224,112,0,.10)':'transparent';
          btn.style.color       = nv?'#B05800':'#9AABB8';
          btn.innerHTML         = nv?'🔗 sin':'⛓ sin';
          onCfgChange(); salvarDados();
        };})(tecId, veBtn));
        vincCell.appendChild(veBtn);
      }
      row.appendChild(vincCell);

      // Início
      var iniW = document.createElement('div');
      var iniL = document.createElement('div');
      iniL.style.cssText = 'font-size:8px;color:var(--txt-muted);margin-bottom:2px;font-weight:600;text-transform:uppercase;';
      iniL.textContent = 'Início';
      var iniV = document.createElement('div');
      iniV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:5px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);';
      if (isKO) {
        // Kickoff integrado: flag koIntegrado no fornecedor
        var isInteg = f.koIntegrado !== false; // padrão: integrado
        // Obter data global do KO (da fase 0 do cronograma, ou de ESTADO.cfg.koTecData)
        var koDataGlobal = (function() {
          // Primeiro tenta rowOverride de qualquer fornecedor integrado
          var fns = ESTADO.cfg.tecFornecedores || [];
          for (var fi=0; fi<fns.length; fi++) {
            var fn2 = fns[fi];
            if (fn2.koIntegrado !== false && fn2.rowOverrides && fn2.rowOverrides.koTec && fn2.rowOverrides.koTec.start) {
              return fn2.rowOverrides.koTec.start;
            }
          }
          // Fallback: data do cronograma geral
          var proj0 = gSt.projFases && gSt.projFases[0];
          if (proj0 && proj0.rows && proj0.rows.tec && proj0.rows.tec.subs && proj0.rows.tec.subs.koTec) {
            return G.fmtISO(proj0.rows.tec.subs.koTec.start);
          }
          return '';
        })();

        // Botão toggle de integração
        var koToggleBtn = document.createElement('button');
        var _koInt = isInteg;
        var _koDataLocal = d.start || koDataGlobal;
        koToggleBtn.style.cssText = 'width:100%;margin-bottom:5px;display:flex;align-items:center;justify-content:center;gap:5px;padding:5px 8px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:700;font-family:var(--font);transition:all .15s;border:1px solid '+(_koInt?'#009EA8':'#C8D4D8')+';background:'+(_koInt?'rgba(0,158,168,.10)':'rgba(200,210,220,.08)')+';color:'+(_koInt?'#007A88':'#8A95A3')+';';
        koToggleBtn.innerHTML = (_koInt ? '🔗 Kickoff integrado' : '⛓️ Kickoff separado');

        // Input de data — visível sempre, editável conforme estado
        var iniI = document.createElement('input');
        iniI.type='date';
        iniI.value = _koInt ? (koDataGlobal || _koDataLocal) : (_koDataLocal);
        iniI.style.cssText = 'width:100%;border:none;background:transparent;font-size:11px;color:var(--txt);outline:none;padding:0;cursor:pointer;'+(isInteg?'opacity:.6;':'');
        iniI.addEventListener('click', function(){ try{ this.showPicker(); }catch(e){} });

        var _applyKoChange = function(novaData, integrado) {
          if (!f.rowOverrides) f.rowOverrides = {};
          if (!f.rowOverrides.koTec) f.rowOverrides.koTec = {};
          var fns = ESTADO.cfg.tecFornecedores || [];
          // Calcular próximo DU após KO para o EP
          var koDate = G.parseD(novaData);
          var epStart = G.addD(koDate, 1);
          while (CALENDARIO.isNaoUtil(epStart)) epStart = G.addD(epStart, 1);
          var epStartISO = G.fmtISO(epStart);
          if (integrado) {
            // Propagar KO + EP para todos os fornecedores integrados
            fns.forEach(function(fn2) {
              if (fn2.koIntegrado !== false) {
                if (!fn2.rowOverrides) fn2.rowOverrides = {};
                // KO: início e fim = mesma data
                fn2.rowOverrides.koTec = { start: novaData, end: novaData };
                // EP: início = dia seguinte útil ao KO, fim mantém a duração atual
                var curEp = fn2.rowOverrides.epTec;
                var allSubs = {};
                gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(allSubs,s); });
                var epSubEnd = allSubs.epTec && allSubs.epTec.end;
                var curEnd = (curEp && curEp.end) || (epSubEnd ? G.fmtISO(new Date(epSubEnd)) : null);
                fn2.rowOverrides.epTec = { start: epStartISO, end: curEnd || epStartISO };
              }
            });
          } else {
            f.rowOverrides.koTec = { start: novaData, end: novaData };
            // EP deste fornecedor acompanha
            var curEp2 = f.rowOverrides.epTec;
            var allSubs2 = {};
            gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(allSubs2,s); });
            var curEnd2 = (curEp2 && curEp2.end) || (allSubs2.epTec ? G.fmtISO(new Date(allSubs2.epTec.end)) : null);
            f.rowOverrides.epTec = { start: epStartISO, end: curEnd2 || epStartISO };
          }
          onCfgChange(); salvarDados(); gRender(); renderEtapas();
        };

        iniI.addEventListener('change', function() {
          _applyKoChange(this.value, _koInt);
        });

        koToggleBtn.addEventListener('click', function() {
          _koInt = !_koInt;
          f.koIntegrado = _koInt;
          koToggleBtn.style.borderColor = _koInt ? '#009EA8' : '#C8D4D8';
          koToggleBtn.style.background = _koInt ? 'rgba(0,158,168,.10)' : 'rgba(200,210,220,.08)';
          koToggleBtn.style.color = _koInt ? '#007A88' : '#8A95A3';
          koToggleBtn.innerHTML = _koInt ? '🔗 Kickoff integrado' : '⛓️ Kickoff separado';
          iniI.style.opacity = _koInt ? '.6' : '1';
          if (_koInt) {
            // Ao integrar: adotar a data global
            var koGlob = (function() {
              var fns = ESTADO.cfg.tecFornecedores || [];
              for (var fi=0; fi<fns.length; fi++) {
                var fn2 = fns[fi];
                if (fn2.id !== f.id && fn2.koIntegrado !== false && fn2.rowOverrides && fn2.rowOverrides.koTec && fn2.rowOverrides.koTec.start) {
                  return fn2.rowOverrides.koTec.start;
                }
              }
              var proj0 = gSt.projFases && gSt.projFases[0];
              if (proj0 && proj0.rows && proj0.rows.tec && proj0.rows.tec.subs && proj0.rows.tec.subs.koTec) {
                return G.fmtISO(proj0.rows.tec.subs.koTec.start);
              }
              return iniI.value;
            })();
            iniI.value = koGlob;
            _applyKoChange(koGlob, true);
          } else {
            onCfgChange(); salvarDados(); gRender(); renderEtapas();
          }
        });

        iniV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:3px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);display:flex;flex-direction:column;gap:4px;';
        iniV.appendChild(iniI);
        iniV.appendChild(koToggleBtn);
      } else {
        // Não-KO: editável se vínculo interno desativado (ou se for epTec, que depende do KO)
        // Início editável: seq da etapa ANTERIOR está OFF (exceto epTec que depende do KO)
        var _tidIdx = tecIds.indexOf(tecId);
        var _prevId = _tidIdx > 0 ? tecIds[_tidIdx - 1] : null;
        var _prevSeqOff = _prevId && _prevId !== 'koTec' && !tecFornVincInt(f, _prevId);
        var _iniEditavel = _prevSeqOff && tecId !== 'epTec';
        // Fim editável: seq desta etapa está OFF
        var _seqLivre = !tecFornVincInt(f, tecId);
        if (_iniEditavel) {
          var iniI2 = document.createElement('input');
          iniI2.type = 'date';
          iniI2.value = d.start ? G.fmtISO(G.parseD(d.start)) : '';
          iniI2.style.cssText = 'width:100%;border:none;background:transparent;font-size:11px;color:var(--txt);outline:none;padding:0;cursor:pointer;';
          iniI2.addEventListener('click', function(){ try{ this.showPicker(); }catch(e){} });
          iniI2.addEventListener('change', (function(tid){ return function(){
            if (!f.rowOverrides) f.rowOverrides = {};
            if (!f.rowOverrides[tid]) f.rowOverrides[tid] = {start:'',end:''};
            f.rowOverrides[tid].start = this.value;
            onCfgChange(); salvarDados(); gRender(); renderEtapas();
          };})(tecId));
          iniV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:4px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);';
          iniV.appendChild(iniI2);
        } else {
          iniV.textContent = d.start ? G.fmtBR(G.parseD(d.start)) : '—';
          iniV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:5px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);opacity:.7;';
        }
      }
      iniW.appendChild(iniL); iniW.appendChild(iniV); row.appendChild(iniW);

      // Fim
      var fimW = document.createElement('div');
      var fimL = document.createElement('div');
      fimL.style.cssText = 'font-size:8px;color:var(--txt-muted);margin-bottom:2px;font-weight:600;text-transform:uppercase;';
      fimL.textContent = 'Fim';
      var fimV = document.createElement('div');
      // Fim editável quando vínculo interno desativado (seq livre) — qualquer etapa exceto EX (última)
      var _fimEditavel = !isKO && _seqLivre;
      if (_fimEditavel) {
        var fimI = document.createElement('input');
        fimI.type = 'date';
        fimI.value = d.end ? G.fmtISO(G.parseD(d.end)) : '';
        fimI.style.cssText = 'width:100%;border:none;background:transparent;font-size:11px;color:var(--txt);outline:none;padding:0;cursor:pointer;';
        fimI.addEventListener('click', function(){ try{ this.showPicker(); }catch(e){} });
        fimI.addEventListener('change', (function(tid){ return function(){
          if (!f.rowOverrides) f.rowOverrides = {};
          if (!f.rowOverrides[tid]) f.rowOverrides[tid] = {start: (getDates()[tid]||{}).start||'', end:''};
          f.rowOverrides[tid].end = this.value;
          // Recalcular DU
          onCfgChange(); salvarDados(); gRender(); renderEtapas();
        };})(tecId));
        fimV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:4px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);';
        fimV.appendChild(fimI);
      } else {
        fimV.style.cssText = 'border:1px solid var(--border);border-radius:4px;padding:5px 7px;font-size:11px;background:var(--bg-surface2);color:var(--txt);opacity:.7;';
        fimV.textContent = d.end ? G.fmtBR(G.parseD(d.end)) : '—';
      }
      fimW.appendChild(fimL); fimW.appendChild(fimV); row.appendChild(fimW);

      // DU com botões +/-
      var duW = document.createElement('div');
      var duL = document.createElement('div');
      duL.style.cssText = 'font-size:8px;color:var(--txt-muted);margin-bottom:2px;font-weight:600;text-transform:uppercase;';
      duL.textContent = 'Dias úteis';
      var duCtrl = document.createElement('div');
      duCtrl.style.cssText = 'display:flex;align-items:center;border:1px solid var(--border);border-radius:4px;overflow:hidden;height:30px;';
      var btnM = document.createElement('button');
      btnM.textContent='−';
      btnM.style.cssText='width:28px;height:100%;border:none;border-right:1px solid var(--border);background:var(--bg-surface2);cursor:pointer;font-size:15px;color:var(--txt-muted);flex-shrink:0;';
      if(isKO){btnM.disabled=true;btnM.style.opacity='.4';}
      var duNum = document.createElement('span');
      duNum.style.cssText='flex:1;text-align:center;font-size:13px;font-weight:700;color:var(--txt);';
      duNum.textContent = isKO ? 1 : Math.max(1,du);
      var btnP = document.createElement('button');
      btnP.textContent='+';
      btnP.style.cssText='width:28px;height:100%;border:none;border-left:1px solid var(--border);background:var(--bg-surface2);cursor:pointer;font-size:15px;color:var(--txt-muted);flex-shrink:0;';
      if(isKO){btnP.disabled=true;btnP.style.opacity='.4';}
      function ajustarDU(tid, delta) {
        if (tid === 'koTec') return; // KO sempre 1 dia
        var ds2 = getDates();
        var dt2 = ds2[tid];
        if (!dt2.end) return;

        // Mover o fim da etapa atual em delta dias úteis
        var curEnd = G.parseD(dt2.end);
        var newEnd = G.addD(curEnd, delta);
        // Pular fins de semana na direção correta
        if (delta > 0) while (CALENDARIO.isNaoUtil(newEnd)) newEnd = G.addD(newEnd, 1);
        else           while (CALENDARIO.isNaoUtil(newEnd)) newEnd = G.addD(newEnd, -1);

        // Verificar que a duração resultante não fica < 1
        if (!dt2.start) return;
        var newDU = CALENDARIO.contarDU(G.parseD(dt2.start), newEnd);
        if (newDU < 1) {
          alert('A duração de uma etapa não pode ser zero ou negativa.');
          return;
        }

        // Verificar que a próxima etapa não fica com duração negativa
        var tecIds2 = G.TEC_IDS || ['koTec','epTec','apTec','exTec'];
        var tidIdx = tecIds2.indexOf(tid);
        if (tidIdx >= 0 && tidIdx < tecIds2.length - 1) {
          var nxtId = tecIds2[tidIdx + 1];
          var nxtD  = ds2[nxtId];
          if (nxtD && nxtD.end) {
            // Novo início da próxima = newEnd + 1 dia útil
            var nxtNewStart = G.addD(newEnd, 1);
            while (CALENDARIO.isNaoUtil(nxtNewStart)) nxtNewStart = G.addD(nxtNewStart, 1);
            var nxtNewDU = CALENDARIO.contarDU(nxtNewStart, G.parseD(nxtD.end));
            if (nxtNewDU < 1) {
              alert('Esta alteração deixaria a etapa seguinte com duração zero ou negativa.');
              return;
            }
          }
        }

        // Salvar novo fim da etapa atual
        if (!f.rowOverrides) f.rowOverrides = {};
        if (!f.rowOverrides[tid]) f.rowOverrides[tid] = {start: dt2.start, end: G.fmtISO(newEnd)};
        else f.rowOverrides[tid].end = G.fmtISO(newEnd);

        // Vínculo interno: encadear próxima etapa deste fornecedor
        if (tecFornVincInt(f, tid)) tecFornEncadear(f.id, tid);

        // Vínculo externo: propagar fim para outros fornecedores vinculados
        if (tecFornVincExt(f, tid)) {
          tecFornPropagaExt(f.id, tid,
            f.rowOverrides[tid].start || dt2.start,
            G.fmtISO(newEnd));
        }
        onCfgChange(); salvarDados(); gRender(); renderEtapas();
      }
      btnM.addEventListener('click',(function(tid){ return function(){ ajustarDU(tid,-1); };})(tecId));
      btnP.addEventListener('click',(function(tid){ return function(){ ajustarDU(tid,+1); };})(tecId));
      duCtrl.appendChild(btnM); duCtrl.appendChild(duNum); duCtrl.appendChild(btnP);
      duW.appendChild(duL); duW.appendChild(duCtrl); row.appendChild(duW);

      // Reset
      var rst = document.createElement('button');
      rst.textContent='↺'; rst.title='Restaurar data original';
      rst.style.cssText='background:none;border:1px solid var(--border);border-radius:4px;cursor:pointer;color:var(--txt-muted);height:30px;width:28px;font-size:12px;margin-top:10px;';
      rst.addEventListener('click',(function(tid){ return function(){
        if(f.rowOverrides) delete f.rowOverrides[tid];
        onCfgChange(); salvarDados(); gRender(); renderEtapas();
      };})(tecId));
      row.appendChild(rst);
      etGrid.appendChild(row);
    });
  }

  var etGrid = document.createElement('div');
  body.appendChild(etGrid);
  renderEtapas();

  modal.appendChild(body);

  // Footer
  var foot = document.createElement('div');
  foot.style.cssText = 'padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;';
  var btnClose = document.createElement('button');
  btnClose.textContent = 'Fechar';
  btnClose.style.cssText = 'height:32px;padding:0 20px;background:var(--accent,#00AEDF);color:#fff;border:none;border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;';
  btnClose.addEventListener('click',function(){overlay.remove();});
  foot.appendChild(btnClose);
  modal.appendChild(foot);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
window.tecFornAbrirModal = tecFornAbrirModal;

// Encadear etapas: após alterar tecId, atualiza as próximas
function tecFornEncadear(fornId, fromTecId) {
  // Propaga APENAS o início da próxima etapa com base no fim da atual
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.rowOverrides) f.rowOverrides = {};
  var allSubs = {};
  gSt.projFases.forEach(function(pf){ var s=pf.rows&&pf.rows.tec&&pf.rows.tec.subs; if(s) Object.assign(allSubs,s); });
  var tecIds = G.TEC_IDS || ['koTec','epTec','apTec','exTec'];
  var fromIdx = tecIds.indexOf(fromTecId);
  if (fromIdx < 0 || fromIdx >= tecIds.length - 1) return;

  var curId = tecIds[fromIdx];
  var nxtId = tecIds[fromIdx + 1];

  // Pegar fim da etapa atual
  var curOvr = f.rowOverrides[curId];
  var curSub = allSubs[curId];
  var curEnd = (curOvr && curOvr.end) || (curSub && curSub.end);
  if (!curEnd) return;

  // Calcular próximo dia útil após o fim da etapa atual
  var _curEndParsed = (typeof curEnd === "string") ? G.parseD(curEnd) : new Date(curEnd);
  var nxtStart = G.addD(_curEndParsed, 1);
  while (CALENDARIO.isNaoUtil(nxtStart)) nxtStart = G.addD(nxtStart, 1);
  var nxtStartISO = G.fmtISO(nxtStart);

  // Salvar apenas o início da próxima etapa, mantendo o fim intacto
  if (!f.rowOverrides[nxtId]) {
    var nxtSub = allSubs[nxtId];
    f.rowOverrides[nxtId] = {
      start: nxtStartISO,
      end: (nxtSub && nxtSub.end) ? G.fmtISO(new Date(nxtSub.end)) : nxtStartISO
    };
  } else {
    f.rowOverrides[nxtId].start = nxtStartISO;
  }
}
window.tecFornEncadear = tecFornEncadear;

// ── Renderização unificada (proposta 4: borda-topo + tom progressivo) ───────
function tecFornRenderUnificado(projFase, _r, _i, _o, _e, forns) {
  var tecSubs   = projFase.rows && projFase.rows.tec && projFase.rows.tec.subs;
  var tecIds    = G.TEC_IDS    || ['koTec','epTec','apTec','exTec'];
  var tecNames  = G.TEC_NAMES  || {koTec:'KO',epTec:'EP',apTec:'AP',exTec:'EX'};
  var tecColors = G.C_TEC      || [];
  var colTec    = darkenHex(COR.TEC_MOM, .72);
  var bgTec     = COR.TEC_BG;
  var allExpanded = forns.some(function(f){return f.expanded!==false;});

  // Barra principal TÉCNICOS
  var globalSpan = tecFornGetGlobalSpan(tecSubs);
  if (globalSpan && globalSpan.start && globalSpan.end) {
    var gxi = gPx(globalSpan.start);
    var gxw = Math.max((G.diff(globalSpan.start,globalSpan.end)+1)*gSt.dayW, gSt.dayW);
    var gPayload = encodeURIComponent(JSON.stringify({type:'proj',phId:projFase.id,rowId:'tec',subId:null}));
    var gBarH = gBar(gxi,gxw,G.ROW_H,colTec,new Date(G.fmtISO(globalSpan.start)),new Date(G.fmtISO(globalSpan.end)),null,gPayload,false);
    _i[_i.length-1] = '<div style="height:'+G.ROW_H+'px;background:'+bgTec+';position:relative;border-bottom:1px solid #E4EAF0;overflow:hidden;">'+gGridLines(_o,_e,false,true)+gBarH+'</div>';
    var _tb = '<button onclick="tecFornToggleAll()" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 3px;color:#6A7A8A;font-weight:700;line-height:14px;margin-left:2px;">'+(allExpanded?'\u25b2\u25b2':'\u25bc\u25bc')+'</button>';
    if (_r.length > 0) { var _ls=_r.length-1; var _old=_r[_ls]; var _cut=_old.lastIndexOf('</div>'); if(_cut>=0) _r[_ls]=_old.slice(0,_cut)+_tb+'</div>'+_old.slice(_cut+6); }
  }

  // Paleta proposta 4: borda-topo escura + tons progressivos
  var tonsProp4 = [
    {bg:'#1a5c4a', border:'#0f3d2e'},  // EP: escuro
    {bg:'#4aaa84', border:'#0f3d2e'},  // AP: médio
    {bg:'#7dd4b2', border:'#0f3d2e'},  // EX: claro
  ];

  forns.forEach(function(forn) {
    var dates = tecFornGetDates(forn, tecSubs);
    var bgH = '#EDF4F0', bdH = '#D8EAE0';
    var ROW_H = G.ROW_H;
    var clickP = encodeURIComponent(JSON.stringify({type:'tecFornModal',fornId:forn.id}));

    // Header
    _r.push('<div class="gn1" style="height:'+ROW_H+'px;background:'+bgH+';display:flex;align-items:center;padding:0 5px 0 20px;border-bottom:1px solid '+bdH+';border-right:2px solid #C0C8D4;gap:4px;">'
      +'<span style="width:4px;height:4px;border-radius:1px;background:'+colTec+';flex-shrink:0;"></span>'
      +'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;color:'+colTec+';font-size:9px;">'+forn.nome+'</span>'
      +'<span style="font-size:8px;color:#6A9A7A;flex-shrink:0;margin-right:2px;">'+forn.disciplinaId+'</span>'
      +'<button data-fid="'+forn.id+'" onclick="tecFornAbrirModal(this.dataset.fid)" style="background:none;border:1px solid #C8D4D8;border-radius:3px;cursor:pointer;font-size:8px;padding:0 5px;color:#6A7A8A;font-weight:700;line-height:14px;">\u270e</button>'
      +'</div>');

    // Linha da barra unificada
    // Calcular todos os segmentos
    var segs = [];
    tecIds.forEach(function(tecId, ti) {
      var d = dates[tecId];
      if (!d || !d.start || !d.end) return;
      segs.push({tecId:tecId, ti:ti, start:d.start, end:d.end});
    });

    if (segs.length === 0) {
      _i.push('<div style="height:'+ROW_H+'px;background:'+bgH+';position:relative;border-bottom:1px solid '+bdH+';">'+gGridLines(_o,_e,false,true)+'</div>');
      return;
    }

    var totalStart = segs[0].start;
    var totalEnd   = segs[segs.length-1].end;
    var _ts=G.parseD(totalStart),_te=G.parseD(totalEnd);
    var totalXi    = gPx(_ts);
    var totalXw    = Math.max((G.diff(_ts,_te)+1)*gSt.dayW, gSt.dayW);
    var barH       = Math.max(12, ROW_H-8);
    var barTop     = (ROW_H-barH)/2;

    // Construir rótulo único à direita: EP 10D · AP 10D · EX 8D
    var lblParts = [];
    segs.forEach(function(seg) {
      if (seg.tecId === 'koTec') return; // KO não entra no rótulo
      var du = CALENDARIO.contarDU(new Date(seg.start), new Date(seg.end));
      lblParts.push((tecNames[seg.tecId]||seg.tecId)+' '+du+'D');
    });
    var lblStr = lblParts.join(' · ');

    // Drag payload para mover toda a barra (KO->EX)
    var dragAll  = encodeURIComponent(JSON.stringify({type:'tecFornAll',fornId:forn.id}));

    var barLine = '<div style="height:'+ROW_H+'px;background:'+bgH+';position:relative;border-bottom:1px solid '+bdH+';overflow:visible;">'
      +gGridLines(_o,_e,false,true);

    // Container da barra
    barLine += '<div style="position:absolute;top:'+barTop+'px;left:'+totalXi+'px;width:'+totalXw+'px;height:'+barH+'px;">';

    segs.forEach(function(seg, si) {
      var _ss2=G.parseD(seg.start),_se2=G.parseD(seg.end);
      var segXi = gPx(_ss2) - totalXi;
      var segXw = Math.max((G.diff(_ss2,_se2)+1)*gSt.dayW, gSt.dayW);
      var isKO  = seg.tecId === 'koTec';

      if (isKO) {
        // Losango escuro
        var cx = segXi + segXw/2, cy = barH/2;
        var sz = Math.min(barH*0.38, 7);
        barLine += '<svg style="position:absolute;left:0;top:0;overflow:visible;" width="'+totalXw+'" height="'+barH+'">'
          +'<polygon points="'+cx+','+(cy-sz)+' '+(cx+sz)+','+cy+' '+cx+','+(cy+sz)+' '+(cx-sz)+','+cy+'"'
          +' fill="#0f3d2e" stroke="rgba(255,255,255,.3)" stroke-width="1"/>'
          +'</svg>';
      } else {
        var palIdx = si - 1; // EP=0, AP=1, EX=2
        if (palIdx < 0) palIdx = 0;
        var pal = tonsProp4[Math.min(palIdx, tonsProp4.length-1)];
        var isLast = si === segs.length-1;
        var br_l = si===1?'0':'0';
        var br_r = isLast?'0 3px 3px 0':'0';

        // Drag handle de junção (borda direita, exceto no último)
        var jointP = !isLast
          ? encodeURIComponent(JSON.stringify({type:'tecFornJoint',fornId:forn.id,tecId:seg.tecId,nextTecId:segs[si+1].tecId}))
          : null;

        barLine += '<div data-drag="'+dragAll+'" data-mode="move" data-click="'+clickP+'"'
          +' style="position:absolute;left:'+segXi+'px;width:'+segXw+'px;height:'+barH+'px;'
          +'background:'+pal.bg+';border-radius:'+br_r+';cursor:grab;overflow:hidden;">'
          // Borda topo escura (proposta 4)
          +'<div style="position:absolute;top:0;left:0;right:0;height:3px;background:'+pal.border+';border-radius:2px 2px 0 0;"></div>';

        // Handle de junção
        if (jointP) {
          barLine += '<div data-drag="'+jointP+'" data-mode="joint"'
            +' style="position:absolute;right:-4px;top:0;bottom:0;width:8px;cursor:ew-resize;z-index:3;'
            +'background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:2px;"></div>';
        }
        barLine += '</div>';
      }
    });

    // Rótulo único à direita da barra total
    barLine += '<div style="position:absolute;left:'+(totalXw+6)+'px;top:50%;transform:translateY(-50%);white-space:nowrap;font-size:9px;font-weight:700;color:'+colTec+';pointer-events:none;">'+lblStr+'</div>';

    barLine += '</div>'; // fechar container
    barLine += '</div>'; // fechar linha
    _i.push(barLine);
  });
}
window.tecFornRenderUnificado = tecFornRenderUnificado;

function tecFornApplyAll(fornId, deltaDays) {
  var f = (ESTADO.cfg.tecFornecedores||[]).find(function(f){return f.id===fornId;});
  if (!f) return;
  if (!f.rowOverrides) f.rowOverrides = {};
  var subs = (gSt.projFases[0]?.rows?.tec?.subs) || {};
  var tecIds = G.TEC_IDS || ['koTec','epTec','apTec','exTec'];
  tecIds.forEach(function(tecId) {
    var sub = subs[tecId];
    var ovr = f.rowOverrides[tecId] || {start:sub&&sub.start, end:sub&&sub.end};
    if (!ovr.start || !ovr.end) return;
    var ns = G.addD(new Date(ovr.start), deltaDays);
    var ne = G.addD(new Date(ovr.end),   deltaDays);
    while (CALENDARIO.isNaoUtil(ns)) ns = G.addD(ns, deltaDays>0?1:-1);
    while (CALENDARIO.isNaoUtil(ne)) ne = G.addD(ne, deltaDays>0?1:-1);
    f.rowOverrides[tecId] = {start:G.fmtISO(ns), end:G.fmtISO(ne)};
  });
  onCfgChange(); salvarDados(); gRender();
}
window.tecFornApplyAll = tecFornApplyAll;

function abrirGerenciarTPO() {
  document.getElementById('modal-tpo-overlay')?.remove();
  const ov = document.createElement('div');
  ov.id = 'modal-tpo-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  _tpoRenderModal(ov);
}

function _tpoRenderModal(ov) {
  const todos = _preObraGetTodos();
  const custom = _preObraCarregarCustom();

  let listHtml = todos.map((tpl, idx) => {
    const isDefault = PREOBRA_TEMPLATES_DEFAULT.some(d => d.id === tpl.id);
    const nDiscs = tpl.disciplinas.filter(d => d.ativo !== false).length;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">' + tpl.label + '</div>'
      + '<div style="font-size:10px;color:var(--txt-muted);">' + nDiscs + ' disciplinas' + (isDefault ? ' · padrão' : '') + '</div>'
      + '</div>'
      + '<button onclick="_tpoEditarTemplate(\'' + tpl.id + '\')" style="height:28px;padding:0 10px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:5px;font-size:10px;font-family:var(--font);font-weight:700;color:var(--txt);cursor:pointer;">Editar</button>'
      + (!isDefault ? '<button onclick="_tpoExcluirTemplate(\'' + tpl.id + '\')" style="height:28px;padding:0 10px;background:rgba(180,20,20,.08);border:1px solid rgba(180,20,20,.2);border-radius:5px;font-size:10px;font-family:var(--font);font-weight:700;color:#B41414;cursor:pointer;">Excluir</button>' : '')
      + '</div>';
  }).join('');

  ov.innerHTML = '<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.45);width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">'
    + '<span style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);flex:1;">Templates de Pré-Obra</span>'
    + '<button onclick="_tpoNovoTemplate()" style="height:30px;padding:0 14px;background:var(--accent);color:#0D1117;border:none;border-radius:5px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;">+ Novo</button>'
    + '<button onclick="document.getElementById(\'modal-tpo-overlay\').remove()" style="width:30px;height:30px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:14px;color:var(--txt-muted);">✕</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:0 20px;">' + listHtml + '</div>'
    + '</div>';
}

function _tpoNovoTemplate() {
  const id = 'tpo-custom-' + Date.now();
  const novoTpl = {id: id, label: 'Novo Template', desc: '', disciplinas: [
    {id: 'disc-1', label: 'Nova Disciplina', ativo: true, tasks: [{n: 'Tarefa 1', prof: 2}]}
  ]};
  const custom = _preObraCarregarCustom();
  custom.push(novoTpl);
  _preObraSalvarCustom(custom);
  _tpoEditarTemplate(id);
}

function _tpoExcluirTemplate(tplId) {
  if (!confirm('Excluir este template de pré-obra?')) return;
  const custom = _preObraCarregarCustom().filter(t => t.id !== tplId);
  _preObraSalvarCustom(custom);
  const ov = document.getElementById('modal-tpo-overlay');
  if (ov) _tpoRenderModal(ov);
}

function _tpoEditarTemplate(tplId) {
  const todos = _preObraGetTodos();
  const tpl = JSON.parse(JSON.stringify(todos.find(t => t.id === tplId)));
  if (!tpl) return;
  const isDefault = PREOBRA_TEMPLATES_DEFAULT.some(d => d.id === tplId);

  const ov = document.getElementById('modal-tpo-overlay');
  if (!ov) return;

  function render() {
    let discsHtml = (tpl.disciplinas || []).map((disc, di) => {
      let tasksHtml = (disc.tasks || []).map((task, ti) =>
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;padding:4px 6px;background:var(--bg-surface);border-radius:4px;border:0.5px solid var(--border);">'
        + '<svg width="10" height="14" viewBox="0 0 8 12" style="opacity:.3;flex-shrink:0;cursor:grab;"><circle cx="2" cy="2" r="1.2" fill="currentColor"/><circle cx="6" cy="2" r="1.2" fill="currentColor"/><circle cx="2" cy="6" r="1.2" fill="currentColor"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/><circle cx="2" cy="10" r="1.2" fill="currentColor"/><circle cx="6" cy="10" r="1.2" fill="currentColor"/></svg>'
        + '<input type="text" value="' + task.n.replace(/"/g,'&quot;') + '" onchange="tpl.disciplinas[' + di + '].tasks[' + ti + '].n=this.value" style="flex:1;height:26px;padding:0 6px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;">'
        + '<label style="font-size:10px;color:var(--txt-muted);white-space:nowrap;">Efetivo</label>'
        + '<input type="number" min="1" max="50" value="' + (task.prof||2) + '" onchange="tpl.disciplinas[' + di + '].tasks[' + ti + '].prof=parseInt(this.value)||1" style="width:44px;height:26px;padding:0 4px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface2);color:var(--txt);font-size:11px;text-align:center;">'
        + (!isDefault ? '<button onclick="tpl.disciplinas[' + di + '].tasks.splice(' + ti + ',1);render()" style="width:22px;height:22px;background:none;border:none;cursor:pointer;font-size:12px;color:var(--txt-dim);" title="Remover tarefa">✕</button>' : '')
        + '</div>'
      ).join('');

      return '<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden;">'
        + '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg-surface2);border-bottom:1px solid var(--border);">'
        + '<input type="text" value="' + disc.label.replace(/"/g,'&quot;') + '" onchange="tpl.disciplinas[' + di + '].label=this.value" style="flex:1;height:28px;padding:0 8px;border:0.5px solid var(--border);border-radius:4px;background:var(--bg-surface);color:var(--txt);font-size:12px;font-weight:700;">'
        + '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--txt-muted);cursor:pointer;"><input type="checkbox" ' + (disc.ativo!==false?'checked':'') + ' onchange="tpl.disciplinas[' + di + '].ativo=this.checked" style="accent-color:var(--accent);"> Ativa</label>'
        + (!isDefault ? '<button onclick="tpl.disciplinas.splice(' + di + ',1);render()" style="height:26px;padding:0 8px;background:rgba(180,20,20,.08);border:1px solid rgba(180,20,20,.2);border-radius:4px;font-size:10px;color:#B41414;cursor:pointer;">✕ Disc.</button>' : '')
        + '</div>'
        + '<div style="padding:8px 10px;">' + tasksHtml
        + (!isDefault ? '<button onclick="tpl.disciplinas[' + di + '].tasks.push({n:\'Nova tarefa\',prof:2});render()" style="margin-top:4px;font-size:10px;color:var(--accent);background:none;border:none;cursor:pointer;font-family:var(--font);font-weight:700;">+ Tarefa</button>' : '')
        + '</div>'
        + '</div>';
    }).join('');

    ov.innerHTML = '<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.45);width:100%;max-width:660px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">'
      + '<div style="display:flex;align-items:center;gap:10px;padding:14px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">'
      + '<button onclick="_tpoRenderModal(document.getElementById(\'modal-tpo-overlay\'))" style="height:28px;padding:0 10px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:5px;font-size:11px;color:var(--txt-muted);cursor:pointer;">← Voltar</button>'
      + '<input type="text" id="tpo-edit-label" value="' + tpl.label.replace(/"/g,'&quot;') + '" onchange="tpl.label=this.value" style="flex:1;height:32px;padding:0 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-surface2);color:var(--txt);font-size:14px;font-weight:700;">'
      + '<button onclick="document.getElementById(\'modal-tpo-overlay\').remove()" style="width:30px;height:30px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:14px;color:var(--txt-muted);">✕</button>'
      + '</div>'
      + '<div style="flex:1;overflow-y:auto;padding:16px 20px;">' + discsHtml
      + (!isDefault ? '<button onclick="tpl.disciplinas.push({id:\'disc-\'+Date.now(),label:\'Nova Disciplina\',ativo:true,tasks:[{n:\'Tarefa\',prof:2}]});render()" style="width:100%;height:32px;background:var(--bg-surface2);border:1px dashed var(--border);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);cursor:pointer;">+ Adicionar Disciplina</button>' : '')
      + '</div>'
      + (!isDefault ? '<div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;">'
      + '<button onclick="_tpoRenderModal(document.getElementById(\'modal-tpo-overlay\'))" style="height:32px;padding:0 16px;background:var(--bg-surface2);border:1px solid var(--border);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);cursor:pointer;">Cancelar</button>'
      + '<button onclick="_tpoSalvarEdicao(tpl)" style="height:32px;padding:0 20px;background:var(--accent);border:none;border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;color:#0D1117;cursor:pointer;">✓ Salvar Template</button>'
      + '</div>' : '')
      + '</div>';
  }
  render();
}

function _tpoSalvarEdicao(tpl) {
  const custom = _preObraCarregarCustom();
  const idx = custom.findIndex(t => t.id === tpl.id);
  if (idx >= 0) custom[idx] = tpl;
  else custom.push(tpl);
  _preObraSalvarCustom(custom);
  const ov = document.getElementById('modal-tpo-overlay');
  if (ov) _tpoRenderModal(ov);
  renderObraFases();
}

function abrirGerenciarTemplates() {
  document.getElementById('modal-tpl-overlay')?.remove();
  const ov = document.createElement('div');
  ov.id = 'modal-tpl-overlay';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px;';
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  ov.innerHTML = `
    <div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.45);width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);flex-shrink:0;">
        <span style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);flex:1;">Templates de Obra</span>
        <button onclick="tplNovo()" style="height:30px;padding:0 14px;background:var(--accent);color:#fff;border:none;border-radius:5px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:.04em;">+ Novo</button>
        <button onclick="document.getElementById('modal-tpl-overlay').remove()" style="width:28px;height:28px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:6px;cursor:pointer;font-size:15px;color:var(--txt-muted);">✕</button>
      </div>
      <div id="tpl-lista" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;"></div>
    </div>`;
  document.body.appendChild(ov);
  tplRenderLista();
}

function tplRenderLista() {
  const el = document.getElementById('tpl-lista');
  if (!el) return;
  const todos = tplGetTodos();
  const customIds = new Set(_tplCarregarCustom().map(t => t.id));
  el.innerHTML = todos.map(tpl => {
    const isCustom = customIds.has(tpl.id);
    const isOriginalPadrao = OBRA_TEMPLATES.some(t => t.id === tpl.id) && !isCustom;
    const discs = tpl.disciplinas ? tpl.disciplinas : DISC_DEFS;
    const nAtivas = discs.filter(d => d.ativo !== false).length;
    const nTarefas = discs.reduce((s, d) => s + (d.tasks || []).length, 0);
    const emoji = tpl.label.match(/^\S+/)?.[0] || '📋';
    const nome = tpl.label.replace(/^\S+\s*/, '');
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;">
      <div style="width:38px;height:38px;border-radius:8px;background:${isCustom?'rgba(138,58,168,.12)':'rgba(0,174,223,.10)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${emoji}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:3px;">
          <span style="font-family:var(--font);font-size:11px;font-weight:700;color:var(--txt);">${nome}</span>
          <span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;${isCustom?'background:rgba(138,58,168,.12);color:#7A3AA8;':'background:rgba(0,174,223,.10);color:var(--accent);'}">${isCustom?'Personalizado':'Padrão A|W'}</span>
        </div>
        <div style="font-size:10px;color:var(--txt-muted);">${nAtivas} disciplinas ativas · ${nTarefas} tarefas${tpl.desc?' · '+tpl.desc:''}</div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0;">
        <button onclick="tplAbrirEditor('${tpl.id}')" style="height:28px;padding:0 12px;background:var(--accent);color:#fff;border:none;border-radius:5px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;">✎ Editar</button>
        <button onclick="tplDuplicar('${tpl.id}')" style="height:28px;padding:0 9px;border:1px solid var(--border);background:var(--bg-surface2);color:var(--txt-muted);border-radius:5px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;" title="Duplicar template">⧉</button>
        ${isOriginalPadrao ? '' : `<button onclick="tplExcluir('${tpl.id}')" style="height:28px;padding:0 9px;border:1px solid rgba(184,52,24,.3);background:rgba(184,52,24,.06);color:var(--red,#B83418);border-radius:5px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;" title="Excluir">🗑</button>`}
      </div>
    </div>`;
  }).join('');
}

// ── Novo template ─────────────────────────────────────────
function tplNovo() {
  const id = 'custom_' + Date.now();
  const novo = {
    id, label: '🏗 Novo Template', desc: '',
    disciplinas: DISC_DEFS.map(def => ({
      id: def.id, label: def.label, ativo: true,
      start: def.start ?? 1, end: def.end ?? 8,
      tasks: (def.tasks || []).map(t => ({ n: t.n, prep: t.prep, prof: t.prof||0, m: {...t.m} }))
    }))
  };
  const custom = _tplCarregarCustom();
  custom.push(novo);
  _tplSalvarCustom(custom);
  tplRenderLista();
  tplAbrirEditor(id);
}

// ── Abrir editor ──────────────────────────────────────────
function tplAbrirEditor(tplId) {
  const custom = _tplCarregarCustom();
  const customIds = new Set(custom.map(t => t.id));
  const isCustom = customIds.has(tplId);

  let editTpl;
  if (isCustom) {
    // Template personalizado: editar direto
    editTpl = custom.find(t => t.id === tplId);
  } else {
    // Template padrão A|W: editar direto também
    // Materializa as disciplinas e salva como "editado" no localStorage
    const src = OBRA_TEMPLATES.find(t => t.id === tplId);
    if (!src) return;
    editTpl = {
      id: tplId,
      label: src.label,
      desc: src.desc || '',
      disciplinas: src.disciplinas
        ? src.disciplinas.map(d => ({...d, tasks:(d.tasks||[]).map(t=>({...t,m:{...t.m}}))}))
        : DISC_DEFS.map(def => ({
            id: def.id, label: def.label, ativo: true,
            start: def.start??1, end: def.end??8,
            tasks: (def.tasks||[]).map(t=>({n:t.n,prep:t.prep,prof:t.prof||0,m:{...t.m}}))
          })),
      _padrao: true // flag interna para saber que é padrão
    };
  }
  if (!editTpl) return;
  _tplEditorId = tplId;
  _tplEditorData = JSON.parse(JSON.stringify(editTpl));
  _tplMontarEditor();
}

function tplDuplicar(tplId) {
  const todos = tplGetTodos();
  const src = todos.find(t => t.id === tplId);
  if (!src) return;
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = 'custom_' + Date.now();
  const nomeBase = src.label.replace(/^\S+\s*/, '');
  const emoji = src.label.match(/^\S+/)?.[0] || '📋';
  clone.label = emoji + ' ' + nomeBase + ' (cópia)';
  clone.disciplinas = clone.disciplinas
    ? clone.disciplinas.map(d => ({...d, tasks:(d.tasks||[]).map(t=>({...t,m:{...t.m}}))}))
    : DISC_DEFS.map(def => ({
        id: def.id, label: def.label, ativo: true,
        start: def.start??1, end: def.end??8,
        tasks: (def.tasks||[]).map(t=>({n:t.n,prep:t.prep,prof:t.prof||0,m:{...t.m}}))
      }));
  const custom = _tplCarregarCustom();
  custom.push(clone);
  _tplSalvarCustom(custom);
  showToast('Template duplicado: "' + clone.label + '"');
  tplRenderLista();
}

// ── Montar modal do editor (visual idêntico ao OU) ────────
function _tplMontarEditor() {
  document.getElementById('modal-tpl-editor')?.remove();
  const tpl = _tplEditorData;
  const nomeLabel = tpl.label.replace(/^\S+\s*/, '');

  const ov = document.createElement('div');
  ov.id = 'modal-tpl-editor';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9300;display:flex;align-items:center;justify-content:center;padding:12px;';

  ov.innerHTML = `
    <div style="background:var(--bg-surface);border-radius:10px;box-shadow:0 24px 64px rgba(0,0,0,.5);width:100%;max-width:1080px;max-height:94vh;display:flex;flex-direction:column;overflow:hidden;">
      <!-- Header azul, idêntico ao OU -->
      <div style="background:var(--accent);padding:14px 18px;flex-shrink:0;display:flex;align-items:center;gap:12px;">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <span style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;">EDITOR DE TEMPLATE</span>
            <span id="tpl-badge-alerta" style="display:none;font-size:10px;font-weight:700;background:rgba(255,180,0,.25);color:#FFE080;padding:2px 8px;border-radius:8px;"></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <input id="tpl-ed-nome" type="text" value="${nomeLabel}" placeholder="Nome do template"
              style="font-family:var(--font);font-size:13px;font-weight:600;color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:5px;outline:none;padding:4px 10px;min-width:280px;"
              onfocus="this.style.background='rgba(255,255,255,.25)'" onblur="this.style.background='rgba(255,255,255,.15)'">
            <input id="tpl-ed-desc" type="text" value="${tpl.desc||''}" placeholder="Descrição opcional"
              style="font-family:var(--body);font-size:11px;color:rgba(255,255,255,.8);background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.2);border-radius:5px;outline:none;padding:4px 10px;flex:1;">
          </div>
        </div>
        <div style="display:flex;gap:5px;flex-shrink:0;">
          <button onclick="tplEdExpandirTudo(false)" title="Recolher todas as disciplinas" style="height:36px;padding:0 12px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;">⊟ Recolher</button>
          <button onclick="tplEdExpandirTudo(true)" title="Expandir todas as disciplinas" style="height:36px;padding:0 12px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:6px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;">⊞ Expandir</button>
        </div>
        <button onclick="_tplSalvar()" style="height:36px;padding:0 20px;background:#fff;color:var(--accent);border:none;border-radius:6px;font-family:var(--font);font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.04em;flex-shrink:0;">💾 Salvar</button>
        <button onclick="document.getElementById('modal-tpl-editor').remove()" style="width:32px;height:32px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:6px;cursor:pointer;font-size:16px;color:#fff;flex-shrink:0;">✕</button>
      </div>
      <!-- Conteúdo rolável -->
      <div id="tpl-ed-content" style="flex:1;overflow-y:auto;padding:0;"></div>
      <!-- Footer -->
      <div style="padding:10px 18px;border-top:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;background:var(--bg-surface);">
        <span style="font-size:10px;color:var(--txt-dim);">Todas as alterações são aplicadas ao clicar em 💾 Salvar</span>
        <button onclick="_tplSalvar()" style="height:32px;padding:0 20px;background:var(--accent);color:#fff;border:none;border-radius:5px;font-family:var(--font);font-size:10px;font-weight:700;cursor:pointer;">💾 Salvar template</button>
      </div>
    </div>`;

  document.body.appendChild(ov);
  tplEdRender();
}

// ── Render da tabela (idêntico ao ouRender, mas fonte = _tplEditorData) ──

// ── Expandir/Recolher tudo ────────────────────────────────
function tplEdExpandirTudo(expandir) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas.forEach(d => { d._ouExpanded = expandir; });
  tplEdRender();
}

// ── Drag & drop para reordenar disciplinas ────────────────
let _tplDragIdx = null;

function tplEdDragStart(event, di) {
  _tplDragIdx = di;
  event.stopPropagation();
  event.dataTransfer.effectAllowed = 'move';
  // Destacar linha arrastada
  const row = document.getElementById('tpl-disc-row-' + di);
  if (row) row.style.opacity = '0.4';
}

function tplEdDragOver(event, di) {
  event.preventDefault();
  event.stopPropagation();
  if (_tplDragIdx === null || _tplDragIdx === di) return;
  // Indicar posição de drop — linha indicadora
  const content = document.getElementById('tpl-ed-content');
  if (!content) return;
  content.querySelectorAll('tr[id^="tpl-disc-row-"]').forEach(r => {
    r.style.borderTop = '';
    r.style.borderBottom = '';
  });
  const targetRow = document.getElementById('tpl-disc-row-' + di);
  if (targetRow) {
    if (di > _tplDragIdx) {
      targetRow.style.borderBottom = '3px solid #fff';
    } else {
      targetRow.style.borderTop = '3px solid #fff';
    }
  }
}

function tplEdDrop(event, di) {
  event.preventDefault();
  event.stopPropagation();
  if (_tplDragIdx === null || _tplDragIdx === di || !_tplEditorData) return;
  // Reordenar
  const discs = _tplEditorData.disciplinas;
  const [moved] = discs.splice(_tplDragIdx, 1);
  const newIdx = _tplDragIdx < di ? di - 1 : di;
  discs.splice(newIdx, 0, moved);
  _tplDragIdx = null;
  tplEdRender();
}

function tplEdDragEnd() {
  _tplDragIdx = null;
  // Limpar estilos residuais
  const content = document.getElementById('tpl-ed-content');
  if (!content) return;
  content.querySelectorAll('tr[id^="tpl-disc-row-"]').forEach(r => {
    r.style.opacity = '';
    r.style.borderTop = '';
    r.style.borderBottom = '';
  });
}

function tplEdRender() {
  const discs = _tplEditorData?.disciplinas;
  if (!discs) return;
  const PERC_OPTS = [0, 25, 50, 75, 100];
  const SEL_STYLE = 'width:100%;border:none;background:transparent;font-family:inherit;font-size:10px;text-align:center;cursor:pointer;outline:none;';
  const TD = (content, extra='') => `<td style="padding:5px 6px;border:1px solid var(--border);${extra}">${content}</td>`;

  // Totais de efetivo por módulo
  const totEft = Array(9).fill(0);
  discs.forEach(disc => {
    (disc.tasks || []).forEach(t => {
      for (let m = 1; m <= 8; m++) totEft[m] += (t.prof||0) * ((t.m[m]||0) / 100);
    });
  });

  let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr style="background:var(--bg-surface2);position:sticky;top:0;z-index:10;">';
  html += TD('<b>Disciplina / Tarefa</b>', 'min-width:160px;text-align:left;font-weight:700;');
  html += TD('<b>Tipo</b>', 'width:90px;text-align:center;font-weight:700;');
  html += TD('<b>Efetivo</b>', 'width:60px;text-align:center;font-weight:700;');
  for (let m = 1; m <= 8; m++) html += TD(`<b>M${m}</b>`, 'width:54px;text-align:center;font-weight:700;');
  html += TD('<b>Total</b>', 'width:50px;text-align:center;font-weight:700;');
  html += TD('<b>Ações</b>', 'width:44px;text-align:center;font-weight:700;');
  html += '</tr></thead><tbody>';

  discs.forEach((disc, di) => {
    const pal = getDiscPal(di);
    const cor = pal[1];
    const corBg = pal[0] + '22';
    const isExp = disc._ouExpanded !== false;
    const ativa = disc.ativo !== false;

    // Cabeçalho da disciplina — exatamente como no OU
    html += `<tr style="cursor:pointer;background:${ativa ? cor : '#8A8A8A'};" onclick="tplEdToggleDisc(${di})" draggable="true" ondragstart="tplEdDragStart(event,${di})" ondragover="tplEdDragOver(event,${di})" ondrop="tplEdDrop(event,${di})" ondragend="tplEdDragEnd()" id="tpl-disc-row-${di}">`;
    html += `<td colspan="12" style="padding:8px 10px;border:1px solid var(--border);font-family:var(--font);font-size:12px;font-weight:700;color:#fff;">`;
    html += `<span onclick="event.stopPropagation()" style="margin-right:10px;cursor:grab;opacity:.7;font-size:15px;letter-spacing:-1px;" title="Arrastar para reordenar">⠿⠿</span>`;
    html += `<span style="margin-right:8px;">${isExp ? '▼' : '▶'}</span>`;
    // Nome editável da disciplina
    html += `<input type="text" value="${disc.label.replace(/"/g,'\"')}" onclick="event.stopPropagation()" onchange="tplEdSetDiscNome(${di},this.value)" style="background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.4);color:#fff;font-family:var(--font);font-size:12px;font-weight:700;outline:none;min-width:160px;">`;
    // Toggle ativa
    html += `<label onclick="event.stopPropagation()" style="float:right;display:flex;align-items:center;gap:5px;cursor:pointer;font-size:10px;font-weight:400;margin-left:8px;">
      <input type="checkbox" ${ativa?'checked':''} onchange="tplEdToggleAtiva(${di},this.checked)" style="accent-color:#fff;width:13px;height:13px;"> Ativa
    </label>`;
    html += `<button onclick="event.stopPropagation();tplEdAdicionarTarefa(${di})" style="float:right;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;cursor:pointer;margin-left:6px;">+ Tarefa</button>`;
    html += `<button onclick="event.stopPropagation();tplEdRemoverDisc(${di})" style="float:right;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;padding:2px 7px;border-radius:3px;font-size:10px;cursor:pointer;">🗑 Disciplina</button>`;
    html += `</td></tr>`;

    if (!isExp) return;

    (disc.tasks || []).forEach((task, ti) => {
      const total = Object.values(task.m).reduce((s,v) => s+(v||0), 0);
      const incompleto = total > 0 && total !== 100;
      const rowBg = incompleto ? 'rgba(255,200,0,.10)' : (di % 2 === 0 ? 'transparent' : 'rgba(0,0,0,.02)');

      html += `<tr style="background:${rowBg};">`;
      // Nome
      html += `<td style="padding:4px 4px 4px 20px;border:1px solid var(--border);">`;
      html += `<input type="text" value="${(task.n||'').replace(/"/g,'\"')}" onchange="tplEdSetNome(${di},${ti},this.value)" style="width:100%;border:none;background:transparent;font-size:11px;font-family:var(--body);">`;
      html += `</td>`;
      // Tipo
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<select onchange="tplEdSetTipo(${di},${ti},this.value)" style="${SEL_STYLE}">`;
      html += `<option value="SERVIÇO" ${!task.prep?'selected':''}>SERVIÇO</option>`;
      html += `<option value="PREPARAÇÃO" ${task.prep?'selected':''}>PREP</option>`;
      html += `</select></td>`;
      // Efetivo
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<input type="number" min="0" max="99" value="${task.prof||0}" onchange="tplEdSetProf(${di},${ti},this.value)" style="width:44px;border:1px solid var(--border);border-radius:3px;text-align:center;font-size:11px;padding:2px 0;">`;
      html += `</td>`;
      // M1-M8
      for (let m = 1; m <= 8; m++) {
        const perc = task.m[m] || 0;
        const mbg = perc > 0 ? `background:${corBg};` : '';
        html += `<td style="padding:2px;border:1px solid var(--border);text-align:center;${mbg}">`;
        html += `<select onchange="tplEdSetPerc(${di},${ti},${m},this.value)" style="${SEL_STYLE}${perc>0?'color:'+cor+';font-weight:700;':''}">`;
        PERC_OPTS.forEach(p => { html += `<option value="${p}" ${perc===p?'selected':''}>${p===0?'—':p+'%'}</option>`; });
        html += `</select></td>`;
      }
      // Total
      const totCor = incompleto ? '#B85000' : total===100 ? '#006A20' : '#8A95A8';
      const totBg  = incompleto ? 'rgba(255,160,0,.15)' : total===100 ? 'rgba(0,180,80,.08)' : '';
      html += `<td style="padding:4px;border:1px solid var(--border);text-align:center;background:${totBg};color:${totCor};font-weight:700;">${total}%${incompleto?' ⚠':''}</td>`;
      // Remover tarefa
      html += `<td style="padding:3px;border:1px solid var(--border);text-align:center;">`;
      html += `<button onclick="tplEdRemoverTarefa(${di},${ti})" style="background:none;border:1px solid #E08080;color:#C04040;border-radius:3px;padding:2px 5px;font-size:11px;cursor:pointer;">✕</button>`;
      html += `</td></tr>`;
    });
  });

  // Linha de totais de efetivo
  html += `<tr style="background:var(--bg-surface2);border-top:2px solid var(--border-md);">`;
  html += TD('<b>Efetivo total / módulo</b>', 'text-align:left;font-weight:700;color:var(--txt-muted);');
  html += TD('', ''); html += TD('', '');
  for (let m = 1; m <= 8; m++) {
    const v = totEft[m];
    html += TD(`<b>${v > 0 ? v.toFixed(1).replace(/\.0$/,'') : '—'}</b>`, `text-align:center;color:${v>0?COR.OBRA_MOM:'var(--txt-dim)'};`);
  }
  html += TD('', ''); html += TD('', '');
  html += '</tr>';

  // Botão nova disciplina
  html += `<tr><td colspan="12" style="padding:12px;text-align:center;border:1px solid var(--border);background:var(--bg-surface);">`;
  html += `<button onclick="tplEdAdicionarDisc()" style="background:var(--accent);color:#fff;border:none;padding:7px 18px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600;">+ Nova Disciplina</button>`;
  html += `</td></tr>`;
  html += '</tbody></table>';

  const el = document.getElementById('tpl-ed-content');
  if (el) el.innerHTML = html;

  // Badge de alertas
  const nAlertas = discs.reduce((s, d) => s + (d.tasks||[]).filter(t => {
    const tot = Object.values(t.m).reduce((a,b)=>a+(b||0),0);
    return tot > 0 && tot !== 100;
  }).length, 0);
  const badge = document.getElementById('tpl-badge-alerta');
  if (badge) { badge.textContent = nAlertas > 0 ? `⚠ ${nAlertas} alerta${nAlertas>1?'s':''}` : ''; badge.style.display = nAlertas > 0 ? '' : 'none'; }
}

// ── Funções de edição (espelham as do OU) ─────────────────
function tplEdToggleDisc(di) {
  if (!_tplEditorData) return;
  const disc = _tplEditorData.disciplinas[di];
  if (disc) { disc._ouExpanded = disc._ouExpanded === false ? true : false; tplEdRender(); }
}
function tplEdToggleAtiva(di, ativo) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].ativo = ativo;
  tplEdRender();
}
function tplEdSetDiscNome(di, val) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].label = val;
}
function tplEdSetNome(di, ti, val) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].tasks[ti].n = val;
}
function tplEdSetTipo(di, ti, val) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].tasks[ti].prep = (val === 'PREPARAÇÃO');
}
function tplEdSetProf(di, ti, val) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].tasks[ti].prof = Math.max(0, parseInt(val)||0);
  tplEdRender();
}
function tplEdSetPerc(di, ti, m, val) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].tasks[ti].m[m] = parseInt(val)||0;
  tplEdRender();
}
function tplEdAdicionarTarefa(di) {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas[di].tasks.push({ n: 'Nova Atividade', prep: false, prof: 1, m: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0} });
  tplEdRender();
}
function tplEdRemoverTarefa(di, ti) {
  if (!_tplEditorData) return;
  const disc = _tplEditorData.disciplinas[di];
  if (disc.tasks.length <= 1) { showToast('A disciplina precisa ter ao menos 1 tarefa'); return; }
  disc.tasks.splice(ti, 1);
  tplEdRender();
}
function tplEdAdicionarDisc() {
  if (!_tplEditorData) return;
  _tplEditorData.disciplinas.push({
    id: 'custom_' + Date.now(), label: 'Nova Disciplina',
    ativo: true, start: 1, end: 8, _ouExpanded: true,
    tasks: [{ n: 'Atividade Principal', prep: false, prof: 1, m: {1:0,2:0,3:0,4:0,5:0,6:0,7:0,8:0} }]
  });
  tplEdRender();
}
function tplEdRemoverDisc(di) {
  if (!_tplEditorData) return;
  if (!confirm('Remover a disciplina "' + (_tplEditorData.disciplinas[di]?.label||'') + '" e todas as suas tarefas?')) return;
  _tplEditorData.disciplinas.splice(di, 1);
  tplEdRender();
}

// ── Salvar ────────────────────────────────────────────────

// Propaga as disciplinas de um template para todas as fases sincronizadas
function _tplPropagarParaCronograma(templateId) {
  if (!templateId) return;
  let atualizado = 0;
  gSt.obraFases.forEach((fase, faseIdx) => {
    const cfg = ESTADO.cfg.obraFases[faseIdx];
    if (!cfg || cfg.templateId !== templateId) return;
    // Só propaga se a fase ainda está sincronizada com o template
    // (não foi modificada manualmente)
    if (_tplFaseModificada(faseIdx)) return;
    const novasDiscs = _tplGetDiscsCopy(templateId);
    if (!novasDiscs) return;
    fase.disciplinas = novasDiscs;
    atualizado++;
  });
  if (atualizado > 0) {
    ativSincronizarG();
    gRender();
    if (typeof renderEfetivo === 'function' && abaAtiva === 'efetivo') renderEfetivo();
    if (typeof renderHistograma === 'function' && abaAtiva === 'histograma') renderHistograma();
  }
}

function _tplSalvar() {
  if (!_tplEditorData || !_tplEditorId) return;
  const nomeInput = document.getElementById('tpl-ed-nome')?.value?.trim();
  const descInput = document.getElementById('tpl-ed-desc')?.value?.trim() || '';
  if (!nomeInput) { showToast('Informe um nome para o template'); return; }

  const custom = _tplCarregarCustom();
  const existing = custom.find(t => t.id === _tplEditorId);
  const emoji = existing?.label?.match(/^\S+/)?.[0] || '🏗';

  _tplEditorData.label = emoji + ' ' + nomeInput;
  _tplEditorData.desc = descInput;
  _tplEditorData.id = _tplEditorId;

  // Limpar propriedade de UI antes de salvar
  _tplEditorData.disciplinas?.forEach(d => { delete d._ouExpanded; });

  // Remove flag interna antes de salvar
  delete _tplEditorData._padrao;
  const idx = custom.findIndex(t => t.id === _tplEditorId);
  if (idx >= 0) custom[idx] = _tplEditorData;
  else custom.push(_tplEditorData);
  _tplSalvarCustom(custom);

  // Propagar para fases do cronograma que ainda estão sincronizadas com este template
  _tplPropagarParaCronograma(_tplEditorId);

  showToast('Template "' + _tplEditorData.label + '" salvo');
  document.getElementById('modal-tpl-editor')?.remove();
  tplRenderLista();
  renderObraFases();
}

// ── Excluir ───────────────────────────────────────────────
function tplExcluir(id) {
  const custom = _tplCarregarCustom();
  const tpl = custom.find(t => t.id === id);
  if (!tpl) return;
  if (!confirm('Excluir o template "' + tpl.label + '"?')) return;
  _tplSalvarCustom(custom.filter(t => t.id !== id));
  showToast('Template excluído');
  tplRenderLista();
  renderObraFases();
}

// Compatibilidade
function aplicarTemplate(faseIdx, templateId) {
  const fase = gSt.obraFases[faseIdx];
  if (!fase) return;
  const novas = obraTemplateGetDiscs(templateId);
  if (!novas) {
    // template customizado
    const tpl = _tplCarregarCustom().find(t => t.id === templateId);
    if (!tpl || !tpl.disciplinas) return;
    fase.disciplinas = JSON.parse(JSON.stringify(tpl.disciplinas));
  } else {
    fase.disciplinas = novas;
  }
  if (!ESTADO.cfg.obraFases[faseIdx]) ESTADO.cfg.obraFases[faseIdx] = {};
  ESTADO.cfg.obraFases[faseIdx].templateId = templateId;
  ativSincronizarG();
  gRender();
  if (typeof renderEfetivo === 'function' && abaAtiva === 'efetivo') renderEfetivo();
  if (typeof renderHistograma === 'function' && abaAtiva === 'histograma') renderHistograma();
  showToast('Template aplicado à Fase ' + (faseIdx + 1));
}


// === DISCIPLINAS COMPILADAS ===
// DISC_DEFS e DISC_PALETTES já estão declarados no bloco principal do JS (com as 14 disciplinas completas) — usamos os mesmos aqui

function abrirDisciplinasCompiladas() {
  document.getElementById('modal-disciplinas-overlay').style.display = 'flex';
  renderDisciplinasCompiladas();
}

function fecharDisciplinasCompiladas() {
  document.getElementById('modal-disciplinas-overlay').style.display = 'none';
}

function renderDisciplinasCompiladas() {
  const content = document.getElementById('disciplinas-content');
  
  let html = '<div style="margin-bottom:16px;font-size:12px;color:var(--txt-muted);">Todas as disciplinas contempladas na obra com percentuais editáveis por módulo (0%, 25%, 50%, 75%, 100%)</div>';
  
  html += '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
  html += '<thead><tr style="background:var(--bg-surface2);">';
  html += '<th style="padding:8px;border:1px solid var(--border);text-align:left;font-weight:600;width:150px;">Atividade</th>';
  html += '<th style="padding:8px;border:1px solid var(--border);text-align:center;font-weight:600;width:60px;">Tipo</th>';
  html += '<th style="padding:8px;border:1px solid var(--border);text-align:center;font-weight:600;width:50px;">Prof</th>';
  for (let i = 1; i <= 8; i++) {
    html += `<th style="padding:8px;border:1px solid var(--border);text-align:center;font-weight:600;width:50px;">M${i}</th>`;
  }
  html += '<th style="padding:8px;border:1px solid var(--border);text-align:center;font-weight:600;width:50px;">Total</th>';
  html += '<th style="padding:8px;border:1px solid var(--border);text-align:center;font-weight:600;width:70px;">Ações</th>';
  html += '</tr></thead><tbody>';
  
  // Iterar sobre todas as disciplinas
  DISC_DEFS.forEach((disc, discIdx) => {
    const discColor = DISC_PALETTES[discIdx][0];
    const isExpanded = disc.expanded !== false; // padrão expandido
    
    // Linha de cabeçalho da disciplina (colapsável)
    html += `<tr class="disc-header" onclick="toggleDisciplina('${disc.id}')" style="cursor:pointer;background:${discColor};color:#fff;">`;
    html += `<td colspan="12" style="padding:10px;border:1px solid var(--border);font-weight:700;font-size:12px;">`;
    html += `<span style="margin-right:8px;">${isExpanded ? '▼' : '▶'}</span>`;
    html += `${disc.label}`;
    html += `<button onclick="event.stopPropagation();removerDisciplina('${disc.id}')" style="float:right;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;cursor:pointer;margin-left:10px;">🗑 Remover</button>`;
    html += `<button onclick="event.stopPropagation();adicionarTarefa('${disc.id}')" style="float:right;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;cursor:pointer;">+ Tarefa</button>`;
    html += '</td>';
    html += '</tr>';
    
    // Tarefas da disciplina (visíveis apenas se expandida)
    if (isExpanded) {
      disc.tasks.forEach((task, taskIdx) => {
        // Calcular total da linha
        const total = Object.values(task.m).reduce((sum, val) => sum + (val || 0), 0);
        const isIncomplete = total > 0 && total !== 100;
        const rowClass = isIncomplete ? 'disc-alerta' : '';
        
        html += `<tr class="${rowClass}">`;
        html += `<td style="padding:8px 8px 8px 20px;border:1px solid var(--border);background:${isIncomplete ? 'rgba(255,200,0,0.1)' : 'transparent'};">`;
        html += `<input type="text" value="${task.n}" onchange="atualizarNomeTarefa('${disc.id}', ${taskIdx}, this.value)" style="width:100%;border:none;background:transparent;font-size:11px;">`;
        html += `</td>`;
        html += `<td style="padding:8px;border:1px solid var(--border);text-align:center;background:var(--bg-surface2);">`;
        html += `<select onchange="atualizarTipoTarefa('${disc.id}', ${taskIdx}, this.value)" style="width:100%;border:none;background:transparent;font-size:10px;">`;
        html += `<option value="SERVIÇO" ${!task.prep ? 'selected' : ''}>SERVIÇO</option>`;
        html += `<option value="PREPARAÇÃO" ${task.prep ? 'selected' : ''}>PREPARAÇÃO</option>`;
        html += `</select>`;
        html += `</td>`;
        html += `<td style="padding:8px;border:1px solid var(--border);text-align:center;">`;
        html += `<input type="number" value="${task.prof || 0}" min="0" max="10" onchange="atualizarProfTarefa('${disc.id}', ${taskIdx}, this.value)" style="width:100%;border:none;background:transparent;text-align:center;font-size:10px;">`;
        html += `</td>`;
        
        // Módulos M1-M8 com dropdowns
        for (let i = 1; i <= 8; i++) {
          const perc = task.m[i] || 0;
          html += `<td style="padding:4px;border:1px solid var(--border);text-align:center;background:${perc > 0 ? 'var(--orange-light)' : 'transparent'};">`;
          html += `<select onchange="atualizarPercentualModulo('${disc.id}', ${taskIdx}, ${i}, this.value)" style="width:100%;border:none;background:transparent;font-size:10px;text-align:center;">`;
          html += `<option value="0" ${perc === 0 ? 'selected' : ''}>0%</option>`;
          html += `<option value="25" ${perc === 25 ? 'selected' : ''}>25%</option>`;
          html += `<option value="50" ${perc === 50 ? 'selected' : ''}>50%</option>`;
          html += `<option value="75" ${perc === 75 ? 'selected' : ''}>75%</option>`;
          html += `<option value="100" ${perc === 100 ? 'selected' : ''}>100%</option>`;
          html += `</select>`;
          html += '</td>';
        }
        
        // Total com validação
        html += `<td style="padding:8px;border:1px solid var(--border);text-align:center;background:${isIncomplete ? 'rgba(255,200,0,0.2)' : total === 100 ? 'rgba(0,200,0,0.1)' : 'transparent'};color:${isIncomplete ? '#e67e00' : total === 100 ? '#00a000' : '#666'};">`;
        html += `<strong>${total}%</strong>`;
        if (isIncomplete) html += ` ⚠️`;
        html += `</td>`;
        
        // Ações
        html += `<td style="padding:8px;border:1px solid var(--border);text-align:center;">`;
        html += `<button onclick="removerTarefa('${disc.id}', ${taskIdx})" style="background:#ff4757;color:#fff;border:none;padding:3px 6px;border-radius:3px;font-size:10px;cursor:pointer;">🗑</button>`;
        html += `</td>`;
        html += '</tr>';
      });
    }
  });
  
  // Linha para adicionar nova disciplina
  html += '<tr style="border-top:2px solid var(--border-md);">';
  html += '<td colspan="12" style="padding:12px;text-align:center;background:var(--bg-surface);border:1px solid var(--border);">';
  html += '<button onclick="adicionarNovaDisciplina()" style="background:var(--accent);color:#fff;border:none;padding:8px 16px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600;">+ Nova Disciplina</button>';
  html += '</td>';
  html += '</tr>';
  
  html += '</tbody></table>';
  
  content.innerHTML = html;
}

// Funções auxiliares
function toggleDisciplina(discId) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc) {
    disc.expanded = !disc.expanded;
    renderDisciplinasCompiladas();
  }
}

function adicionarTarefa(discId) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc) {
    const novaTarefa = {
      n: 'Nova Atividade',
      prep: false,
      prof: 1,
      m: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0}
    };
    disc.tasks.push(novaTarefa);
    renderDisciplinasCompiladas();
  }
}

function removerTarefa(discId, taskIdx) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc && disc.tasks.length > 1) {
    disc.tasks.splice(taskIdx, 1);
    renderDisciplinasCompiladas();
  }
}

function adicionarNovaDisciplina() {
  const novaDisc = {
    id: 'custom_' + Date.now(),
    label: 'Nova Disciplina',
    expanded: true,
    tasks: [{
      n: 'Atividade Principal',
      prep: false,
      prof: 1,
      m: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0}
    }]
  };
  DISC_DEFS.push(novaDisc);
  renderDisciplinasCompiladas();
}

function removerDisciplina(discId) {
  if (confirm('Remover esta disciplina e todas as suas tarefas?')) {
    const index = DISC_DEFS.findIndex(d => d.id === discId);
    if (index > -1) {
      DISC_DEFS.splice(index, 1);
      renderDisciplinasCompiladas();
    }
  }
}

function atualizarPercentualModulo(discId, taskIdx, modulo, valor) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc && disc.tasks[taskIdx]) {
    const val = parseInt(valor) || 0;
    if ([0, 25, 50, 75, 100].includes(val)) {
      disc.tasks[taskIdx].m[modulo] = val;
      renderDisciplinasCompiladas();
    }
  }
}

function atualizarNomeTarefa(discId, taskIdx, novoNome) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc && disc.tasks[taskIdx]) {
    disc.tasks[taskIdx].n = novoNome;
  }
}

function atualizarTipoTarefa(discId, taskIdx, tipo) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc && disc.tasks[taskIdx]) {
    disc.tasks[taskIdx].prep = (tipo === 'PREPARAÇÃO');
  }
}

function atualizarProfTarefa(discId, taskIdx, prof) {
  const disc = DISC_DEFS.find(d => d.id === discId);
  if (disc && disc.tasks[taskIdx]) {
    disc.tasks[taskIdx].prof = Math.max(0, parseInt(prof) || 0);
  }
}
// ═══════════════════════════════════════════════════════════
// PLANO FINO v4.06
// ═══════════════════════════════════════════════════════════

const PF_ARQUITETOS_DEFAULT = [
  {nome:'Ana Lima',       cargo:'Arq. Sênior'},
  {nome:'Bruno Costa',    cargo:'Arq. Pleno'},
  {nome:'Carol Mendes',   cargo:'Arq. Júnior'},
  {nome:'Diego Rocha',    cargo:'Arq. Sênior'},
  {nome:'Elena Souza',    cargo:'Estagiária'},
  {nome:'Felipe Nunes',   cargo:'Arq. Pleno'},
  {nome:'Gabriela Pires', cargo:'Arq. Sênior'},
  {nome:'Henrique Alves', cargo:'Arq. Júnior'}
];

const PF_CORES = [
  '#1A6FD4','#D4351A','#1AD435','#D4B01A',
  '#8B1AD4','#1AD4C8','#D4681A','#1A4CD4'
];

const PF_TAREFAS_DEFAULT = {
  lev:     ['Medição física','Fotos do existente','Levantamento MEP','Catalogar mobiliário','Relatório de levantamento'],
  ep1:     ['Estudo de layout','Conceito de design','Moodboard','Apresentação ao cliente'],
  ep2:     ['Desenvolvimento de layout','Detalhamento de tetos','Detalhamento de pisos','Especificações preliminares'],
  baseAP:  ['Consolidação EP2','Preparação base AP'],
  ap:      ['Planta de layout','Planta de tetos','Planta de pisos','Caderno de especificações'],
  compatAP:['Compatibilização MEP','Revisão de interferências'],
  baseEX:  ['Consolidação AP','Preparação base EX'],
  ex:      ['Planta executiva','Detalhamento de marcenaria','Detalhamento de gesso','Caderno técnico'],
  cond:    ['Acompanhamento de obra','Aprovação de amostras','Relatório de condução']
};

let _pfDados = null;
let _pfEtapaSel = null;
let _pfArqDrag = null;
let _pfCalMes = null;
let _pfEtapaDestaque = null; // etapa em destaque no calendário

function _pfInicializar() {
  if (ESTADO.planoFino) {
    _pfDados = ESTADO.planoFino;
    _pfDados.arquitetos = _pfDados.arquitetos.map((a,i) => ({
      id:a.id, nome:a.nome, cargo:a.cargo||'', cor:a.cor||PF_CORES[i%PF_CORES.length]
    }));
  } else {
    _pfDados = {
      arquitetos: PF_ARQUITETOS_DEFAULT.map((a,i) => ({
        id:'arq_'+i, nome:a.nome, cargo:a.cargo, cor:PF_CORES[i%PF_CORES.length]
      })),
      etapas: {}
    };
  }
  _pfEtapaSel = null; _pfArqDrag = null; _pfEtapaDestaque = null;
  const fase = gSt.projFases[0];
  let primeiraData = null;
  for (const id of (G.SUB_IDS||[])) {
    const sub = fase?.rows?.arq?.subs?.[id];
    if (sub?.start) { primeiraData = new Date(sub.start); break; }
  }
  const ref = primeiraData || new Date();
  _pfCalMes = { ano: ref.getFullYear(), mes: ref.getMonth() };
}

function _pfSalvar() { ESTADO.planoFino = _pfDados; salvarDados(); }

function abrirPlanoFino() {
  _pfInicializar();
  document.getElementById('pf-overlay').style.display = 'flex';
  _pfRender();
}
function fecharPlanoFino() { document.getElementById('pf-overlay').style.display='none'; }

// ── Helpers ───────────────────────────────────────────────
const _pfIni2 = nome => nome.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
const _pfFmtD = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});

// ── Render ────────────────────────────────────────────────
function _pfRender() {
  const body = document.getElementById('pf-body');
  if (!body) return;

  const subIds = G.SUB_IDS||[];
  const subNames = G.SUB_NAMES||{};
  const fase = gSt.projFases[0];

  // Mapear datas para etapas (para o calendário)
  const etapasDoDia = {};
  subIds.forEach((subId,idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return;
    const etCor = PF_CORES[idx%PF_CORES.length];
    let cur = new Date(sub.start);
    const fim = new Date(sub.end);
    while (cur <= fim) {
      if (!CALENDARIO.isNaoUtil(cur)) {
        etapasDoDia[G.fmtISO(cur)] = {cor:etCor, subId, idx};
      }
      cur = G.addD(cur,1);
    }
  });

  // ── COL 1: Arquitetos ──────────────────────────────────
  const arquitetosHTML = _pfDados.arquitetos.map((arq,i) => `
    <div class="pf-arq-card" draggable="true" ondragstart="_pfDragStart(${i},event)" ondragend="_pfDragEnd(event)"
      style="display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:7px;border:0.5px solid var(--border);cursor:grab;background:var(--bg-panel);margin-bottom:4px;transition:opacity .15s;">
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style="opacity:.3;flex-shrink:0;color:var(--txt-muted);">
        <circle cx="2" cy="2" r="1.2" fill="currentColor"/><circle cx="6" cy="2" r="1.2" fill="currentColor"/>
        <circle cx="2" cy="6" r="1.2" fill="currentColor"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/>
        <circle cx="2" cy="10" r="1.2" fill="currentColor"/><circle cx="6" cy="10" r="1.2" fill="currentColor"/>
      </svg>
      <div style="width:28px;height:28px;border-radius:50%;background:${arq.cor}22;border:1.5px solid ${arq.cor};display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:10px;font-weight:700;color:${arq.cor};flex-shrink:0;">${_pfIni2(arq.nome)}</div>
      <div style="min-width:0;">
        <div style="font-size:12px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${arq.nome}</div>
        <div style="font-size:10px;color:var(--txt-dim);">${arq.cargo||''}</div>
      </div>
    </div>`).join('');

  // Drop zone "Todas as etapas"
  const todasDropZone = `
    <div class="pf-drop-zone pf-drop-todas" ondragover="_pfDragOver(event)" ondrop="_pfDropTodas(event)" ondragleave="_pfDragLeave(event)"
      style="margin-top:10px;padding:8px 10px;border:1.5px dashed var(--accent);border-radius:7px;text-align:center;font-size:11px;color:var(--accent);cursor:pointer;transition:background .12s;">
      ↓ Alocar em<br><b>todas as etapas</b>
    </div>`;

  const col1 = `
    <div style="border-right:0.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);">Arquitetos</div>
      <div style="padding:8px 10px;flex:1;overflow-y:auto;">
        <p style="font-size:10px;color:var(--txt-dim);margin-bottom:8px;">Arraste para a etapa →</p>
        ${arquitetosHTML}
        <button onclick="_pfAddArquiteto()" style="margin-top:6px;font-size:11px;color:var(--txt-dim);background:none;border:none;cursor:pointer;padding:4px 2px;">+ novo arquiteto</button>
        ${todasDropZone}
      </div>
    </div>`;

  // ── COL 2: Etapas ──────────────────────────────────────
  let etapasHTML = '';
  subIds.forEach((subId,idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return;
    const nome = subNames[subId]||subId;
    const etDados = _pfDados.etapas[subId]||{arquitetos:[],tarefas:{}};
    const arqsNaEtapa = (etDados.arquitetos||[]).map(aid=>_pfDados.arquitetos.find(a=>a.id===aid)).filter(Boolean);
    const isSel = _pfEtapaSel === subId;
    const etCor = PF_CORES[idx%PF_CORES.length];
    const du = CALENDARIO.contarDU(new Date(sub.start), new Date(sub.end));

    // Chips de arquitetos — clique remove
    const chips = arqsNaEtapa.map(arq =>
      `<div onclick="event.stopPropagation();_pfRemArqEtapa('${subId}','${arq.id}')" title="Clique para remover ${arq.nome}"
        style="width:24px;height:24px;border-radius:50%;background:${arq.cor}22;border:1.5px solid ${arq.cor};display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:9px;font-weight:700;color:${arq.cor};cursor:pointer;flex-shrink:0;transition:opacity .12s;" onmouseover="this.style.opacity='.5'" onmouseout="this.style.opacity='1'">${_pfIni2(arq.nome)}</div>`
    ).join('');

    etapasHTML += `
      <div class="pf-drop-zone" data-subid="${subId}"
        ondragover="_pfDragOver(event)" ondrop="_pfDrop('${subId}',event)" ondragleave="_pfDragLeave(event)"
        onclick="_pfSelEtapa('${subId}')"
        style="padding:9px 12px;border-bottom:0.5px solid var(--border);cursor:pointer;
        border-left:3px solid ${isSel ? etCor : 'transparent'};
        background:${isSel ? etCor+'0D' : 'transparent'};
        transition:background .12s;min-height:52px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="min-width:85px;">
            <div style="font-family:var(--font);font-size:12px;font-weight:700;color:${isSel?etCor:'var(--txt)'};">${nome}</div>
            <div style="font-size:9px;color:var(--txt-muted);">${_pfFmtD(sub.start)}–${_pfFmtD(sub.end)}</div>
          </div>
          <div style="font-family:var(--font);font-size:11px;font-weight:700;color:${isSel?etCor:'var(--txt-muted)'};white-space:nowrap;">${du} DU</div>
          <div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap;flex:1;">
            ${chips}
            ${arqsNaEtapa.length===0
              ? `<span style="font-size:10px;color:var(--txt-dim);font-style:italic;">solte arquitetos aqui</span>`
              : ''}
          </div>
        </div>
      </div>`;
  });

  const col2 = `
    <div style="border-right:0.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;min-width:0;">
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);">Etapas</div>
      <div style="flex:1;overflow-y:auto;">${etapasHTML}</div>
    </div>`;

  // ── COL 3: Tarefas ─────────────────────────────────────
  let col3Inner = '';
  if (_pfEtapaSel) {
    const etIdx = subIds.indexOf(_pfEtapaSel);
    const etCor = PF_CORES[etIdx%PF_CORES.length];
    const nomeSel = subNames[_pfEtapaSel]||_pfEtapaSel;
    const etDados = _pfDados.etapas[_pfEtapaSel]||{arquitetos:[],tarefas:{}};
    const tarefasPadrao = PF_TAREFAS_DEFAULT[_pfEtapaSel]||[];
    const tarefasCustom = Object.keys(etDados.tarefas||{}).filter(t=>!tarefasPadrao.includes(t));

    const tarefasList = [...tarefasPadrao,...tarefasCustom].map(t => {
      const ativa = etDados.tarefas?.[t]!==false;
      return `<div onclick="_pfToggleTarefa('${_pfEtapaSel}','${t.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;
        border:0.5px solid ${ativa?etCor+'44':'var(--border)'};
        background:${ativa?etCor+'0D':'transparent'};
        margin-bottom:4px;cursor:pointer;transition:all .12s;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${ativa?etCor:'var(--txt-dim)'}">
          ${ativa
            ? `<rect x="1" y="1" width="12" height="12" rx="2" stroke-width="1.5" fill="${etCor}22"/><path d="M3.5 7l2.5 2.5 4.5-4.5" stroke-width="1.5" stroke-linecap="round"/>`
            : '<rect x="1" y="1" width="12" height="12" rx="2" stroke-width="1.5"/>'}
        </svg>
        <span style="font-size:12px;color:${ativa?'var(--txt)':'var(--txt-muted)'};">${t}</span>
      </div>`;
    }).join('');

    col3Inner = `
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${etCor};background:${etCor}0A;border-bottom:0.5px solid var(--border);">${nomeSel} · tarefas</div>
      <div style="padding:10px 12px;flex:1;overflow-y:auto;">
        ${tarefasList}
        <div style="margin-top:8px;border-top:0.5px solid var(--border);padding-top:8px;display:flex;gap:6px;">
          <input id="pf-nova-tarefa" type="text" placeholder="Nova tarefa..." onkeydown="if(event.key==='Enter')_pfAddTarefa()"
            style="flex:1;height:30px;padding:0 10px;border:0.5px solid var(--border);border-radius:6px;background:var(--bg-surface);color:var(--txt);font-size:11px;outline:none;">
          <button onclick="_pfAddTarefa()" style="height:30px;padding:0 12px;background:var(--accent);border:none;border-radius:6px;font-family:var(--font);font-size:9px;font-weight:700;color:#0D1117;cursor:pointer;">Ok</button>
        </div>
      </div>`;
  } else {
    col3Inner = `
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);">Tarefas</div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;">
        <p style="font-size:12px;color:var(--txt-dim);line-height:1.6;">Selecione uma etapa<br>para ver as tarefas</p>
      </div>`;
  }

  const col3 = `
    <div style="border-right:0.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;">
      ${col3Inner}
      <div style="padding:10px 12px;border-top:0.5px solid var(--border);flex-shrink:0;">
        <button onclick="_pfResumo()" style="width:100%;height:30px;background:var(--bg-surface2);border:0.5px solid var(--border-md);border-radius:6px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--txt-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="1" width="12" height="14" rx="1"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>
          Resumo para impressão
        </button>
      </div>
    </div>`;

  // ── COL 4: Calendário (2 meses) ────────────────────────
  const hoje = new Date();

  const renderMes = (ano, mes) => {
    const nomeMes = new Date(ano,mes,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
    const primeiroDia = new Date(ano,mes,1).getDay();
    const ultimoDia = new Date(ano,mes+1,0).getDate();
    const total = Math.ceil((primeiroDia+ultimoDia)/7)*7;
    let cells=''; let dia=1;

    for (let cel=0; cel<total; cel++) {
      if (cel%7===0) cells+='<tr>';
      const dow = cel%7;
      const fds = dow===0||dow===6;
      if (cel<primeiroDia||dia>ultimoDia) {
        cells+=`<td style="padding:1px;height:22px;"></td>`;
      } else {
        const d2 = new Date(ano,mes,dia);
        const iso = G.fmtISO(d2);
        const etInfo = etapasDoDia[iso];
        const isHoje = d2.toDateString()===hoje.toDateString();
        const isDestaque = _pfEtapaDestaque && etInfo?.subId===_pfEtapaDestaque;
        const isDim = _pfEtapaDestaque && etInfo && !isDestaque;

        if (etInfo) {
          cells+=`<td style="padding:1px;height:22px;"><div style="background:${etInfo.cor};border-radius:3px;color:white;font-size:9px;font-weight:600;text-align:center;padding:2px 0;opacity:${isDim?.25:1};${isDestaque?'outline:2px solid white;':''}${isHoje?'outline:2px solid var(--accent);':''}">${dia}</div></td>`;
        } else {
          cells+=`<td style="padding:1px;height:22px;text-align:center;font-size:9px;color:${fds?'var(--txt-dim)':'var(--txt)'};opacity:${fds?.35:1};${isHoje?'font-weight:700;color:var(--accent);':''}">${dia}</td>`;
        }
        dia++;
      }
      if (cel%7===6) cells+='</tr>';
    }

    return `<div style="margin-bottom:12px;">
      <div style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);margin-bottom:6px;text-transform:capitalize;">${nomeMes}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <thead><tr>
          ${'DSTQQSS'.split('').map((d,i)=>`<th style="padding:2px 0;text-align:center;font-size:9px;font-weight:500;color:${i===0||i===6?'var(--txt-dim)':'var(--txt-muted)'};">${d}</th>`).join('')}
        </tr></thead>
        <tbody>${cells}</tbody>
      </table>
    </div>`;
  };

  let {ano,mes} = _pfCalMes;
  let ano2=ano, mes2=mes+1;
  if (mes2>11) {mes2=0; ano2++;}

  // Legenda clicável
  const legenda = subIds.map((subId,idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return '';
    const etCor = PF_CORES[idx%PF_CORES.length];
    const isAtivo = _pfEtapaDestaque===subId;
    return `<div onclick="_pfToggleDestaque('${subId}')" style="display:flex;align-items:center;gap:5px;margin-bottom:4px;cursor:pointer;padding:2px 4px;border-radius:4px;background:${isAtivo?etCor+'18':'transparent'};border:0.5px solid ${isAtivo?etCor:'transparent'};">
      <div style="width:10px;height:10px;border-radius:2px;background:${etCor};flex-shrink:0;"></div>
      <span style="font-size:10px;color:${isAtivo?etCor:'var(--txt-muted)'};">${subNames[subId]||subId}</span>
    </div>`;
  }).join('');

  const col4 = `
    <div style="display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span>Calendário</span>
        <div style="display:flex;gap:4px;">
          <button onclick="_pfCalNav(-1)" style="width:20px;height:20px;background:var(--bg-surface2);border:0.5px solid var(--border);border-radius:4px;cursor:pointer;font-size:12px;color:var(--txt-muted);padding:0;">‹</button>
          <button onclick="_pfCalNav(1)" style="width:20px;height:20px;background:var(--bg-surface2);border:0.5px solid var(--border);border-radius:4px;cursor:pointer;font-size:12px;color:var(--txt-muted);padding:0;">›</button>
        </div>
      </div>
      <div style="padding:10px 12px;flex:1;overflow-y:auto;">
        ${renderMes(ano,mes)}
        ${renderMes(ano2,mes2)}
        <div style="padding-top:8px;border-top:0.5px solid var(--border);">
          <p style="font-size:10px;color:var(--txt-dim);margin-bottom:6px;">Clique para destacar</p>
          ${legenda}
        </div>
      </div>
    </div>`;

  body.innerHTML = `<div style="display:grid;grid-template-columns:175px 260px 190px 1fr;height:100%;min-height:0;">${col1}${col2}${col3}${col4}</div>`;
}

// ── Drag & Drop ───────────────────────────────────────────
function _pfDragStart(i,e){_pfArqDrag=i;e.dataTransfer.effectAllowed='copy';e.currentTarget.style.opacity='.35';}
function _pfDragEnd(e){e.currentTarget.style.opacity='1';_pfArqDrag=null;}
function _pfDragOver(e){e.preventDefault();e.currentTarget.style.background='rgba(0,222,219,.08)';e.currentTarget.style.borderColor='var(--accent)';}
function _pfDragLeave(e){e.currentTarget.style.background='';e.currentTarget.style.borderColor='';}

function _pfDrop(subId,e){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.style.background='';e.currentTarget.style.borderColor='';
  if(_pfArqDrag===null)return;
  const arq=_pfDados.arquitetos[_pfArqDrag];if(!arq)return;
  if(!_pfDados.etapas[subId])_pfDados.etapas[subId]={arquitetos:[],tarefas:{}};
  if(!_pfDados.etapas[subId].arquitetos.includes(arq.id)){
    _pfDados.etapas[subId].arquitetos.push(arq.id);
    _pfSalvar();
  }
  _pfSelEtapa(subId);
}

function _pfDropTodas(e){
  e.preventDefault();e.stopPropagation();
  e.currentTarget.style.background='';e.currentTarget.style.borderColor='';
  if(_pfArqDrag===null)return;
  const arq=_pfDados.arquitetos[_pfArqDrag];if(!arq)return;
  const subIds=G.SUB_IDS||[];
  const fase=gSt.projFases[0];
  subIds.forEach(subId=>{
    const sub=fase?.rows?.arq?.subs?.[subId];if(!sub)return;
    if(!_pfDados.etapas[subId])_pfDados.etapas[subId]={arquitetos:[],tarefas:{}};
    if(!_pfDados.etapas[subId].arquitetos.includes(arq.id))
      _pfDados.etapas[subId].arquitetos.push(arq.id);
  });
  _pfSalvar();_pfRender();
  showToast(arq.nome+' alocado em todas as etapas');
}

// ── Ações ─────────────────────────────────────────────────
function _pfSelEtapa(subId){
  _pfEtapaSel=subId;
  if(!_pfDados.etapas[subId])_pfDados.etapas[subId]={arquitetos:[],tarefas:{}};
  const tp=PF_TAREFAS_DEFAULT[subId]||[];
  tp.forEach(t=>{if(_pfDados.etapas[subId].tarefas[t]===undefined)_pfDados.etapas[subId].tarefas[t]=true;});
  _pfRender();
}

function _pfRemArqEtapa(subId,arqId){
  if(!_pfDados.etapas[subId])return;
  _pfDados.etapas[subId].arquitetos=_pfDados.etapas[subId].arquitetos.filter(id=>id!==arqId);
  _pfSalvar();_pfRender();
}

function _pfToggleTarefa(subId,tarefa){
  if(!_pfDados.etapas[subId])return;
  _pfDados.etapas[subId].tarefas[tarefa]=!_pfDados.etapas[subId].tarefas[tarefa];
  _pfSalvar();_pfRender();
}

function _pfAddTarefa(){
  if(!_pfEtapaSel)return;
  const inp=document.getElementById('pf-nova-tarefa');
  const val=inp?.value.trim();if(!val)return;
  if(!_pfDados.etapas[_pfEtapaSel])_pfDados.etapas[_pfEtapaSel]={arquitetos:[],tarefas:{}};
  _pfDados.etapas[_pfEtapaSel].tarefas[val]=true;
  inp.value='';_pfSalvar();_pfRender();
}

function _pfAddArquiteto(){
  const nome=prompt('Nome completo:');if(!nome?.trim())return;
  const cargo=prompt('Cargo (ex: Arq. Pleno):')||'';
  const i=_pfDados.arquitetos.length;
  _pfDados.arquitetos.push({id:'arq_'+Date.now(),nome:nome.trim(),cargo,cor:PF_CORES[i%PF_CORES.length]});
  _pfSalvar();_pfRender();
}

function _pfCalNav(dir){
  let{ano,mes}=_pfCalMes;
  mes+=dir;
  if(mes<0){mes=11;ano--;}if(mes>11){mes=0;ano++;}
  _pfCalMes={ano,mes};_pfRender();
}

function _pfToggleDestaque(subId){
  _pfEtapaDestaque=(_pfEtapaDestaque===subId)?null:subId;
  _pfRender();
}

// ── Resumo ────────────────────────────────────────────────
function _pfResumo(){
  const subIds=G.SUB_IDS||[];const subNames=G.SUB_NAMES||{};
  const fase=gSt.projFases[0];
  const cod=ESTADO.meta?.codigo||'';const nomeProj=ESTADO.meta?.nome||'Planejamento de Obra';

  let rows='';
  subIds.forEach((subId,idx)=>{
    const sub=fase?.rows?.arq?.subs?.[subId];if(!sub)return;
    const etDados=_pfDados.etapas[subId]||{arquitetos:[],tarefas:{}};
    const arqsNaEtapa=(etDados.arquitetos||[]).map(aid=>_pfDados.arquitetos.find(a=>a.id===aid)).filter(Boolean);
    const tarefasAtivas=Object.entries(etDados.tarefas||{}).filter(([,v])=>v).map(([k])=>k);
    const du=CALENDARIO.contarDU(new Date(sub.start),new Date(sub.end));
    const etCor=PF_CORES[idx%PF_CORES.length];
    rows+=`<tr style="border-bottom:1px solid #E8ECF0;">
      <td style="padding:8px 10px;vertical-align:top;">
        <div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:700;color:${etCor};">${subNames[subId]||subId}</div>
        <div style="font-size:10px;color:#6A7585;">${_pfFmtD(sub.start)} – ${_pfFmtD(sub.end)} · ${du} DU</div>
      </td>
      <td style="padding:8px 10px;vertical-align:top;">
        ${arqsNaEtapa.map(a=>`<div style="font-size:11px;color:#1A2535;margin-bottom:2px;">${a.nome}</div>`).join('')||'<span style="color:#9AA0AF;font-size:11px;">—</span>'}
      </td>
      <td style="padding:8px 10px;vertical-align:top;">
        ${tarefasAtivas.map(t=>`<div style="font-size:11px;color:#1A2535;margin-bottom:2px;">• ${t}</div>`).join('')||'<span style="color:#9AA0AF;font-size:11px;">—</span>'}
      </td>
    </tr>`;
  });

  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9950;display:flex;align-items:center;justify-content:center;padding:20px;';
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
  d.innerHTML=`<div style="background:#fff;border-radius:10px;width:100%;max-width:820px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
    <div style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #E8ECF0;background:#1A2535;">
      <span style="font-family:Oswald,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);flex:1;">Plano Fino · Arquitetura</span>
      <span style="font-family:Oswald,sans-serif;font-size:13px;font-weight:700;color:#00DEDB;">${cod?cod+' — ':''}${nomeProj}</span>
      <button onclick="this.closest('[style*=fixed]').remove()" style="width:28px;height:28px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:5px;cursor:pointer;font-size:13px;color:rgba(255,255,255,.6);margin-left:14px;">✕</button>
    </div>
    <div style="flex:1;overflow:auto;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#F4F6F8;">
          <th style="padding:8px 10px;text-align:left;font-family:Oswald,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;border-bottom:1px solid #E8ECF0;width:160px;">Etapa</th>
          <th style="padding:8px 10px;text-align:left;font-family:Oswald,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;border-bottom:1px solid #E8ECF0;width:170px;">Responsáveis</th>
          <th style="padding:8px 10px;text-align:left;font-family:Oswald,sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#8A95A8;border-bottom:1px solid #E8ECF0;">Tarefas</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #E8ECF0;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:11px;color:#9AA0AF;">Gerado em ${new Date().toLocaleDateString('pt-BR')}</span>
      <div style="display:flex;gap:8px;">
        <button onclick="this.closest('[style*=fixed]').remove()" style="height:32px;padding:0 16px;background:#F4F6F8;border:1px solid #D8DCE4;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#5A6275;cursor:pointer;">Fechar</button>
        <button onclick="window.print()" style="height:32px;padding:0 20px;background:#00DEDB;border:none;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#0D1117;cursor:pointer;">🖨 Imprimir A4</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(d);
}
function getAprovaConfig(subId){var cfg=ESTADO.cfg&&ESTADO.cfg.aprovaCliente&&ESTADO.cfg.aprovaCliente[subId];var def=_ativListas.arq.find(function(a){return a.id===subId;});return{ativo:cfg?cfg.ativo:(def?(def.aprovaCliente||false):false),dias:cfg?cfg.dias:(def?(def.diasAprova||1):1)};}
function setAprovaConfig(subId,ativo,dias){if(!ESTADO.cfg.aprovaCliente)ESTADO.cfg.aprovaCliente={};ESTADO.cfg.aprovaCliente[subId]={ativo:ativo,dias:dias};}
function getDiasAprovacao(subId){var fase=gSt.projFases[0];if(!fase)return[];var sub=fase.rows.arq.subs[subId];if(!sub)return[];var cfg=getAprovaConfig(subId);if(!cfg.ativo||cfg.dias<=0)return[];var result=[];var cur=new Date(sub.end.getFullYear(),sub.end.getMonth(),sub.end.getDate());while(result.length<cfg.dias){if(!CALENDARIO.isNaoUtil(cur)){result.unshift(G.fmtISO(cur));}if(result.length<cfg.dias){cur=G.addD(cur,-1);if(G.ms(cur)<G.ms(sub.start))break;}else break;}return result;}
function onAprovaChange(faseIdx,subId){var chk=document.getElementById('proj-f'+faseIdx+'-aprova-'+subId);var inp=document.getElementById('proj-f'+faseIdx+'-aprova-dias-'+subId);if(!chk||!inp)return;inp.disabled=!chk.checked;setAprovaConfig(subId,chk.checked,Math.max(1,parseInt(inp.value)||1));onCfgChange();gRender();}
function gPopAprovaChange(subId){var chk=document.getElementById('pop-aprova-chk');var inp=document.getElementById('pop-aprova-dias');if(!chk||!inp)return;inp.disabled=!chk.checked;setAprovaConfig(subId,chk.checked,Math.max(1,parseInt(inp.value)||1));gRender();}
function gBuildAprovaHtml(t){
  if(!t||!t.subId||t.rowId!=="arq")return "";
  var ac=getAprovaConfig(t.subId);
  var sid=t.subId;
  var chkd=ac.ativo?" checked":"";
  var dis=ac.ativo?"":"disabled";
  var el=document.createElement("div");
  el.setAttribute("data-aprova-sid",sid);
  el.style.cssText="margin-top:12px;border-top:1px solid #EEF0F4;padding-top:12px;";
  var _sc = ESTADO.cfg && ESTADO.cfg.aprovaStarColor ? ESTADO.cfg.aprovaStarColor : "#FFD600";
  var _bc = ESTADO.cfg && ESTADO.cfg.aprovaBgColor ? ESTADO.cfg.aprovaBgColor : "#e60a20";
  el.innerHTML=[
    "<div style=\"font-size:9px;font-weight:700;text-transform:uppercase;color:#D4A017;margin-bottom:6px;\">★ Aprovação do Cliente</div>",
    "<label style=\"display:flex;align-items:center;gap:7px;margin-bottom:7px;\">",
    "<input type=\"checkbox\" id=\"pop-aprova-chk\""+chkd+" onchange=\"gPopAprovaChange(this.parentElement.parentElement.dataset.aprovaSid)\" style=\"accent-color:#D4A017;width:13px;height:13px;cursor:pointer;\">",
    "<span style=\"font-size:12px;color:#3A4A5A;\">Requer aprovação do cliente</span></label>",
    "<label style=\"display:flex;align-items:center;gap:7px;\">",
    "<span style=\"font-size:11px;font-weight:700;color:#8A95A8;width:36px;\">Dias</span>",
    "<input type=\"number\" id=\"pop-aprova-dias\" value=\""+ac.dias+"\" min=\"1\" max=\"10\" onchange=\"gPopAprovaChange(this.parentElement.parentElement.dataset.aprovaSid)\" style=\"width:50px;padding:4px 6px;border:1px solid #C8CDD8;border-radius:4px;font-size:13px;text-align:center;\" "+dis+">",
    "</label>",
    "<div style=\"margin-top:10px;border-top:1px solid #EEF0F4;padding-top:10px;display:flex;flex-direction:column;gap:7px;\">",
    "<div style=\"font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;margin-bottom:2px;\">Aparência da marcação</div>",
    "<label style=\"display:flex;align-items:center;gap:8px;\">",
    "<span style=\"font-size:11px;color:#5A6A7A;min-width:60px;\">Fundo</span>",
    "<input type=\"color\" id=\"pop-aprova-bg\" value=\""+ (_bc==='transparent'?'#e60a20':_bc) +"\" oninput=\"if(!ESTADO.cfg)ESTADO.cfg={};ESTADO.cfg.aprovaBgColor=this.value;document.getElementById('pop-aprova-bg-transp').checked=false;salvarDados();gRender()\" style=\"width:32px;height:24px;border:1px solid #C8CDD8;border-radius:4px;padding:1px;cursor:pointer;\">",
    "<label style=\"display:flex;align-items:center;gap:4px;font-size:10px;color:#8A95A8;cursor:pointer;\">",
    "<input type=\"checkbox\" id=\"pop-aprova-bg-transp\" "+(_bc==='transparent'?' checked':'')+"\" onchange=\"if(!ESTADO.cfg)ESTADO.cfg={};ESTADO.cfg.aprovaBgColor=this.checked?'transparent':document.getElementById('pop-aprova-bg').value;salvarDados();gRender()\" style=\"accent-color:#009EA8;cursor:pointer;\">",
    "transparente</label>",
    "</label>",
    "<label style=\"display:flex;align-items:center;gap:8px;\">",
    "<span style=\"font-size:11px;color:#5A6A7A;min-width:60px;\">Estrela ★</span>",
    "<input type=\"color\" id=\"pop-aprova-star\" value=\""+_sc+"\" oninput=\"if(!ESTADO.cfg)ESTADO.cfg={};ESTADO.cfg.aprovaStarColor=this.value;salvarDados();gRender()\" style=\"width:32px;height:24px;border:1px solid #C8CDD8;border-radius:4px;padding:1px;cursor:pointer;\">",
    "</label>",
    "<div style=\"display:flex;align-items:center;gap:8px;\">",
    "<span style=\"font-size:11px;color:#5A6A7A;min-width:60px;\">Preview</span>",
    "<div id=\"pop-aprova-preview\" style=\"width:28px;height:18px;border-radius:3px;border:1px solid #C8CDD8;display:flex;align-items:center;justify-content:center;background:"+_bc+"\">",
    "<span style=\"font-size:12px;color:"+_sc+"\">★</span></div>",
    "</div>",
    "</div>"
  ].join("");
  var tmp=document.createElement("div");
  tmp.appendChild(el);
  return tmp.innerHTML;
}
const PREOBRA_TEMPLATES_DEFAULT = [
  {id:'pre-obra-padrao',label:'🏗 Pré-Obra Padrão',desc:'Template padrão A|W',disciplinas:[
    {id:'demolicoes',label:'Demolições e Desmontagens',ativo:true,tasks:[{n:'Desmontagem de divisórias',prof:4},{n:'Demolição de alvenaria',prof:3},{n:'Remoção de revestimentos',prof:3},{n:'Descarte e limpeza',prof:2}]},
    {id:'canteiro',label:'Montagem de Canteiro e Almoxarifado',ativo:true,tasks:[{n:'Delimitação do canteiro',prof:2},{n:'Montagem de almoxarifado',prof:3},{n:'Instalação de tapumes',prof:2},{n:'Organização de fluxo',prof:1}]},
    {id:'comunicacao-visual',label:'Comunicação Visual de Obra',ativo:true,tasks:[{n:'Projeto de sinalização',prof:1},{n:'Instalação de banners',prof:2},{n:'Placas de segurança',prof:1},{n:'Proteção de áreas comuns',prof:2}]},
    {id:'piso-elevado',label:'Montagem de Piso Elevado',ativo:true,tasks:[{n:'Nivelamento do substrato',prof:3},{n:'Instalação de pedestais',prof:4},{n:'Assentamento das placas',prof:4},{n:'Inspeção e ajustes',prof:2}]}
  ]}
];
function _preObraGetTodos(){var custom=_preObraCarregarCustom();return PREOBRA_TEMPLATES_DEFAULT.concat(custom);}
function _preObraCarregarCustom(){try{var r=localStorage.getItem('aw_preobra_templates');return r?JSON.parse(r):[];}catch{return[];}}
function _preObraSalvarCustom(arr){try{localStorage.setItem('aw_preobra_templates',JSON.stringify(arr));}catch{}}
function _preObraGetTemplate(templateId){var todos=_preObraGetTodos();var tpl=todos.find(function(t){return t.id===templateId;});if(!tpl)return null;return JSON.parse(JSON.stringify(tpl));}
function _preObraMakeDiscs(templateId){
  var tpl=_preObraGetTemplate(templateId||'pre-obra-padrao');
  if(!tpl)return[];
  return tpl.disciplinas.filter(function(d){return d.ativo!==false;}).map(function(d){
    return {
      id:d.id,
      label:d.label,
      ativo:true,
      tasks:d.tasks.map(function(t){return{n:t.n,prep:false,prof:t.prof||2,m:{1:100}};})
    };
  });
}
function _preObraToggle(faseIdx,ativo){if(!ESTADO.cfg.obraFases[faseIdx])return;if(!ESTADO.cfg.obraFases[faseIdx].preObra)ESTADO.cfg.obraFases[faseIdx].preObra={ativo:false,templateId:'pre-obra-padrao',du:5};ESTADO.cfg.obraFases[faseIdx].preObra.ativo=ativo;onCfgChange();renderObraFases();gRender();}
window._poSetPrep = function(sel) {
  var fi = parseInt(sel.dataset.fi), di = parseInt(sel.dataset.di), ti = parseInt(sel.dataset.ti);
  ESTADO.preObraCustom[fi].disciplinas[di].tasks[ti].prep = (sel.value === 'PREP');
  onCfgChange();
};

// ═══════════════════════════════════════════════════════════
//  EQUIPE ARQ — dados e lógica do seletor no Config
// ═══════════════════════════════════════════════════════════

var EQUIPE_DB = {
  "Pedro Coivo": {
    gerentes: [
      { nome: "Paula Torres", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Andre Milhomens",     cargo: "Arquiteto" },
          { nome: "Caroline Rodrigues",  cargo: "Arquiteto" },
          { nome: "Gabriela Pugliese",   cargo: "Arquiteto" },
          { nome: "Ana Rodrigues",       cargo: "Arquiteto" },
          { nome: "Alice Souza",         cargo: "Arquiteto" }
        ]
      },
      { nome: "Ana Pollizello", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Rafaela Justo",       cargo: "Arquiteto" },
          { nome: "Thiago Oliveira",     cargo: "Arquiteto" },
          { nome: "Emilio Bertolini",    cargo: "Arquiteto" },
          { nome: "Franciela Gehrke",    cargo: "Arquiteto" },
          { nome: "Carolina Plascak",    cargo: "Arquiteto" },
          { nome: "Caroline Guerrero",   cargo: "Arquiteto" }
        ]
      }
    ]
  },
  "Daniel Ingarano": {
    gerentes: [
      { nome: "Nathalia Gomes", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Sergio Sampaio",  cargo: "Arquiteto" },
          { nome: "Aline Leal",      cargo: "Arquiteto" }
        ]
      },
      { nome: "Tais Neiva", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Rafaella Silva",   cargo: "Arquiteto" },
          { nome: "Vinicius Bressan", cargo: "Arquiteto" }
        ]
      }
    ]
  },
  "Virginia Nehmi": {
    gerentes: [
      { nome: "Giulia Previato", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Itamara Lima",    cargo: "Arquiteto" },
          { nome: "Leo Teruo",       cargo: "Arquiteto" }
        ]
      },
      { nome: "Priscila Pary", cargo: "Gerente de Arquitetura",
        arquitetos: [
          { nome: "Sabryna Ribeiro",  cargo: "Arquiteto" },
          { nome: "Guilherme Fazano", cargo: "Arquiteto" },
          { nome: "Kazuo Daido",      cargo: "Arquiteto" }
        ]
      }
    ]
  }
};

// Chip visual reutilizável
function _equipeChip(nome, role, sel, onclick) {
  var bg  = sel ? 'var(--accent)'  : 'var(--bg-surface2)';
  var clr = sel ? '#0D1117'        : 'var(--txt-muted)';
  var brd = sel ? 'var(--accent)'  : 'var(--border)';
  return '<button onclick="'+onclick+'" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:20px;border:1px solid '+brd+';background:'+bg+';color:'+clr+';font-size:11px;font-weight:700;font-family:var(--font);cursor:pointer;transition:all .15s;">'
    + nome
    + (role ? '<span style="font-size:9px;font-weight:400;opacity:.7;">'+role+'</span>' : '')
    + '</button>';
}

window.equipeOnDiretor = function() {
  if (!ESTADO.cfg) ESTADO.cfg = {};
  if (!ESTADO.cfg.equipeARQ) ESTADO.cfg.equipeARQ = {diretor:'', gerentes:[], arquitetos:[]};
  var dir = document.getElementById('equipe-diretor').value;
  ESTADO.cfg.equipeARQ.diretor  = dir;
  ESTADO.cfg.equipeARQ.gerentes = [];
  ESTADO.cfg.equipeARQ.arquitetos = [];
  equipeRenderGerentes();
  onCfgChange(); salvarDados();
};

window.equipeToggleGerente = function(nome) {
  var ea = ESTADO.cfg.equipeARQ;
  var idx = ea.gerentes.indexOf(nome);
  if (idx >= 0) ea.gerentes.splice(idx, 1);
  else          ea.gerentes.push(nome);
  ea.arquitetos = []; // reset arquitetos ao mudar gerentes
  equipeRenderGerentes();
  onCfgChange(); salvarDados();
};

window.equipeToggleArq = function(nome) {
  var ea = ESTADO.cfg.equipeARQ;
  var idx = ea.arquitetos.indexOf(nome);
  if (idx >= 0) ea.arquitetos.splice(idx, 1);
  else          ea.arquitetos.push(nome);
  equipeRenderArqs();
  onCfgChange(); salvarDados();
};

function equipeRenderGerentes() {
  var ea  = ESTADO.cfg.equipeARQ || {};
  var dir = ea.diretor || '';
  var gWrap = document.getElementById('equipe-gerentes-wrap');
  var gLista = document.getElementById('equipe-gerentes-lista');
  if (!gWrap || !gLista) return;

  if (!dir || !EQUIPE_DB[dir]) { gWrap.style.display = 'none'; equipeRenderArqs(); return; }
  gWrap.style.display = '';
  var gerentes = EQUIPE_DB[dir].gerentes;
  gLista.innerHTML = gerentes.map(function(g) {
    var sel = (ea.gerentes || []).indexOf(g.nome) >= 0;
    return _equipeChip(g.nome, 'GA', sel, "equipeToggleGerente('"+g.nome+"')");
  }).join('');
  equipeRenderArqs();
}

function equipeRenderArqs() {
  var ea  = ESTADO.cfg.equipeARQ || {};
  var dir = ea.diretor || '';
  var aWrap  = document.getElementById('equipe-arqs-wrap');
  var aLista = document.getElementById('equipe-arqs-lista');
  var resumo = document.getElementById('equipe-resumo');
  var resumoBody = document.getElementById('equipe-resumo-body');
  if (!aWrap || !aLista) return;

  var gerSel = ea.gerentes || [];
  if (!dir || !EQUIPE_DB[dir] || gerSel.length === 0) {
    aWrap.style.display = 'none';
    return;
  }
  aWrap.style.display = '';

  // Montar lista de arquitetos dos gerentes selecionados
  var todosArqs = [];
  EQUIPE_DB[dir].gerentes.forEach(function(g) {
    if (gerSel.indexOf(g.nome) < 0) return;
    g.arquitetos.forEach(function(a) { todosArqs.push({...a, gerente: g.nome}); });
  });

  aLista.innerHTML = todosArqs.map(function(a) {
    var sel = (ea.arquitetos || []).indexOf(a.nome) >= 0;
    return _equipeChip(a.nome, a.cargo, sel, "equipeToggleArq('"+a.nome+"')");
  }).join('');

  // Resumo
  var arqSel = ea.arquitetos || [];
  if (arqSel.length > 0 && resumo && resumoBody) {
    resumo.style.display = '';
    resumoBody.innerHTML =
      '<div><strong style="color:var(--txt);">'+dir+'</strong> · Dir. Arquitetura</div>'
      + gerSel.map(function(g) {
          var arqDoG = todosArqs.filter(function(a){ return a.gerente===g && arqSel.indexOf(a.nome)>=0; });
          if (!arqDoG.length) return '';
          return '<div style="margin-top:4px;"><strong style="color:var(--txt);">'+g+'</strong> (GA)'
            + '<div style="margin-left:12px;color:var(--txt-dim);">'
            + arqDoG.map(function(a){return '· '+a.nome+' <span style="font-size:10px;">('+a.cargo+')</span>';}).join('<br>')
            + '</div></div>';
        }).join('')
      + '<div style="margin-top:6px;font-size:11px;color:var(--accent);font-weight:700;">'+arqSel.length+' arquiteto(s) selecionado(s)</div>';
  } else if (resumo) {
    resumo.style.display = 'none';
  }
}

// Carregar estado salvo ao abrir o Config
var _equipeOrigCfgCarregar = window.cfgCarregar;
window.cfgCarregar = function() {
  if (typeof _equipeOrigCfgCarregar === 'function') _equipeOrigCfgCarregar();
  setTimeout(function() {
    var ea = ESTADO.cfg && ESTADO.cfg.equipeARQ;
    if (!ea) return;
    var sel = document.getElementById('equipe-diretor');
    if (sel && ea.diretor) { sel.value = ea.diretor; equipeRenderGerentes(); }
  }, 50);
};

// ── Modal Gestão ARQ ─────────────────────────────────────────────────────────
window.abrirPlanoFino = function() {
  var modal = document.getElementById('modal-gestao-arq');
  var iframe = document.getElementById('iframe-gestao-arq');
  if (!modal || !iframe) return;

  // Serializar ctx das etapas
  try {
    var etapas = [];
    (gSt.projFases || []).forEach(function(fase) {
      var subs = fase.rows && fase.rows.arq && fase.rows.arq.subs || {};
      G.SUB_IDS.forEach(function(id) {
        var s = subs[id]; if (!s) return;
        etapas.push({
          id: id, label: G.SUB_NAMES[id] || id,
          faseId: fase.id, faseNome: fase.nome || ('F' + fase.id),
          start: G.fmtISO(s.start instanceof Date ? s.start : G.parseD(s.start)),
          end:   G.fmtISO(s.end   instanceof Date ? s.end   : G.parseD(s.end))
        });
      });
    });
    // Adiciona etapas técnicas ao CTX
    var etapasTec = [];
    (gSt.projFases || []).forEach(function(fase) {
      var tecSubs = fase.rows && fase.rows.tec && fase.rows.tec.subs || {};
      G.TEC_IDS.forEach(function(id) {
        var t = tecSubs[id]; if (!t) return;
        etapasTec.push({
          id: 'tec_' + id, label: G.TEC_NAMES ? (G.TEC_NAMES[id] || id) : id,
          tipo: 'tec', faseId: fase.id,
          start: G.fmtISO(t.start instanceof Date ? t.start : G.parseD(t.start)),
          end:   G.fmtISO(t.end   instanceof Date ? t.end   : G.parseD(t.end))
        });
      });
    });
    // Adiciona fases de obra (totalizador: pré-obra + obra)
    var etapasObra = [];
    (gSt.obraFases || []).forEach(function(of, fi) {
      var obraStart = null, obraEnd = null;
      // Pré-obra
      var poCfg = ESTADO.cfg && ESTADO.cfg.obraFases && ESTADO.cfg.obraFases[fi] && ESTADO.cfg.obraFases[fi].preObra;
      if (poCfg && poCfg.ativo) {
        var poDu = poCfg.du || 5;
        var obraIni = of.obra && (of.obra.start instanceof Date ? of.obra.start : G.parseD(of.obra.start));
        if (obraIni) {
          var poEnd = new Date(obraIni); poEnd.setDate(poEnd.getDate() - 1);
          var cur = new Date(poEnd), cnt = 0;
          while (cnt < poDu) { cur.setDate(cur.getDate() - 1); if (!CALENDARIO.isNaoUtil(cur)) cnt++; }
          obraStart = G.fmtISO(cur);
        }
      }
      if (of.obra) {
        var os = of.obra.start instanceof Date ? of.obra.start : G.parseD(of.obra.start);
        var oe = of.obra.end   instanceof Date ? of.obra.end   : G.parseD(of.obra.end);
        if (!obraStart) obraStart = G.fmtISO(os);
        obraEnd = G.fmtISO(oe);
      }
      if (obraStart && obraEnd) {
        var _obraS = G.fmtISO(of.obra.start instanceof Date ? of.obra.start : G.parseD(of.obra.start));
        var _obraE = G.fmtISO(of.obra.end   instanceof Date ? of.obra.end   : G.parseD(of.obra.end));
        etapasObra.push({
          id: 'obra_' + fi, label: 'Obra' + (gSt.obraFases.length > 1 ? ' F' + (fi+1) : ''),
          tipo: 'obra', faseId: fi,
          start: obraStart, end: obraEnd,
          obraStart: _obraS, obraEnd: _obraE,
          poStart: (obraStart !== _obraS) ? obraStart : null,
          poEnd:   (obraStart !== _obraS) ? G.fmtISO(G.addD(G.parseD(_obraS), -1)) : null
        });
      }
    });
    var andares = (typeof CFG_ANDARES !== 'undefined' && CFG_ANDARES) ||
                  (ESTADO.cfg && ESTADO.cfg.andares) || [];
    var etapasAtivas = {};
    (ESTADO.cfg.projFases || []).forEach(function(f) {
      Object.keys(f.etapas || {}).forEach(function(k) { if(f.etapas[k]) etapasAtivas[k] = true; });
    });
    sessionStorage.setItem('aw_gestao_ctx', JSON.stringify({
      andares: andares, etapas: etapas, etapasTec: etapasTec,
      etapasObra: etapasObra, etapasAtivas: etapasAtivas
    }));
  } catch(e) {}

  // Salvar estado no sessionStorage (compartilhado com iframe mesma origem)
  try {
    sessionStorage.setItem('aw_estado_atual', JSON.stringify({ts: Date.now(), estado: ESTADO}));
  } catch(e) {}

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  iframe.src = 'gestao-arq.html?_=' + Date.now();
};

window.fecharGestaoArq = function(salvar) {
  var modal = document.getElementById('modal-gestao-arq');
  var iframe = document.getElementById('iframe-gestao-arq');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';

  // Sempre reler o estado que o iframe gravou no sessionStorage e mesclar no ESTADO do pai,
  // e salvar no Supabase — antes de destruir o iframe (que cancelaria fetches pendentes).
  try {
    var raw = sessionStorage.getItem('aw_estado_atual');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed.estado && parsed.estado.cfg && parsed.estado.cfg.equipeARQ) {
        ESTADO.cfg.equipeARQ = parsed.estado.cfg.equipeARQ;
        window.__AW_ESTADO = ESTADO;
        // Sempre salvar no Supabase (não só quando salvar=true)
        salvarDados();
        if (salvar) showToast('Gestão de arquitetura salva ✓');
        // Re-renderizar a seleção da equipe na UI do Config
        if (typeof equipeRenderGerentes === 'function') {
          var selDir = document.getElementById('equipe-diretor');
          if (selDir && ESTADO.cfg.equipeARQ.diretor) selDir.value = ESTADO.cfg.equipeARQ.diretor;
          equipeRenderGerentes();
        }
      }
    }
  } catch(e) {}

  // Destrói o iframe depois de capturar o estado
  if (iframe) iframe.src = '';
};

// Salvar estado antes de fechar/recarregar a página (F5, fechar aba, etc.)
window.addEventListener('beforeunload', function() {
  // Tenta mesclar o estado do iframe (se estiver aberto) antes de sair
  try {
    var raw = sessionStorage.getItem('aw_estado_atual');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed.estado && parsed.estado.cfg && parsed.estado.cfg.equipeARQ) {
        ESTADO.cfg.equipeARQ = parsed.estado.cfg.equipeARQ;
      }
    }
  } catch(e) {}
  // Força salvamento síncrono via sendBeacon (não é cancelado pelo unload)
  try {
    if (_CRONO_ID) {
      var payload = {ts: Date.now(), estado: ESTADO};
      var payloadStr = JSON.stringify(payload);
      sessionStorage.setItem('aw_estado_atual', payloadStr);
      // fetch com keepalive:true não é cancelado pelo beforeunload
      fetch(SB_URL + '/rest/v1/cronogramas?id=eq.' + _CRONO_ID, {
        method: 'PATCH',
        headers: SB_HDR,
        body: JSON.stringify({estado_json: payloadStr, atualizado_em: new Date().toISOString()}),
        keepalive: true
      });
    }
  } catch(e) {}
});

// Fechar ao clicar no fundo do modal
document.addEventListener('DOMContentLoaded', function() {
  var modal = document.getElementById('modal-gestao-arq');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) window.fecharGestaoArq(false);
    });
  }
});

// ══════════════════════════════════════════════════════════════════
//  CONGELAMENTO DO CRONOGRAMA — v6.03.01 · Fase 2
//  Botão na barra de abas + modal explicativo + gravação de status/snapshot.
//  (As travas de edição entram na Fase 3; aqui só o fluxo de UI e persistência.)
// ══════════════════════════════════════════════════════════════════

// Atualiza visibilidade dos botões da barra de abas conforme o status.
function _atualizarBotoesCongelamento() {
  var frozen = _isFrozen();
  var bCong  = document.getElementById('btn-congelar-crono');
  var bArq   = document.getElementById('btn-plano-arq');
  var bPrTec = document.getElementById('btn-plano-prtec');
  var bObra  = document.getElementById('btn-plano-obra');
  if (bCong) {
    if (frozen) {
      bCong.innerHTML = '❄ Congelado';
      bCong.title = 'Cronograma congelado — clique para descongelar';
      bCong.style.background = 'rgba(0,185,80,.22)';
      bCong.style.borderColor = 'rgba(0,185,80,.6)';
      bCong.style.color = '#008A3C';
    } else {
      bCong.innerHTML = '❄ Congelar';
      bCong.title = 'Congelar cronograma — datas macro';
      bCong.style.background = 'rgba(0,185,80,.10)';
      bCong.style.borderColor = 'rgba(0,185,80,.4)';
      bCong.style.color = '#00A048';
    }
  }
  // Botões de plano só aparecem quando congelado.
  if (bArq)   bArq.style.display   = frozen ? '' : 'none';
  if (bPrTec) bPrTec.style.display = frozen ? '' : 'none';
  if (bObra)  bObra.style.display  = frozen ? '' : 'none';
}

// Abre o modal explicativo de congelamento, OU oferece descongelar se já congelado.
window.abrirModalCongelar = function() {
  if (_isFrozen()) { _abrirModalDescongelar(); return; }
  document.getElementById('modal-congelar')?.remove();
  var ov = document.createElement('div');
  ov.id = 'modal-congelar';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9600;display:flex;align-items:center;justify-content:center;padding:18px;';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  ov.innerHTML =
    '<div style="background:var(--bg-panel);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.55);width:100%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:18px 22px 14px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(0,185,80,.10),transparent);">'
    +   '<span style="font-size:20px;">❄</span>'
    +   '<div style="flex:1;"><div style="font-family:var(--font);font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--txt);">Congelar cronograma</div>'
    +   '<div style="font-size:11px;color:var(--txt-muted);margin-top:2px;">Versão aprovada com o cliente na venda</div></div>'
    +   '<button onclick="document.getElementById(\'modal-congelar\').remove()" style="width:28px;height:28px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:6px;cursor:pointer;font-size:14px;color:var(--txt-muted);">✕</button>'
    + '</div>'
    + '<div style="flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:14px;">'
    +   '<div style="display:flex;gap:11px;align-items:flex-start;"><span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:rgba(0,185,80,.14);color:#00A048;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--font);">1</span>'
    +     '<p style="font-size:13px;line-height:1.6;color:var(--txt);margin:0;">A partir de agora todas as <strong>datas macro</strong> definidas neste cronograma estarão congeladas e serão monitoradas. As informações constantes aqui serão transferidas para o <strong>Comunicado Semanal</strong> e farão parte do contrato, devendo inclusive ser apresentadas no <strong>Kickoff Externo</strong>.</p></div>'
    +   '<div style="display:flex;gap:11px;align-items:flex-start;"><span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:rgba(0,185,80,.14);color:#00A048;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--font);">2</span>'
    +     '<p style="font-size:13px;line-height:1.6;color:var(--txt);margin:0;">Mudanças no planejamento deverão obedecer o <strong>protocolo de alteração</strong>, que incluirá revisão contratual e validação do cliente e da liderança da A|W.</p></div>'
    +   '<div style="display:flex;gap:11px;align-items:flex-start;"><span style="flex-shrink:0;width:22px;height:22px;border-radius:50%;background:rgba(0,185,80,.14);color:#00A048;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:var(--font);">3</span>'
    +     '<p style="font-size:13px;line-height:1.6;color:var(--txt);margin:0;">Os <strong>próximos passos</strong> incluem o planejamento fino da arquitetura, o refinamento do cronograma de projetos técnicos e o alinhamento dos prazos de execução dos serviços da planilha de venda.</p></div>'
    + '</div>'
    + '<div style="flex-shrink:0;padding:16px 22px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end;gap:10px;background:var(--bg-surface);">'
    +   '<button onclick="document.getElementById(\'modal-congelar\').remove()" style="height:34px;padding:0 16px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:7px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-muted);cursor:pointer;">Cancelar</button>'
    +   '<button onclick="confirmarCongelamento()" style="height:34px;padding:0 20px;border:none;background:#00A048;border-radius:7px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;cursor:pointer;display:flex;align-items:center;gap:6px;">❄ Concordo e congelar</button>'
    + '</div></div>';
  document.body.appendChild(ov);
};

// Confirma o congelamento: captura snapshot, grava status no Supabase, atualiza UI.
window.confirmarCongelamento = async function() {
  try {
    var snap = _capturarSnapshotCongelamento();
    if (snap) { ESTADO.frozenSnapshot = snap; ESTADO.frozenAt = new Date().toISOString(); }
    ESTADO.congelado = true;
    sessionStorage.setItem('aw_crono_status', 'frozen');
    // Persistir status + estado no Supabase
    if (_CRONO_ID) {
      try { lerUIparaEstado(); } catch(e) {}
      var payload = { ts: Date.now(), estado: ESTADO };
      sessionStorage.setItem('aw_estado_atual', JSON.stringify(payload));
      await fetch(SB_URL + '/rest/v1/cronogramas?id=eq.' + _CRONO_ID, {
        method: 'PATCH', headers: SB_HDR,
        body: JSON.stringify({ status: 'frozen', estado_json: JSON.stringify(payload), atualizado_em: new Date().toISOString() })
      });
    }
    document.getElementById('modal-congelar')?.remove();
    _atualizarBotoesCongelamento();
    _atualizarHeaderCongelado();
    if (typeof gRender === 'function') gRender();
    showToast('Cronograma congelado ❄');
  } catch(e) { console.error('confirmarCongelamento', e); showToast('Erro ao congelar'); }
};

// Modal de descongelamento (proteção: ação reversível só para correção).
function _abrirModalDescongelar() {
  document.getElementById('modal-descongelar')?.remove();
  var ov = document.createElement('div');
  ov.id = 'modal-descongelar';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9600;display:flex;align-items:center;justify-content:center;padding:18px;';
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  ov.innerHTML =
    '<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.5);width:100%;max-width:420px;padding:24px;display:flex;flex-direction:column;gap:16px;">'
    + '<div style="font-family:var(--font);font-size:14px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--orange);">↺ Descongelar cronograma</div>'
    + '<p style="font-size:13px;line-height:1.6;color:var(--txt-muted);margin:0;">O cronograma voltará a ser editável e sairá do estado congelado. Use apenas para correções autorizadas — o protocolo de alteração se aplica.</p>'
    + '<div style="display:flex;justify-content:flex-end;gap:10px;">'
    +   '<button onclick="document.getElementById(\'modal-descongelar\').remove()" style="height:34px;padding:0 16px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:7px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-muted);cursor:pointer;">Cancelar</button>'
    +   '<button onclick="confirmarDescongelamento()" style="height:34px;padding:0 18px;border:none;background:var(--orange);border-radius:7px;font-family:var(--font);font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#fff;cursor:pointer;">↺ Descongelar</button>'
    + '</div></div>';
  document.body.appendChild(ov);
}

window.confirmarDescongelamento = async function() {
  try {
    ESTADO.congelado = false;
    sessionStorage.setItem('aw_crono_status', 'sim');
    if (_CRONO_ID) {
      try { lerUIparaEstado(); } catch(e) {}
      var payload = { ts: Date.now(), estado: ESTADO };
      sessionStorage.setItem('aw_estado_atual', JSON.stringify(payload));
      await fetch(SB_URL + '/rest/v1/cronogramas?id=eq.' + _CRONO_ID, {
        method: 'PATCH', headers: SB_HDR,
        body: JSON.stringify({ status: 'sim', estado_json: JSON.stringify(payload), atualizado_em: new Date().toISOString() })
      });
    }
    document.getElementById('modal-descongelar')?.remove();
    _atualizarBotoesCongelamento();
    _atualizarHeaderCongelado();
    if (typeof gRender === 'function') gRender();
    showToast('Cronograma descongelado ↺');
  } catch(e) { console.error('confirmarDescongelamento', e); showToast('Erro ao descongelar'); }
};

// Atualiza o badge "❄ Congelado" no header conforme o status atual.
function _atualizarHeaderCongelado() {
  var ht = document.querySelector('.hdr-title');
  if (!ht) return;
  var nm = sessionStorage.getItem('aw_crono_nome') || (ESTADO.meta && ESTADO.meta.nome) || '';
  var frozen = _isFrozen();
  ht.innerHTML = 'Planejamento<em> de Obra</em>'
    + (nm ? ' · <span style="opacity:.6;">' + nm + '</span>' : '')
    + (frozen ? '<span style="font-size:9px;background:rgba(0,185,80,.2);color:#00B950;padding:1px 6px;border-radius:8px;margin-left:6px;">❄ Congelado</span>' : '');
}

// Stubs dos planos (conteúdo definido em etapas futuras).
window.abrirPlanoPrTec = function() { showToast('Plano Pr Téc — em breve'); };
window.abrirPlanoObra  = function() { showToast('Plano Obra — em breve'); };

// Sincroniza botões/header no carregamento, após o estado chegar do Supabase.
document.addEventListener('DOMContentLoaded', function() {
  // pequeno atraso para rodar depois do init principal que resolve carregarDadosSB
  setTimeout(function() {
    try { _atualizarBotoesCongelamento(); } catch(e) {}
    // Restaurar seleção da Equipe ARQ na UI, se já houver dados (correção v6.03.01)
    try {
      if (ESTADO.cfg && ESTADO.cfg.equipeARQ && typeof equipeRenderGerentes === 'function') {
        var selDir = document.getElementById('equipe-diretor');
        if (selDir && ESTADO.cfg.equipeARQ.diretor) { selDir.value = ESTADO.cfg.equipeARQ.diretor; equipeRenderGerentes(); }
      }
    } catch(e) {}
  }, 400);
});

// ── Fase 3 · trava de DATAS no popup quando congelado ────────────────────────
// gPopApply é redefinida acima; aqui envolvemos a versão final num guarda que
// bloqueia apenas a aplicação de DATAS (botão "Aplicar") para alvos travados.
// Vínculos (gToggleChain/Type/Src) não passam por aqui e seguem livres.
(function(){
  var _origPopApply = window.gPopApply;
  window.gPopApply = function(t){
    if (_congBloqueiaAlvo(_popDs)) { _congAvisar(); return; }
    return _origPopApply.apply(this, arguments);
  };
})();
