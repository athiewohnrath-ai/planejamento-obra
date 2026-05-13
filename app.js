const SB_URL='https://ejneanfveoctdlltjnrs.supabase.co';
const SB_KEY='sb_publishable_vZApDmF_C-heCrm8fXJ_XA_ATmMO3YP';
const SB_HDR={'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
const _CRONO_ID=sessionStorage.getItem('aw_crono_id')||'';

async function salvarDados(){
  try{
    lerUIparaEstado();
    const ts=Date.now();
    const payload={ts,estado:ESTADO};
    sessionStorage.setItem('aw_estado_atual',JSON.stringify(payload));
    if(_CRONO_ID){
      const el=document.getElementById('save-info');
      if(el)el.textContent='Salvando…';
      const r=await fetch(SB_URL+'/rest/v1/cronogramas?id=eq.'+_CRONO_ID,{
        method:'PATCH',headers:SB_HDR,
        body:JSON.stringify({
          codigo:ESTADO.meta.codigo||'',nome:ESTADO.meta.nome||'',
          gi:ESTADO.meta.gi||'',gp:ESTADO.meta.gp||'',
          estado_json:JSON.stringify(payload),
          atualizado_em:new Date().toISOString()
        })
      });
      const dt=new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      if(el)el.textContent=r.ok?'Salvo às '+dt:'Erro ao salvar';
    }
  }catch(e){console.error('salvarDados',e);}
}

async function carregarDadosSB(){
  if(!_CRONO_ID)return false;
  const cached=sessionStorage.getItem('aw_estado_atual');
  if(cached){try{const d=JSON.parse(cached);if(d.estado){ESTADO=d.estado;window.__AW_ESTADO=ESTADO;estadoParaUI();return true;}}catch{}}
  try{
    const r=await fetch(SB_URL+'/rest/v1/cronogramas?id=eq.'+_CRONO_ID+'&select=*',{headers:SB_HDR});
    const data=await r.json();
    if(data&&data[0]){
      const row=data[0];
      // Guardar status no sessionStorage para uso na UI
      sessionStorage.setItem('aw_crono_status', row.status||'sim');
      sessionStorage.setItem('aw_crono_nome', row.nome||'');
      if(row.estado_json){
        try{
          const d=JSON.parse(row.estado_json);
          if(d.estado){
            ESTADO=d.estado;window.__AW_ESTADO=ESTADO;estadoParaUI();
            sessionStorage.setItem('aw_estado_atual',row.estado_json);
            const dt=new Date(row.atualizado_em);
            const el=document.getElementById('save-info');
            if(el)el.textContent='Último save: '+dt.toLocaleDateString('pt-BR')+' '+dt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
            return true;
          }
        }catch{}
      }
      ESTADO.meta.codigo=row.codigo||'';
      ESTADO.meta.nome=row.nome||'';
      ESTADO.meta.gi=row.gi||'';
      ESTADO.meta.gp=row.gp||'';
      window.__AW_ESTADO=ESTADO;
      estadoParaUI();
      return true;
    }
  }catch(e){console.error('carregarDadosSB',e);}
  return false;
}
// LS_KEY gerenciado pelo Supabaselet ESTADO={meta:{codigo:"",nome:"",gi:"",gp:""},cfg:{nProj:1,nObra:1,dnn:"",visita:"",kickoffTec:"",preObra:!1,preObraDias:10,vinculoObraProj:!1,limiteArq:5,projFases:[{etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""}],obraFases:[{inicio:"",prazo:"56",andares:""}]},alocacaoARQ:{}};function confirmarReset(){document.getElementById("modal-confirm").classList.add("open")}function fecharConfirm(){document.getElementById("modal-confirm").classList.remove("open")}function executarReset(){localStorage.removeItem(LS_KEY),ESTADO={meta:{codigo:"",nome:"",gi:"",gp:""},cfg:{nProj:1,nObra:1,dnn:"",visita:"",kickoffTec:"",preObra:!1,preObraDias:10,vinculoObraProj:!1,limiteArq:5,projFases:[{etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""}],obraFases:[{inicio:"",prazo:"56",andares:""}]},alocacaoARQ:{}},window.__AW_ESTADO=ESTADO,gSt.projFases=[],gSt.obraFases=[],gSt.axisStart=null,gSt.totalDays=0,gSt.zoom=1,gSt._obraVinculadaCond=!0,gSt._obraArqSrc="aprovCond",gSt._visitaVinculada=!0,gSt._visitaDate=null,CFG_ANDARES=["5º","6º","7º"],CFG_PERFIL_SEL="proj+obra",_nFasesProj=1,_nFasesObra=1,_cfgAndarModo="inteiro",_cfgEntregaveis={};const t=document.getElementById("cfg-vinculo-obra-proj");t&&(t.checked=!1);const e=document.getElementById("cfg-pre-obra-on");e&&(e.checked=!1);const o=document.getElementById("cfg-pre-obra-wrap");o&&(o.style.display="none");const a=document.getElementById("cfg-vinculo-obra-wrap");a&&(a.style.display="none"),document.querySelectorAll("#cfg-seg-nproj .cfg-seg-btn").forEach((t,e)=>t.classList.toggle("sel",0===e)),document.querySelectorAll("#cfg-seg-nobra .cfg-seg-btn").forEach((t,e)=>t.classList.toggle("sel",0===e)),cfgRenderAndares(),cfgRenderPerfil(),cfgAplicarPerfil(),cfgInitEntregaveis(),cfgBuildEntregaveis(),estadoParaUI(),motorRecalc(),"function"==typeof gRender&&gRender(),document.getElementById("save-info").textContent="Dados zerados",fecharConfirm(),showToast("Dados zerados — protótipo no estado inicial")}function lerUIparaEstado(){ESTADO.meta.codigo=v("meta-codigo"),ESTADO.meta.nome=v("meta-nome"),ESTADO.meta.gi=v("meta-gi"),ESTADO.meta.gp=v("meta-gp"),ESTADO.cfg.dnn=v("cfg-dnn"),ESTADO.cfg.visita=v("cfg-visita"),ESTADO.cfg.kickoffTec=v("cfg-kickofftec");const t=ESTADO.cfg.nProj;for(let e=0;e<t;e++){const t=ESTADO.cfg.projFases[e]||{};["ep1","ep2","ap","ex","cond"].forEach(o=>{const a=document.getElementById(`proj-f${e}-${o}`);a&&(t.etapas[o]=a.checked)});const o=document.getElementById(`proj-f${e}-andares`);o&&(t.andares=o.value),ESTADO.cfg.projFases[e]=t}const e=ESTADO.cfg.nObra;for(let t=0;t<e;t++){const e=ESTADO.cfg.obraFases[t]||{},o=document.getElementById(`obra-f${t}-inicio`),a=document.getElementById(`obra-f${t}-prazo`),n=document.getElementById(`obra-f${t}-andares`);o&&(e.inicio=o.value),a&&(e.prazo=a.value),n&&(e.andares=n.value),ESTADO.cfg.obraFases[t]=e}}function estadoParaUI(){set("meta-codigo",ESTADO.meta.codigo),set("meta-nome",ESTADO.meta.nome),set("meta-gi",ESTADO.meta.gi),set("meta-gp",ESTADO.meta.gp),set("cfg-dnn",ESTADO.cfg.dnn),set("cfg-visita",ESTADO.cfg.visita),set("cfg-kickofftec",ESTADO.cfg.kickoffTec);const t=document.getElementById("cfg-vinculo-obra-proj");if(t){t.checked=!!ESTADO.cfg.vinculoObraProj;const e=document.getElementById("cfg-vinculo-obra-wrap");e&&(e.style.display=t.checked?"":"none")}if(ESTADO.equipeARQ){const t=ESTADO.equipeARQ,e=document.getElementById("earq-ch-arq");e&&(e.value=t.chArq??120);const o=document.getElementById("earq-ch-dir");o&&(o.value=t.chDir??280);const a=document.getElementById("earq-ch-ger");a&&(a.value=t.chGer??180)}const e=document.getElementById("cfg-limite-arq");e&&(e.value=ESTADO.cfg?.limiteArq??5);const o=document.getElementById("val-nproj");o&&(o.textContent=ESTADO.cfg.nProj);const a=document.getElementById("val-nobra");a&&(a.textContent=ESTADO.cfg.nObra),renderProjFases(),renderObraFases(),atualizarHeaderBadge(),motorRecalc(),atualizarResumoDatas()}function v(t){return document.getElementById(t)?.value??""}function set(t,e){const o=document.getElementById(t);o&&(o.value=e)}function onMetaChange(){atualizarHeaderBadge()}function onCfgChange(){lerUIparaEstado(),motorRecalc(),atualizarResumoDatas(),"function"==typeof gRender&&gRender()}function atualizarHeaderBadge(){const t=v("meta-codigo"),e=v("meta-nome"),o=document.getElementById("hdr-badge");t||e?(o.textContent=[t,e].filter(Boolean).join(" — "),o.style.display=""):o.style.display="none"}function stepperChange(t,e){ESTADO.cfg[t]=Math.min(4,Math.max(1,(ESTADO.cfg[t]||1)+e));const o=document.getElementById("nProj"===t?"val-nproj":"val-nobra");if(o&&(o.textContent=ESTADO.cfg[t]),"nProj"===t){for(;ESTADO.cfg.projFases.length<ESTADO.cfg.nProj;)ESTADO.cfg.projFases.push({etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""});ESTADO.cfg.projFases.length=ESTADO.cfg.nProj,renderProjFases()}else{for(;ESTADO.cfg.obraFases.length<ESTADO.cfg.nObra;)ESTADO.cfg.obraFases.push({inicio:"",prazo:"56",andares:""});ESTADO.cfg.obraFases.length=ESTADO.cfg.nObra,renderObraFases()}}window.__AW_ESTADO=ESTADO;const ETAPAS_ARQ=[{id:"ep1",label:"EP1"},{id:"ep2",label:"EP2"},{id:"ap",label:"AP"},{id:"ex",label:"EX"},{id:"cond",label:"Cond."}];function renderProjFases(){const t=document.getElementById("proj-fases-container"),e=ESTADO.cfg.nProj;let o="";for(let t=0;t<e;t++){const e=ESTADO.cfg.projFases[t]||{},a=e.etapas||{};o+=`\n <div class="p-fase"><div class="p-fase-hdr"><span class="p-fase-num">Fase ${t+1}</span></div><div class="p-fase-body"><div class="p-field"><label class="p-label">Etapas ARQ</label><div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px;">\n ${ETAPAS_ARQ.map(e=>` <label style="display:flex;align-items:center;gap:3px;cursor:pointer;font-family:var(--font);font-size:10px;font-weight:700;color:var(--txt-muted);letter-spacing:.05em;text-transform:uppercase;"> <input type="checkbox" id="proj-f${t}-${e.id}" ${!1!==a[e.id]?"checked":""} onchange="onCfgChange()" style="accent-color:var(--accent);width:12px;height:12px;"> ${e.label} </label> `).join("")}\n </div></div><div class="p-field"><label class="p-label">Andares</label><input class="p-input" type="text" id="proj-f${t}-andares"\n placeholder="ex: 10º e 11º" value="${e.andares||""}" oninput="onCfgChange()"></div></div></div>`}t.innerHTML=o}
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

  // Garantir estrutura mínima
  for (let i = 0; i < n; i++) {
    if (!ESTADO.cfg.obraFases[i]) ESTADO.cfg.obraFases[i] = {};
    const cfg = ESTADO.cfg.obraFases[i];
    // Aplicar template padrão se ainda não tem
    if (!cfg.templateId) {
      cfg.templateId = 'escritorio-padrao';
      const faseGst = gSt.obraFases[i];
      if (faseGst && typeof _tplGetDiscsCopy === 'function') {
        const novas = _tplGetDiscsCopy('escritorio-padrao');
        if (novas) faseGst.disciplinas = novas;
      }
    }
  }

  // Tabela compacta
  let html = `<table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead>
      <tr style="background:var(--bg-surface2);">
        <th style="padding:7px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);width:60px;">Fase</th>
        <th style="padding:7px 10px;text-align:left;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);">Template</th>
        <th style="padding:7px 10px;text-align:center;font-family:var(--font);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--txt-muted);border-bottom:1px solid var(--border);width:32px;"></th>
      </tr>
    </thead>
    <tbody>`;

  for (let i = 0; i < n; i++) {
    const cfg = ESTADO.cfg.obraFases[i];
    const tplSel = cfg.templateId || 'escritorio-padrao';
    const faseMod = typeof _tplFaseModificada === 'function' && _tplFaseModificada(i);
    const statusDot = tplSel
      ? `<span title="${faseMod ? 'Modificado manualmente' : 'Sincronizado'}" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${faseMod ? '#E07000' : '#2A7A30'};flex-shrink:0;margin-right:6px;"></span>`
      : '';
    const tplOpts = todos.map(t =>
      `<option value="${t.id}" ${t.id === tplSel ? 'selected' : ''}>${t.label}</option>`
    ).join('');
    const ressincBtn = faseMod
      ? `<button onclick="_tplRessincronizar(${i})" title="Ressincronizar com o template" style="width:26px;height:26px;border:1px solid var(--orange,#C07820);background:var(--orange-light,rgba(192,120,32,.08));color:var(--orange,#C07820);border-radius:4px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;">↺</button>`
      : `<div style="width:26px;"></div>`;

    html += `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:8px 10px;">
        <span style="font-family:var(--font);font-size:11px;font-weight:700;color:var(--txt);">F${i+1}</span>
      </td>
      <td style="padding:6px 10px;">
        <div style="display:flex;align-items:center;gap:6px;">
          ${statusDot}
          <select class="p-input" style="flex:1;height:30px;padding:0 8px;" onchange="_tplVincularFase(${i},this.value,this)">
            <option value="">— sem template —</option>
            ${tplOpts}
          </select>
        </div>
      </td>
      <td style="padding:6px 8px;text-align:center;">${ressincBtn}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  cont.innerHTML = html;
}let CFG_ANDARES=["5º","6º","7º"];function cfgRenderAndares(){const t=document.getElementById("cfg-andares-lista");t&&(t.innerHTML=CFG_ANDARES.map((t,e)=>`<span class="cfg-andar-chip">${t}<button onclick="cfgRemoverAndar(${e})" title="Remover">×</button></span>`).join("")||'<span style="font-size:11px;color:var(--txt-dim);">Nenhum andar cadastrado</span>',cfgBuildAndaresTable())}function cfgAdicionarAndar(){const t=document.getElementById("cfg-andar-novo"),e=t.value.trim();e&&(CFG_ANDARES.push(e),t.value="",cfgRenderAndares())}function cfgRemoverAndar(t){CFG_ANDARES.splice(t,1),cfgRenderAndares()}const CFG_PERFIS=[{id:"proj+obra",label:"Projeto + Obra AW",desc:"Processo completo com projeto e execução de obra pela AW.",padrao:!0,hasProj:!0,hasObra:!0},{id:"apenas-proj",label:"Apenas Projeto AW",desc:"Somente desenvolvimento de projeto, sem obra.",padrao:!1,hasProj:!0,hasObra:!1},{id:"apenas-obra",label:"Apenas Obra AW",desc:"Execução de obra sem projeto arquitetônico AW.",padrao:!1,hasProj:!1,hasObra:!0},{id:"extra-obra",label:"Extra de Obra",desc:"Escopo adicional vinculado a processo já existente.",padrao:!1,hasProj:!1,hasObra:!0},{id:"ato",label:"ATO – Acomp. Técnico",desc:"Acompanhamento técnico sem projeto arquitetônico AW.",padrao:!1,hasProj:!1,hasObra:!0},{id:"garantia",label:"Garantia / Fechamento",desc:"Processo pós-entrega para garantias ou fechamento financeiro.",padrao:!1,hasProj:!1,hasObra:!1}];let CFG_PERFIL_SEL="proj+obra";function cfgRenderPerfil(){const t=document.getElementById("cfg-perfil-lista");t&&(t.innerHTML=CFG_PERFIS.map(t=>`\n <div class="cfg-perfil-row${t.id===CFG_PERFIL_SEL?" sel":""}${t.padrao?" padrao":""}" onclick="cfgSelectPerfil('${t.id}')"><div class="cfg-perfil-dot"></div><div><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);margin-bottom:2px;">${t.label}</div><div style="font-size:10px;color:var(--txt-muted);">${t.desc}</div></div></div>`).join(""))}function cfgSelectPerfil(t){CFG_PERFIL_SEL=t,cfgRenderPerfil(),cfgAplicarPerfil()}function cfgAplicarPerfil(){const t=CFG_PERFIS.find(t=>t.id===CFG_PERFIL_SEL)||CFG_PERFIS[0],e=document.getElementById("mcfg-proj-bloqueado"),o=document.getElementById("mcfg-proj-conteudo"),a=document.getElementById("mcfg-obra-bloqueado"),n=document.getElementById("mcfg-obra-conteudo");e&&(e.style.display=t.hasProj?"none":""),o&&(o.style.display=t.hasProj?"":"none"),a&&(a.style.display=t.hasObra?"none":""),n&&(n.style.display=t.hasObra?"":"none")}const CFG_ENTREGAVEIS=[{id:"lev",label:"LEV",desc:"Levantamento Físico",on:!0},{id:"ep1",label:"EP1",desc:"Estudo Preliminar 1",on:!0},{id:"ep2",label:"EP2",desc:"Estudo Preliminar 2",on:!0},{id:"baseAP",label:"BASE AP",desc:"Emissão Base AP",on:!0},{id:"ap",label:"AP",desc:"AP ARQ Aprovado",on:!0},{id:"compatAP",label:"COMPAT AP",desc:"Compatibilização AP",on:!0},{id:"baseEX",label:"BASE EX",desc:"Emissão Base EX",on:!0},{id:"ex",label:"EX",desc:"EX ARQ Aprovado",on:!0},{id:"aprovCond",label:"COND",desc:"Aprovação Condomínio",on:!0}];let _nFasesProj=1,_cfgAndarModo="inteiro",_cfgEntregaveis={};function cfgInitEntregaveis(){_cfgEntregaveis={},CFG_ENTREGAVEIS.forEach(t=>{_cfgEntregaveis[t.id]=Array.from({length:4},()=>t.on)})}function cfgSelectFasesProj(t){for(document.querySelectorAll("#cfg-seg-nproj .cfg-seg-btn").forEach(t=>t.classList.remove("sel")),t.classList.add("sel"),_nFasesProj=parseInt(t.dataset.n)||1,ESTADO.cfg.nProj=_nFasesProj;ESTADO.cfg.projFases.length<_nFasesProj;)ESTADO.cfg.projFases.push({etapas:{ep1:!0,ep2:!0,ap:!0,ex:!0,cond:!1},andares:""});ESTADO.cfg.projFases.length=_nFasesProj,cfgBuildEntregaveis(),cfgBuildAndaresTable(),cfgBuildVinculoObraProj(),motorRecalc(),"function"==typeof gRender&&gRender()}const ATIVS_DEF_ARQ=[{id:"lev",nome:"Lev. Físico",du:3,arqDia:1,hDir:0,hGer:0,padrao:!0},{id:"ep1",nome:"EP1",du:2,arqDia:1,hDir:4,hGer:2,padrao:!0},{id:"ep2",nome:"EP2",du:10,arqDia:1,hDir:8,hGer:2,padrao:!0},{id:"baseAP",nome:"Base AP",du:1,arqDia:1,hDir:0,hGer:0,padrao:!0},{id:"ap",nome:"AP ARQ",du:10,arqDia:1,hDir:4,hGer:2,padrao:!0},{id:"compatAP",nome:"Compat AP",du:2,arqDia:1,hDir:4,hGer:0,padrao:!0},{id:"baseEX",nome:"Base EX",du:1,arqDia:1,hDir:0,hGer:0,padrao:!0},{id:"ex",nome:"EX ARQ",du:8,arqDia:1,hDir:4,hGer:2,padrao:!0},{id:"compatEX",nome:"Compat EX",du:2,arqDia:1,hDir:4,hGer:0,padrao:!0},{id:"aprovCond",nome:"Aprov. Cond.",du:10,arqDia:0,hDir:0,hGer:0,padrao:!0}],ATIVS_DEF_TEC=[{id:"koTec",nome:"Kickoff Proj. Téc.",du:1,padrao:!0},{id:"epTec",nome:"EP Técnicos",du:10,padrao:!0},{id:"apTec",nome:"AP Técnicos",du:10,padrao:!0},{id:"exTec",nome:"EX Técnicos",du:10,padrao:!0}],ATIVS_DEF_OBRA=[{id:"eletrica",nome:"Elétrica",padrao:!0},{id:"ac",nome:"Ar Condicionado",padrao:!0},{id:"gesso",nome:"Gesso / Drywall",padrao:!0},{id:"civil",nome:"Civil",padrao:!0},{id:"spk",nome:"SPK / Hidrante",padrao:!0},{id:"sdai",nome:"SDAI / Detecção",padrao:!0},{id:"dados",nome:"Dados / TI",padrao:!0},{id:"pintura",nome:"Pintura",padrao:!0},{id:"forro",nome:"Forro Modular",padrao:!0},{id:"piso",nome:"Piso / Carpete",padrao:!0},{id:"marcenaria",nome:"Marcenaria",padrao:!0},{id:"vidros",nome:"Vidros / DPT",padrao:!0},{id:"mobiliario",nome:"Mobiliário",padrao:!0},{id:"multimidia",nome:"Multimídia",padrao:!0}];let _ativListas={arq:ATIVS_DEF_ARQ.map(t=>({...t})),tec:ATIVS_DEF_TEC.map(t=>({...t})),obra:ATIVS_DEF_OBRA.map(t=>({...t}))};function getLimiteArq(){return Math.max(1,parseInt(ESTADO.cfg?.limiteArq)||5)}function getSubIds(){return _ativListas.arq.map(t=>t.id)}function getSubNames(){const t={};return _ativListas.arq.forEach(e=>{t[e.id]=e.nome}),t}function getSubLens(){return _ativListas.arq.map(t=>t.du)}function getSubDefRel(){return _ativListas.arq.map((t,e)=>{if(!t.padrao)return"FI";const o=ATIVS_DEF_ARQ.findIndex(e=>e.id===t.id);return o>=0&&["FI","FI","FI","II","FI","FI","FI","II","FI","II"][o]||"FI"})}function getSubDefSrc(){return _ativListas.arq.map((t,e)=>{if(!t.padrao||0===e)return null;const o=ATIVS_DEF_ARQ.findIndex(e=>e.id===t.id);if(o<0)return null;const a=[null,null,null,2,2,null,null,5,null,6][o];if(null===a)return null;const n=ATIVS_DEF_ARQ[a]?.id;if(!n)return null;const r=_ativListas.arq.findIndex(t=>t.id===n);return r>=0?r:null})}function getTecIds(){return _ativListas.tec.map(t=>t.id)}function getTecNames(){const t={};return _ativListas.tec.forEach(e=>{t[e.id]=e.nome}),t}function getTecLens(){return _ativListas.tec.map(t=>t.du)}function getDiscDefs(){return _ativListas.obra.map(t=>{const e=DISC_DEFS.find(e=>e.id===t.id);return e?{...e,label:t.nome}:{id:t.id,label:t.nome,start:1,end:8,tasks:[]}})}function ativSincronizarG(){G.SUB_IDS=getSubIds(),G.SUB_NAMES=getSubNames(),G.SUB_LENS=getSubLens(),G.SUB_DEF_REL=getSubDefRel(),G.SUB_DEF_SRC=getSubDefSrc(),G.TEC_IDS=getTecIds(),G.TEC_NAMES=getTecNames(),G.TEC_LENS=getTecLens(),(gSt?.projFases||[]).forEach(t=>{["arq"].forEach(e=>{const o="arq"===e?G.SUB_IDS:G.TEC_IDS,a=t.rows[e].subs,n=Object.values(a).reduce((t,e)=>e?.end&&G.ms(e.end)>G.ms(t)?e.end:t,t.rows[e].end||new Date);o.forEach(t=>{a[t]||(a[t]={start:G.clone(n),end:G.clone(n)})}),Object.keys(a).forEach(t=>{o.includes(t)||delete a[t]})});const e=G.SUB_IDS.length;if(t.chains.arq.length!==e-1){const o=t.chains.arq;t.chains.arq=Array(e-1).fill(!0).map((t,e)=>o[e]??!1)}if(t.chainTypes?.arq?.length!==e){const o=t.chainTypes?.arq||[];t.chainTypes||(t.chainTypes={}),t.chainTypes.arq=Array(e).fill("FI").map((t,e)=>o[e]??"FI")}if(t.chainSrc?.arq?.length!==e){const o=t.chainSrc?.arq||[];t.chainSrc||(t.chainSrc={}),t.chainSrc.arq=Array(e).fill(null).map((t,e)=>o[e]??null)}});const t=getDiscDefs(),e=t.map(t=>t.id);(gSt?.obraFases||[]).forEach((o,oIdx)=>{
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
})}window.ativSetAloc=function(t,e,o,a){const n=Math.max(0,parseInt(a)||0);_ativListas[t][e][o]=n;const r=_ativListas[t][e];(gSt?.projFases||[]).forEach(t=>{const e=`${t.id}/arq/${r.id}`;ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}}),ESTADO.equipeARQ.cotas||(ESTADO.equipeARQ.cotas={});const a=ESTADO.equipeARQ.cotas[e]||{};if("hDir"===o&&(a.dir=n),"hGer"===o&&(a.ger=n),ESTADO.equipeARQ.cotas[e]=a,"arqDia"===o){ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});const e=`${t.id}/arq/${r.id}`;ESTADO.alocacaoARQ[e]?ESTADO.alocacaoARQ[e].default=n:ESTADO.alocacaoARQ[e]={default:n,override:{}}}}),salvarDados()};let _ativGrupo="arq",_ativEditId=null,_ativShowAdd={arq:!1,tec:!1,obra:!1},_ativDragIdx=null,_ativPendDel=null;const ATIV_RAMP={arq:["#5A8ACC","#4A7ABE","#3A6AAF","#2E5E9E","#24528E","#1A467E","#123A6E","#0C2E5E","#08244E","#041A3E","#6090D8","#507ABF","#3A68AA"],tec:["#5AAA8A","#4A9A7A","#3A8A6A","#348062","#2E765A","#286C52","#22624A","#1C5840"],obra:["#7A4A10","#8A5618","#9A6220","#AA6E28","#BA7A30","#CA8638","#DA9240","#C07828","#B06820","#A05818","#904810","#803808","#702808","#602000"]},ATIV_MOM={arq:"#1A5294",tec:"#2A7A5A",obra:"#7A4A10"};function ativSwitchGrupo(t){_ativGrupo=t,document.querySelectorAll(".ativ-gtab").forEach((e,o)=>{e.classList.toggle("active",["arq","tec"][o]===t)}),["arq","tec"].forEach(e=>{const o=document.getElementById("ativ-pane-"+e);o&&(o.style.display=e===t?"block":"none")}),ativRender(t)}function ativRender(t){const e=document.getElementById("ativ-pane-"+t);if(!e)return;const o=_ativListas[t],a="obra"!==t,n=ATIV_MOM[t],r=ATIV_RAMP[t],i="arq"===t||"tec"===t?_nFasesProj||1:0,s=["#1A5294","#2A5AA8","#8A3AA8","#2A8A5A"];let d="";"arq"===t&&(d+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border);">',d+='<span style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);white-space:nowrap;">Fases de projeto</span>',d+='<div class="cfg-seg-row" id="cfg-seg-nproj" style="margin:0;">',[1,2,3,4].forEach(t=>{d+=`<button class="cfg-seg-btn${t===(_nFasesProj||1)?" sel":""}" data-n="${t}" onclick="cfgSelectFasesProj(this)">${1===t?"Única":t+"F"}</button>`}),d+="</div></div>");let l="";if(i>1?(l=Array.from({length:i},(t,e)=>`<span style="width:32px;text-align:center;font-size:9px;font-weight:700;color:${s[e%s.length]};flex-shrink:0;white-space:nowrap;">${gSt?.projFases?.[e]?.nome?.trim()||`F${e+1}`}</span>`).join(""),d+='<div style="display:flex;align-items:center;gap:6px;padding:0 8px 6px;margin-bottom:2px;">',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="flex:1;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);">Atividade</span>',a&&(d+='<span style="width:50px;text-align:center;font-size:9px;font-weight:700;color:var(--txt-dim);flex-shrink:0;">DU</span>'),"arq"===t&&(d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#185FA5;flex-shrink:0;">Arq/dia</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#534AB7;flex-shrink:0;">Dir.(h)</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#0F6E56;flex-shrink:0;">Ger.(h)</span>'),d+=l,d+='<span style="width:20px;flex-shrink:0;"></span>',d+="</div>"):"arq"===t&&(d+='<div style="display:flex;align-items:center;gap:6px;padding:0 8px 5px;margin-bottom:2px;border-bottom:1px solid var(--border);">',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="width:18px;flex-shrink:0;"></span>',d+='<span style="flex:1;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt-dim);">Atividade</span>',d+='<span style="width:50px;text-align:center;font-size:9px;font-weight:700;color:var(--txt-dim);flex-shrink:0;">DU</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#185FA5;flex-shrink:0;">Arq/dia</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#534AB7;flex-shrink:0;">Dir. (h)</span>',d+='<span style="width:52px;text-align:center;font-size:9px;font-weight:700;color:#0F6E56;flex-shrink:0;">Ger. (h)</span>',d+='<span style="width:20px;flex-shrink:0;"></span>',d+="</div>"),d+='<div class="ativ-list-hdr">',d+=`<span class="ativ-list-hdr-lbl">${o.length} ${"obra"===t?"disciplinas":"atividades"}${a?" · "+o.reduce((t,e)=>t+e.du,0)+" DU":""}</span>`,_ativShowAdd[t]||(d+=`<button class="ativ-btn-add" onclick="ativMostrarAdd('${t}')">+ Adicionar</button>`),d+=`</div><div class="ativ-list" id="ativ-list-${t}">`,o.forEach((e,o)=>{d+=`<div class="ativ-item" draggable="true" ondragstart="ativDragStart(event,'${t}',${o})" ondragover="ativDragOver(event,'${t}',${o})" ondrop="ativDrop(event,'${t}',${o})" ondragend="ativDragEnd('${t}')" id="ativ-item-${t}-${o}">`,d+='<span class="ativ-drag-handle" title="Arrastar">⠿</span>',d+=`<div class="ativ-num" style="background:${n}">${o+1}</div>`,d+=_ativEditId===t+"-"+o?`<input class="ativ-nome-inp" id="ativ-inp-${t}-${o}" value="${e.nome.replace(/"/g,"\"")}" onblur="ativConfirmarRename('${t}',${o})" onkeydown="ativRenameKey(event,'${t}',${o})" onclick="event.stopPropagation()">`:`<span class="ativ-nome" onclick="ativIniciarRename('${t}',${o})" title="Clique para renomear">${e.nome}</span>`,e.padrao&&i<=1&&"arq"!==t&&(d+='<span class="ativ-badge-def">padrão</span>'),a&&(d+=`<div class="ativ-du-wrap" style="flex-shrink:0;width:50px;justify-content:center;"><input class="ativ-du-inp" type="number" min="1" max="999" value="${e.du}" onchange="ativDuChange('${t}',${o},this.value)" onclick="event.stopPropagation()"></div>`),"arq"===t&&(d+=`<input type="number" min="0" max="20" value="${e.arqDia??1}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'arqDia',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #B5D4F4;border-radius:4px;padding:3px 4px;text-align:center;background:#EEF2FA;color:#0C447C;">`,d+=`<input type="number" min="0" max="999" value="${e.hDir??0}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'hDir',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #AFA9EC;border-radius:4px;padding:3px 4px;text-align:center;background:#F5F0FC;color:#3C3489;">`,d+=`<input type="number" min="0" max="999" value="${e.hGer??0}" onclick="event.stopPropagation()" onchange="ativSetAloc('arq',${o},'hGer',this.value)" style="width:44px;flex-shrink:0;font-family:var(--font);font-size:11px;font-weight:700;border:1px solid #5DCAA5;border-radius:4px;padding:3px 4px;text-align:center;background:#E8F6F0;color:#085041;">`),i>1&&Array.from({length:i},(t,o)=>{const a=!1!==_cfgEntregaveis[e.id]?.[o],n=s[o%s.length];d+=`<div class="cfg-mx-cb${a?" on":""}" style="flex-shrink:0;width:18px;height:18px;border-color:${n};${a?"background:"+n+";border-color:"+n+";":""}cursor:pointer;" onclick="ativToggleFase('${e.id}',${o},this,'${n}')" title="Fase ${o+1}${a?": ativo":": inativo"}"></div>`}),d+=`<button class="ativ-btn-del" onclick="ativPedirRemover('${t}',${o})" title="Remover">✕</button>`,d+="</div>"}),d+="</div>",i>1&&("arq"===t||"tec"===t)&&(d+='<div style="display:flex;justify-content:flex-end;margin-top:6px;"><button onclick="cfgReplicarFase1()" style="padding:4px 10px;background:var(--accent);color:#fff;border:none;border-radius:4px;font-family:var(--font);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:.04em;">Replicar F1 → demais ▶</button></div>'),_ativShowAdd[t]&&(d+=`<div class="ativ-add-form"><input type="text" id="ativ-add-nome-${t}" placeholder="Nome da atividade..." onkeydown="ativAddKey(event,'${t}')">`,a&&(d+=`<input type="number" id="ativ-add-du-${t}" value="5" min="1" max="999" title="Duração em DU">`),d+=`<button class="ativ-btn-ok" onclick="ativConfirmarAdd('${t}')">+ Adicionar</button><button class="ativ-btn-cancel" onclick="ativCancelarAdd('${t}')">✕</button></div>`),a&&o.length>0){const t=o.reduce((t,e)=>t+e.du,0);d+=`<div class="ativ-preview"><div class="ativ-preview-lbl">Sequência — ${t} DU</div><div class="ativ-preview-strip">`,o.forEach((e,o)=>{const a=(e.du/t*100).toFixed(1),n=a>8?e.nome.substring(0,a>14?10:5)+"…":"";d+=`<div class="ativ-preview-seg" style="flex:${e.du};background:${r[o%r.length]};" title="${e.nome} — ${e.du} DU (${a}%)">${n}</div>`}),d+="</div></div>"}if(e.innerHTML=d,_ativEditId){const t=_ativEditId.split("-"),e=document.getElementById("ativ-inp-"+t[0]+"-"+t[1]);e&&(e.focus(),e.select())}if(_ativShowAdd[t]){const e=document.getElementById("ativ-add-nome-"+t);e&&e.focus()}}function ativMostrarAdd(t){_ativShowAdd[t]=!0,ativRender(t)}function ativCancelarAdd(t){_ativShowAdd[t]=!1,ativRender(t)}function ativConfirmarAdd(t){const e=document.getElementById("ativ-add-nome-"+t),o=e?.value?.trim();if(!o)return;const a=document.getElementById("ativ-add-du-"+t),n=parseInt(a?.value)||5;_ativListas[t].push({id:"custom_"+Date.now(),nome:o,du:n,padrao:!1}),_ativShowAdd[t]=!1,ativSincronizarG(),ativRender(t),motorRecalc(),gRender()}function ativAddKey(t,e){"Enter"===t.key&&ativConfirmarAdd(e),"Escape"===t.key&&ativCancelarAdd(e)}function ativIniciarRename(t,e){_ativEditId=t+"-"+e,ativRender(t)}function ativConfirmarRename(t,e){const o=document.getElementById("ativ-inp-"+t+"-"+e);if(!o)return;const a=o.value.trim();a&&(_ativListas[t][e].nome=a),_ativEditId=null,ativSincronizarG(),ativRender(t),gRender()}function ativRenameKey(t,e,o){"Enter"===t.key&&ativConfirmarRename(e,o),"Escape"===t.key&&(_ativEditId=null,ativRender(e))}function ativDuChange(t,e,o){_ativListas[t][e].du=Math.max(1,parseInt(o)||1),ativSincronizarG(),motorRecalc(),gRender()}function ativPedirRemover(t,e){const o=_ativListas[t][e],a=e>0&&e<_ativListas[t].length-1;_ativPendDel={g:t,idx:e},document.getElementById("ativ-dialog-body").innerHTML=`Remover <strong>${o.nome}</strong>?`+(a?"<br><br>Esta atividade tem atividades antes e depois. Como tratar os vínculos?":"<br><br>Esta atividade não tem vizinhos vinculados."),document.getElementById("ativ-btn-recon").style.display=a?"":"none",document.getElementById("ativ-btn-livre").textContent=a?"Remover vínculo":"Remover",document.getElementById("ativ-dialog-del").classList.add("open")}function ativFecharDialog(){document.getElementById("ativ-dialog-del").classList.remove("open"),_ativPendDel=null,document.getElementById("ativ-btn-recon").style.display="",document.getElementById("ativ-btn-livre").textContent="Remover vínculo"}function ativConfirmarDel(t){if(!_ativPendDel)return;const{g:e,idx:o}=_ativPendDel;_ativListas[e].splice(o,1),ativFecharDialog(),ativSincronizarG(),ativRender(e),motorRecalc(),gRender()}function ativDragStart(t,e,o){_ativDragIdx=o,t.currentTarget.classList.add("ativ-dragging"),t.dataTransfer.effectAllowed="move"}function ativDragOver(t,e,o){t.preventDefault(),document.querySelectorAll(`#ativ-list-${e} .ativ-item`).forEach(t=>t.classList.remove("ativ-drag-over")),o!==_ativDragIdx&&document.getElementById(`ativ-item-${e}-${o}`)?.classList.add("ativ-drag-over")}function ativDrop(t,e,o){if(t.preventDefault(),null===_ativDragIdx||_ativDragIdx===o)return;const a=_ativListas[e].splice(_ativDragIdx,1)[0];_ativListas[e].splice(o,0,a),_ativDragIdx=null,ativSincronizarG(),ativRender(e),motorRecalc(),gRender()}function ativDragEnd(t){_ativDragIdx=null,document.querySelectorAll(`#ativ-list-${t} .ativ-item`).forEach(t=>t.classList.remove("ativ-dragging","ativ-drag-over"))}function ativResetarPadrao(){confirm("Restaurar atividades padrão A|W? Atividades customizadas serão removidas.")&&(_ativListas={arq:ATIVS_DEF_ARQ.map(t=>({...t})),tec:ATIVS_DEF_TEC.map(t=>({...t})),obra:ATIVS_DEF_OBRA.map(t=>({...t}))},ativSincronizarG(),ativRender(_ativGrupo),motorRecalc(),gRender())}function ativInitEditor(t){if("obra"===t)return void ativRender("obra");_ativGrupo="arq",document.querySelectorAll(".ativ-gtab").forEach((t,e)=>{t.classList.toggle("active",0===e)}),["arq","tec"].forEach((t,e)=>{const o=document.getElementById("ativ-pane-"+t);o&&(o.style.display=0===e?"block":"none"),ativRender(t)});const e=document.getElementById("cfg-limite-arq");e&&(e.value=ESTADO.cfg?.limiteArq??5)}window.ativToggleFase=function(t,e,o,a){_cfgEntregaveis[t]||(_cfgEntregaveis[t]=Array(4).fill(!0)),_cfgEntregaveis[t][e]=!_cfgEntregaveis[t][e];const n=_cfgEntregaveis[t][e];o.classList.toggle("on",n),o.style.background=n?a:"",o.style.borderColor=a};let _alocDs=null,_alocDefault=1,_alocOverride={};const HORAS_DIA=8;function _alocKey(t){return`${t.phId}/${t.rowId}/${t.subId||"_row"}`}function alocGetDia(t){return void 0!==_alocOverride[t]?_alocOverride[t]:_alocDefault}function alocSalvar(){if(!_alocDs)return;ESTADO.alocacaoARQ||(ESTADO.alocacaoARQ={});const t=_alocKey(_alocDs);ESTADO.alocacaoARQ[t]={default:_alocDefault,override:{..._alocOverride}},salvarDados(),gClosePop(),"function"==typeof earqBuildTable&&(earqBuildTable(),earqRecalc())}function alocHtml(t){const e=gSt.projFases.find(e=>e.id==t.phId);if(!e)return"";const o=e.rows[t.rowId]?.subs?.[t.subId];if(!o)return"";const a=_alocKey(t),n=ESTADO.alocacaoARQ?.[a],r=_ativListas.arq.find(e=>e.id===t.subId);_alocDefault=n?.default??r?.arqDia??1,_alocOverride=n?.override?{...n.override}:{};const i=ESTADO.equipeARQ||{},s=`${t.phId}/${t.rowId}/${t.subId}`,d=i.cotas?.[s],l=d??{dir:r?.hDir??0,ger:r?.hGer??0},c="arq"===t.rowId?COR.ARQ_MOM:COR.TEC_MOM,p="tec"===t.rowId?G.TEC_NAMES[t.subId]||t.subId:G.SUB_NAMES[t.subId]||t.subId,dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),f=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"],u=[1,2,3,4,5,6,0],g=[];let m=new Date(o.start);const b=new Date(o.end),x=m.getDay();let h=G.addD(m,-(0===x?6:x-1));for(;h<=b;){const t=[];for(let e=0;e<7;e++){const e=new Date(h),a=e>=new Date(o.start)&&e<=b;t.push({dt:e,inRange:a,dk:dkFmt(e)}),h=G.addD(h,1)}g.push(t)}const A=[];g.forEach(t=>t.forEach(t=>{t.inRange&&0!==t.dt.getDay()&&6!==t.dt.getDay()&&!CALENDARIO.isNaoUtil(t.dt)&&A.push(t.dk)}));const y=u.map(t=>`<div style="width:34px;flex-shrink:0;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;color:${0===t||6===t?"#D0D4DA":"#8A95A8"};padding-bottom:3px;">${f[t]}</div>`).join("");let E="";g.forEach(t=>{const e=u.map(e=>{const o=t.find(t=>t.dt.getDay()===e);if(!o||!o.inRange)return'<div style="width:34px;flex-shrink:0;height:32px;border:1px solid #F0F2F4;border-radius:4px;background:#FAFAFA;"></div>';const a=0===e||6===e,n=CALENDARIO.isNaoUtil(o.dt);if(a||n)return`<div style="width:34px;flex-shrink:0;height:32px;border:1px solid #EEEEEE;border-radius:4px;background:#F8F8F8;display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-size:9px;color:#D0D4DA;">${o.dt.getDate()}</span></div>`;const r=alocGetDia(o.dk),i=void 0!==_alocOverride[o.dk],s=i?"#1A5294":"#EEF2FA",d=i?"#1A5294":"#B5D4F4",l=i?"#fff":"#1A5294";return`<div onclick="alocToggleDia('${o.dk}')" title="${o.dt.toLocaleDateString("pt-BR")}" style="width:34px;flex-shrink:0;height:32px;border:1px solid ${d};border-radius:4px;background:${s};display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;" id="aloc-cell-${o.dk}"><span style="font-size:8px;color:${i?"rgba(255,255,255,.6)":"#8A95A8"};">${o.dt.getDate()}</span><span style="font-size:12px;font-weight:800;color:${l};line-height:1;">${r}</span></div>`}).join("");E+=`<div style="display:flex;gap:2px;margin-bottom:2px;">${e}</div>`});const D=A.reduce((t,e)=>t+alocGetDia(e),0),w=8*D,S=A.length?(D/A.length).toFixed(1):"0";return` <div class="aloc-hdr" style="border-bottom:1px solid #EEF0F4;padding-bottom:10px;margin-bottom:10px;"><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"><circle cx="4.5" cy="3.5" r="2"/><path d="M0.5 10c0-2.2 1.8-4 4-4"/><circle cx="9.5" cy="3.5" r="2"/><path d="M6.5 10c0-2.2 1.8-4 4-4"/></svg><span class="aloc-hdr-title" style="color:${c};">${p}</span><span style="font-size:9px;color:#8A95A8;">${G.fmtBR(o.start)} – ${G.fmtBR(o.end)} · ${A.length} DU</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;"><div style="background:#F5F0FC;border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;color:#534AB7;flex:1;">Diretoria</span><input type="number" id="aloc-dir" value="${l.dir}" min="0" step="1" oninput="alocSaveCota('${s}')" style="width:44px;font-family:var(--font);font-size:12px;font-weight:700;border:1px solid #AFA9EC;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#3C3489;"><span style="font-size:9px;color:#7F77DD;">h</span></div><div style="background:#E8F6F0;border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;color:#0F6E56;flex:1;">Gerente ARQ</span><input type="number" id="aloc-ger" value="${l.ger}" min="0" step="1" oninput="alocSaveCota('${s}')" style="width:44px;font-family:var(--font);font-size:12px;font-weight:700;border:1px solid #5DCAA5;border-radius:4px;padding:3px 5px;text-align:right;background:#fff;color:#085041;"><span style="font-size:9px;color:#1D9E75;">h</span></div></div><div class="aloc-default-row"><span class="aloc-default-lbl">Arquitetos — padrão por dia útil</span><div class="aloc-def-ctrl"><button class="aloc-def-btn" onclick="alocMudarDefault(-1)">−</button><span class="aloc-def-val" id="aloc-def-num">${_alocDefault}</span><button class="aloc-def-btn" onclick="alocMudarDefault(1)">+</button><span style="font-size:9px;color:#5A8ACC;margin-left:3px;">arq/dia</span></div></div><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#8A95A8;letter-spacing:.06em;margin-bottom:5px;">Ajuste dia a dia</div><div class="aloc-cal-scroll"><div style="display:flex;gap:2px;margin-bottom:3px;">${y}</div><div id="aloc-cal-semanas">${E}</div></div><div class="aloc-legend"><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#EEF2FA;border:1px solid #B5D4F4;"></div>Padrão</div><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#1A5294;"></div>Ajustado</div><div class="aloc-legend-item"><div class="aloc-legend-dot" style="background:#F8F8F8;border:1px solid #EEE;"></div>Inativo</div></div><div class="aloc-totals" id="aloc-totals"><div class="aloc-total-card"><div class="aloc-total-val" id="aloc-tot-ad">${D}</div><div class="aloc-total-lbl">Arq-dias</div></div><div class="aloc-total-card hl"><div class="aloc-total-val" id="aloc-tot-h">${w}</div><div class="aloc-total-lbl">Horas ARQ</div></div><div class="aloc-total-card"><div class="aloc-total-val" id="aloc-tot-m">${S}</div><div class="aloc-total-lbl">Média/dia</div></div></div><div class="aloc-save"><button class="aloc-btn-cancel" onclick="gClosePop()">Cancelar</button><button class="aloc-btn-save" onclick="alocSalvar()">Salvar</button></div>`}function alocAbrir(t,e){t&&"proj"===t.type&&t.subId&&(_alocDs=t)}function alocFechar(){gClosePop(),_alocDs=null}function alocRefreshCal(){if(!_alocDs)return;const t=gSt.projFases.find(t=>t.id==_alocDs.phId),e=t?.rows?.[_alocDs.rowId]?.subs?.[_alocDs.subId];if(!e)return;const dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0"),o=[];let a=new Date(e.start);for(;a<=e.end;){const t=dkFmt(a),e=a.getDay(),n=0===e||6===e,r=CALENDARIO.isNaoUtil(a);if(!n&&!r){o.push(t);const e=document.getElementById("aloc-cell-"+t);if(e){const o=void 0!==_alocOverride[t],a=alocGetDia(t),n=o?"#1A5294":"#B5D4F4";e.style.background=o?"#1A5294":"#EEF2FA",e.style.borderColor=n;const r=e.querySelectorAll("span");r[0]&&(r[0].style.color=o?"rgba(255,255,255,.6)":"#8A95A8"),r[1]&&(r[1].textContent=a,r[1].style.color=o?"#fff":"#1A5294")}}a=G.addD(a,1)}const n=o.reduce((t,e)=>t+alocGetDia(e),0),r=8*n,i=o.length?(n/o.length).toFixed(1):"0",setEl=(t,e)=>{const o=document.getElementById(t);o&&(o.textContent=e)};setEl("aloc-tot-ad",n),setEl("aloc-tot-h",r),setEl("aloc-tot-m",i)}function alocGetTotais(t,e,o){if(!o)return null;const a=gSt.projFases.find(e=>e.id==t),n=a?.rows?.[e]?.subs?.[o];if(!n)return null;const r=`${t}/${e}/${o}`,i=ESTADO.alocacaoARQ?.[r],s=i?.default??1,d=i?.override??{},dkFmt=t=>t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0");let l=0,c=0,p=new Date(n.start);for(;p<=n.end;){if(!CALENDARIO.isNaoUtil(p)){const t=dkFmt(p);l+=void 0!==d[t]?d[t]:s,c++}p=G.addD(p,1)}return{arqDias:l,horas:8*l,nDias:c,media:c?+(l/c).toFixed(1):0}}function cfgBuildEntregaveis(){ativRender("arq"),ativRender("tec");const t=document.getElementById("cfg-andares-modo-wrap");t&&(t.style.display=(_nFasesProj||1)>1?"":"none")}function cfgBuildAndaresTable(){const t=document.getElementById("cfg-andares-wrap");if(!t)return;if(_nFasesProj<=1||0===CFG_ANDARES.length)return t.style.display="none",void(t.innerHTML="");const e=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],o="parcial"===_cfgAndarModo;let a='<th style="background:var(--bg-surface);color:var(--txt-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:8px 14px;text-align:left;border-bottom:1px solid var(--border);">Andar</th>';for(let t=1;t<=_nFasesProj;t++){const o=e[(t-1)%e.length],n=gSt.projFases[t-1]?.nome?.trim()||`Fase ${t}`;a+=`<th style="background:${o};font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;min-width:70px;border-bottom:1px solid ${o};padding:8px 6px;cursor:pointer;" onclick="gEditFaseNome('proj',${t},'${(gSt.projFases[t-1]?.nome||"").replace(/'/g,"")}',this)" title="Clique para renomear"><span style="display:flex;align-items:center;justify-content:center;gap:4px;">${n}<span style="opacity:.7;font-size:10px;">✎</span></span></th>`}let n="";CFG_ANDARES.forEach(t=>{let a=`<td style="padding:7px 14px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--txt);">${t}</td>`;for(let t=1;t<=_nFasesProj;t++){const n=e[(t-1)%e.length];if(o){const e=1===t;a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:6px;"><div class="cfg-mx-cb${e?" on":""}" onclick="this.classList.toggle('on')" style="border-color:${n};${e?"background:"+n+";border-color:"+n+";":""}"></div></td>`}else a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:6px;"><div onclick="cfgAndarRadioClick(this,${t})" style="width:18px;height:18px;border-radius:50%;border:2px solid ${n};margin:auto;cursor:pointer;background:${1===t?n:"transparent"};transition:all .15s;" data-fase="${t}"></div></td>`}n+=`<tr>${a}</tr>`}),t.style.display="",t.innerHTML=`<div class="cfg-card"><div class="cfg-card-hdr"><div><div class="cfg-card-title">Distribuição de andares por fase</div><div class="cfg-card-desc">${o?"Selecione todas as fases com trabalho em cada andar":"Selecione em qual fase cada andar será desenvolvido"}</div></div></div><div style="overflow-x:auto;"><table class="cfg-matrix-table"><thead><tr>${a}</tr></thead><tbody>${n}</tbody></table></div></div>`}window.alocSaveCota=function(t){ESTADO.equipeARQ||(ESTADO.equipeARQ={chArq:120,chDir:280,chGer:180,cotas:{}}),ESTADO.equipeARQ.cotas||(ESTADO.equipeARQ.cotas={});const e=parseFloat(document.getElementById("aloc-dir")?.value)||0,o=parseFloat(document.getElementById("aloc-ger")?.value)||0;ESTADO.equipeARQ.cotas[t]={dir:e,ger:o}},window.alocToggleDia=function(t){const e=getLimiteArq(),o=alocGetDia(t),a=o>=e?1:o+1;a===_alocDefault?delete _alocOverride[t]:_alocOverride[t]=a,alocRefreshCal()},window.alocMudarDefault=function(t){_alocDefault=Math.max(0,_alocDefault+t),document.getElementById("aloc-def-num").textContent=_alocDefault,alocRefreshCal()},window.cfgToggleEntregavel=function(t,e,o){_cfgEntregaveis[t]||(_cfgEntregaveis[t]=Array(4).fill(!0)),_cfgEntregaveis[t][e]=!_cfgEntregaveis[t][e],o.classList.toggle("on",_cfgEntregaveis[t][e])},window.cfgReplicarFase1=function(){_ativListas.arq.forEach(t=>{const e=!1!==_cfgEntregaveis[t.id]?.[0];for(let o=1;o<_nFasesProj;o++)_cfgEntregaveis[t.id]||(_cfgEntregaveis[t.id]=Array(4).fill(!0)),_cfgEntregaveis[t.id][o]=e}),ativRender("arq")},window.cfgSetAndarModo=function(t){_cfgAndarModo=t,document.getElementById("cfg-andar-modo-sim")?.classList.toggle("sel","inteiro"===t),document.getElementById("cfg-andar-modo-nao")?.classList.toggle("sel","parcial"===t),cfgBuildAndaresTable()},window.cfgAndarRadioClick=function(t,e){const o=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],a=t.closest("tr");a&&(a.querySelectorAll("[data-fase]").forEach(t=>{t.style.background="transparent"}),t.style.background=o[(e-1)%o.length])};let _nFasesObra=1;function cfgSelectFasesObra(t){for(document.querySelectorAll("#cfg-seg-nobra .cfg-seg-btn").forEach(t=>t.classList.remove("sel")),t.classList.add("sel"),_nFasesObra=parseInt(t.dataset.n)||1,ESTADO.cfg.nObra=_nFasesObra;ESTADO.cfg.obraFases.length<_nFasesObra;)ESTADO.cfg.obraFases.push({inicio:"",prazo:"56",andares:""});ESTADO.cfg.obraFases.length=_nFasesObra,cfgBuildVinculoObraProj(),renderObraFases(),motorRecalc(),"function"==typeof gRender&&gRender()}function cfgBuildVinculoObraProj(){const t=document.getElementById("cfg-vinculo-obra-wrap");if(!t)return;const e=document.getElementById("cfg-vinculo-obra-proj")?.checked;if(!e||_nFasesProj<=1)return void(t.style.display="none");t.style.display="";const o=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"];let a='<th style="background:var(--bg-surface);color:var(--txt-muted);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:7px 12px;text-align:left;border-bottom:1px solid var(--border);">Fase Obra</th>';for(let t=1;t<=_nFasesProj;t++){const e=o[(t-1)%o.length];a+=`<th style="background:${e};font-size:10px;font-weight:700;text-transform:uppercase;color:#fff;text-align:center;min-width:70px;border-bottom:1px solid ${e};padding:7px 6px;" title="Nome herdado da aba Arquitetura">${gSt.projFases[t-1]?.nome?.trim()||`ARQ ${t}`}</th>`}let n="";for(let t=1;t<=_nFasesObra;t++){const e=gSt.obraFases[t-1]?.nome?.trim()||`Obra ${t}`;let a=`<td style="padding:6px 12px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--txt);cursor:pointer;white-space:nowrap;" onclick="gEditFaseNome('obra',${t},'${(gSt.obraFases[t-1]?.nome||"").replace(/'/g,"")}',this)" title="Clique para renomear"><span style="display:flex;align-items:center;gap:5px;">${e}<span style="opacity:.5;font-size:10px;">✎</span></span></td>`;for(let e=1;e<=_nFasesProj;e++){const n=o[(e-1)%o.length];a+=`<td style="text-align:center;border-bottom:1px solid var(--border);padding:5px;"><div onclick="cfgVinculoObraClick(this,${t},${e})" data-fo="${t}" data-fp="${e}" style="width:18px;height:18px;border-radius:50%;border:2px solid ${n};margin:auto;cursor:pointer;background:${t===e?n:"transparent"};transition:all .15s;"></div></td>`}n+=`<tr>${a}</tr>`}t.innerHTML=`<div style="overflow-x:auto;"><table class="cfg-matrix-table"><thead><tr>${a}</tr></thead><tbody>${n}</tbody></table></div>`}window.cfgToggleVinculoObraProj=function(){const t=document.getElementById("cfg-vinculo-obra-proj")?.checked;ESTADO.cfg.vinculoObraProj=!!t,cfgBuildVinculoObraProj(),motorRecalc(),"function"==typeof gRender&&gRender()},window.cfgVinculoObraClick=function(t,e,o){const a=[COR.ARQ_MOM,"#2A5AA8","#8A3AA8","#2A8A5A"],n=document.getElementById("cfg-vinculo-obra-wrap");n&&(n.querySelectorAll(`[data-fo="${e}"]`).forEach(t=>t.style.background="transparent"),t.style.background=a[(o-1)%a.length])},window.cfgTogglePreObra=function(){const t=document.getElementById("cfg-pre-obra-on")?.checked,e=document.getElementById("cfg-pre-obra-wrap");e&&(e.style.display=t?"":"none"),ESTADO.cfg.preObra=!!t,ESTADO.cfg.preObraDias=parseInt(document.getElementById("cfg-pre-obra-dias")?.value)||10,"function"==typeof gRender&&gRender()};let _sbCollapsed=!1;function vizSidebarToggle(){_sbCollapsed=!_sbCollapsed,document.querySelectorAll(".viz-sidebar").forEach(t=>t.classList.toggle("collapsed",_sbCollapsed)),document.querySelectorAll(".pane-with-sidebar").forEach(t=>t.classList.toggle("sb-collapsed",_sbCollapsed)),document.querySelectorAll(".viz-sb-toggle-icon").forEach(t=>{t.textContent=_sbCollapsed?"◀":"▶"}),setTimeout(()=>_redrawAbaAtiva(),200)}function vizFitVertical(){if("efetivo"===abaAtiva){const t=document.getElementById("pane-efetivo");if(!t)return;const e=44,o=20,a=4,n=26,r=t.clientHeight-34,i="separado"===_eftModoFases&&gSt.obraFases.length>1;let s=0,d=0;if((i?gSt.obraFases:[gSt.obraFases[0]]).forEach((t,r)=>{i&&(s+=n),s+=e+o+a,r>0&&i&&(s+=12);const l=(t.disciplinas||[]).filter(t=>!1!==t.ativo);d+=l.length}),!d)return;const l=Math.max(10,Math.floor((r-s)/d));_eftRowIdx=EFT_ROW_STEPS.reduce((t,e,o)=>Math.abs(e-l)<Math.abs(EFT_ROW_STEPS[t]-l)?o:t,0),renderEfetivo()}else if("histograma"===abaAtiva){const t=document.getElementById("pane-histograma");if(!t)return;const e="separado"===_histModoFases&&gSt.obraFases.length>1,o=e?gSt.obraFases.length:1,a=Math.max(80,Math.floor((t.clientHeight-38-((76+(e?26:0))*o+(e?12*(o-1):0)))/o));_histHIdx=HIST_H_STEPS.reduce((t,e,o)=>Math.abs(e-a)<Math.abs(HIST_H_STEPS[t]-a)?o:t,0),renderHistograma()}else if("cronograma"===abaAtiva){const t=document.getElementById("gantt-root");if(!t)return;const e=gFasesVinculadas(),o=gSt.projFases.length,a=gSt.obraFases.length;let n=0;n+=3,gSt.projFases.forEach(t=>{(o>1||e)&&(n+=.7),n+=2,t.expanded?.arq&&(n+=Object.keys(t.rows?.arq?.subs||{}).length),t.expanded?.tec&&(n+=Object.keys(t.rows?.tec?.subs||{}).length),e&&(n+=1,gSt.obraFases[t.id-1]?.expanded&&(n+=(gSt.obraFases[t.id-1].disciplinas||[]).filter(t=>!1!==t.ativo).length))}),e||(n+=.5,gSt.obraFases.forEach(t=>{a>1&&(n+=.7),n+=1,t.expanded&&(n+=(t.disciplinas||[]).filter(t=>!1!==t.ativo).length)})),ESTADO.cfg.preObra&&(n+=1),n=Math.max(n,4);const r=Math.max(14,Math.min(52,Math.floor((t.clientHeight-40)/n)));G.ROW_H=r,G.SUB_H=Math.min(r+2,56),gRender()}}function buildVizSidebar(){const t=document.getElementById("viz-sidebar-global");t&&t.remove();const e=document.createElement("div");e.id="viz-sidebar-global",e.className="viz-sidebar"+(_sbCollapsed?" collapsed":""),e.innerHTML=`\n <div class="viz-sb-toggle" onclick="vizSidebarToggle()" title="${_sbCollapsed?"Expandir":"Recolher"} controles"><span class="viz-sb-toggle-icon">${_sbCollapsed?"◀":"▶"}</span></div><div class="viz-sb-groups"><div class="viz-sb-group"><button class="viz-sb-btn accent" onclick="vizFitH()" title="Ajustar colunas à tela">⊡</button><button class="viz-sb-btn" onclick="vizZoomColOut()" title="Reduzir colunas">−</button><button class="viz-sb-btn" onclick="vizZoomColIn()" title="Ampliar colunas">+</button><div class="viz-sb-label">col</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn accent" onclick="vizFitVertical()" title="Ajustar linhas à tela">⊞</button><button class="viz-sb-btn" onclick="vizZoomRowOut()" title="Reduzir linhas">−</button><button class="viz-sb-btn" onclick="vizZoomRowIn()" title="Ampliar linhas">+</button><div class="viz-sb-label">lin</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn" onclick="vizFontOut()" title="Reduzir fonte" style="font-size:10px;">A−</button><button class="viz-sb-btn" onclick="vizFontIn()" title="Aumentar fonte" style="font-size:11px;">A+</button><div class="viz-sb-label">font</div></div><div class="viz-sb-sep"></div><div class="viz-sb-group"><button class="viz-sb-btn" onclick="abrirCfgVisuais()" title="Paletas de cores" style="font-size:15px;">◐</button><div class="viz-sb-label">cor</div></div></div>\n `;const o=document.getElementById("tab-content");o&&o.appendChild(e)}function vizFitH(){"cronograma"===abaAtiva?zoomReset():eftZoomFit()}function vizZoomColIn(){"cronograma"===abaAtiva?gZoomIn():eftZoomIn()}function vizZoomColOut(){"cronograma"===abaAtiva?gZoomOut():eftZoomOut()}function vizZoomRowIn(){"cronograma"===abaAtiva?(G.ROW_H=Math.min(G.ROW_H+4,56),G.SUB_H=Math.min(G.SUB_H+4,60),gRender()):"efetivo"===abaAtiva?eftRowZoomIn():"histograma"===abaAtiva&&histHZoomIn()}function vizZoomRowOut(){"cronograma"===abaAtiva?(G.ROW_H=Math.max(G.ROW_H-4,14),G.SUB_H=Math.max(G.SUB_H-4,16),gRender()):"efetivo"===abaAtiva?eftRowZoomOut():"histograma"===abaAtiva&&histHZoomOut()}function vizFontIn(){"cronograma"!==abaAtiva&&eftFontIn()}function vizFontOut(){"cronograma"!==abaAtiva&&eftFontOut()}function abrirModalCfg(t){0===Object.keys(_cfgEntregaveis).length&&cfgInitEntregaveis(),cfgRenderAndares(),cfgRenderPerfil(),cfgAplicarPerfil(),cfgBuildEntregaveis(),cfgBuildAndaresTable(),cfgBuildVinculoObraProj(),renderFeriadosModal();const e=document.getElementById("info-arquivo");if(e){const t=localStorage.getItem("aw_planejamento_v1"),o=t?(t.length/1024).toFixed(1)+" KB":"—";e.innerHTML=`Dados em localStorage: <strong>${o}</strong><br>Última gravação: <strong>${ESTADO.lastSaved||"—"}</strong>`}t&&switchCfgTab(t),document.getElementById("modal-cfg-overlay").classList.add("open")}function fecharModalCfg(t){t&&t.target!==document.getElementById("modal-cfg-overlay")||document.getElementById("modal-cfg-overlay").classList.remove("open")}function switchCfgTab(t){const e=["identificacao","perfil","projeto","obra","feriados","geral"];document.querySelectorAll(".mcfg-tab").forEach((o,a)=>{o.classList.toggle("active",e[a]===t)}),document.querySelectorAll(".mcfg-pane").forEach(e=>{e.classList.toggle("active",e.id==="mcfg-"+t)}),"projeto"===t&&ativInitEditor("proj"),"obra"===t&&(ativInitEditor("obra"),renderObraFases())}function adicionarFeriado(){const t=document.getElementById("feriado-data"),e=document.getElementById("feriado-desc"),o=t.value,a=e.value.trim();o?(ESTADO.feriadosCustom||(ESTADO.feriadosCustom=[]),ESTADO.feriadosCustom.push({data:o,desc:a||"Paralisação"}),t.value="",e.value="",renderFeriadosModal(),onCfgChange()):showToast("Selecione uma data")}function removerFeriado(t){ESTADO.feriadosCustom.splice(t,1),renderFeriadosModal(),onCfgChange()}function renderFeriadosModal(){const t=document.getElementById("lista-feriados-custom");if(!t)return;const e=ESTADO.feriadosCustom||[];t.innerHTML=0===e.length?'<div style="font-size:11px;color:var(--txt-dim);font-family:var(--body);">Nenhuma data adicionada.</div>':e.map((t,e)=>`\n <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--bg-surface2);border-radius:5px;"><span style="font-family:var(--font);font-size:11px;color:var(--accent);min-width:72px;">${t.data.split("-").reverse().join("/")}</span><span style="flex:1;font-size:11px;color:var(--txt);">${t.desc}</span><button onclick="removerFeriado(${e})" style="background:none;border:none;color:var(--txt-muted);cursor:pointer;font-size:14px;padding:0 4px;">✕</button></div>`).join("");const o=document.getElementById("lista-feriados-nacionais");if(o){const t=(new Date).getFullYear(),e=CALENDARIO.getFeriadosAno?CALENDARIO.getFeriadosAno(t):[];o.innerHTML=e.length?e.map(t=>`${t.data} — ${t.nome}`).join("<br>"):'<span style="color:var(--txt-dim);">Calculados automaticamente pelo sistema.</span>'}}let _pAba='cronograma';function abrirModalImpressao(){document.getElementById('modal-print')?.remove();const ov=document.createElement('div');ov.id='modal-print';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9500;display:flex;align-items:center;justify-content:center;padding:16px;';ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});const cod=ESTADO.meta?.codigo||'';const nome=ESTADO.meta?.nome||'';const titulo=cod&&nome?cod+' \u2014 '+nome:cod||nome||'Planejamento de Obra';ov.innerHTML='<div style="background:var(--bg-panel);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.5);width:100%;max-width:580px;display:flex;flex-direction:column;overflow:hidden;"><div style="display:flex;align-items:center;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg-surface);"><span style="font-family:var(--font);font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--txt);flex:1;">\uD83D\uDDA8 Imprimir</span><span style="font-size:11px;color:var(--txt-muted);">'+titulo+'</span><button onclick="document.getElementById(\'modal-print\').remove()" style="width:28px;height:28px;border:1px solid var(--border);background:var(--bg-surface2);border-radius:6px;cursor:pointer;font-size:15px;color:var(--txt-muted);">\u2715</button></div><div style="padding:16px;display:flex;flex-direction:column;gap:8px;"><button onclick="_pImp(\'cronograma\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDCC5</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Cronograma</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A3 paisagem \u00b7 todas as fases</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button><button onclick="_pImp(\'efetivo\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDC65</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Efetivo</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A3 paisagem \u00b7 mapa de calor</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button><button onclick="_pImp(\'arquitetura\')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;width:100%;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\'"><span style="font-size:22px;">\uD83D\uDCC0</span><div style="flex:1;"><div style="font-family:var(--font);font-size:12px;font-weight:700;color:var(--txt);">Arquitetura</div><div style="font-size:10px;color:var(--txt-muted);margin-top:2px;">A4 retrato \u00b7 etapas ARQ e TEC</div></div><span style="font-family:var(--font);font-size:10px;font-weight:700;color:var(--accent);">Imprimir \u2192</span></button></div></div>';document.body.appendChild(ov);}
function _pImp(aba){_pAba=aba;document.getElementById('modal-print')?.remove();let ps=document.getElementById('_pPageStyle');if(!ps){ps=document.createElement('style');ps.id='_pPageStyle';document.head.appendChild(ps);}ps.textContent=aba!=='arquitetura'?'@media print{@page{size:A3 landscape;margin:8mm;}#_pFrame{display:block!important;}body>*:not(#_pFrame){display:none!important;}}':'@media print{@page{size:A4 portrait;margin:8mm;}#_pFrame{display:block!important;}body>*:not(#_pFrame){display:none!important;}}';let pf=document.getElementById('_pFrame');if(!pf){pf=document.createElement('div');pf.id='_pFrame';pf.style.display='none';document.body.appendChild(pf);}pf.innerHTML='';const cod=ESTADO.meta?.codigo||'';const nome=ESTADO.meta?.nome||'';const hdr='<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#1A2535;flex-shrink:0;"><span style="font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#00DEDB;">'+(cod&&nome?cod+' \u2014 '+nome:cod||nome||'Planejamento de Obra')+'</span><span style="font-family:Oswald,sans-serif;font-size:8px;color:rgba(255,255,255,.35);">'+new Date().toLocaleDateString('pt-BR')+'</span></div>';if(aba==='cronograma'){const src=document.getElementById('gantt-root');if(src&&src.children.length){pf.style.cssText='display:none;width:100%;height:100vh;flex-direction:column;background:#fff;';pf.innerHTML=hdr+'<div style="flex:1;overflow:hidden;">'+src.innerHTML+'</div>';}}else if(aba==='efetivo'){const src=document.getElementById('pane-efetivo');if(src&&src.querySelector('svg')){pf.style.cssText='display:none;width:100%;height:100vh;flex-direction:column;background:#fff;';pf.innerHTML=hdr+'<div style="flex:1;overflow:hidden;">'+src.innerHTML+'</div>';}}else{pf.style.cssText='display:none;width:100%;background:#fff;font-family:Oswald,sans-serif;';let rows='';(gSt.projFases||[]).forEach(fase=>{const nf=fase.nome?.trim()||'Fase '+fase.id;rows+='<tr><td colspan="5" style="padding:5px 8px;font-size:10px;font-weight:700;color:#fff;background:#1A2535;letter-spacing:.06em;">'+nf.toUpperCase()+'</td></tr>';G.SUB_IDS.forEach(id=>{const s=fase.rows.arq?.subs?.[id];if(!s)return;rows+='<tr style="border-bottom:1px solid #F0F2F4;"><td style="padding:3px 8px 3px 14px;font-size:9px;font-weight:700;color:#1A5294;">ARQ</td><td style="padding:3px 8px;font-size:10px;color:#1A2535;">'+(G.SUB_NAMES[id]||id)+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(new Date(s.start))+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(new Date(s.end))+'</td><td style="padding:3px 8px;font-size:9px;color:#999;text-align:center;">'+CALENDARIO.contarDU(new Date(s.start),new Date(s.end))+' DU</td></tr>';});G.TEC_IDS.forEach(id=>{const s=fase.rows.tec?.subs?.[id];if(!s)return;rows+='<tr style="border-bottom:1px solid #F0F2F4;"><td style="padding:3px 8px 3px 14px;font-size:9px;font-weight:700;color:#2A7A5A;">TEC</td><td style="padding:3px 8px;font-size:10px;color:#1A2535;">'+(G.TEC_NAMES[id]||id)+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(new Date(s.start))+'</td><td style="padding:3px 8px;font-size:9px;color:#666;text-align:center;">'+G.fmtBR(new Date(s.end))+'</td><td style="padding:3px 8px;font-size:9px;color:#999;text-align:center;">'+CALENDARIO.contarDU(new Date(s.start),new Date(s.end))+' DU</td></tr>';});});pf.innerHTML=hdr+'<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#F4F6F8;"><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:left;">Grupo</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:left;">Etapa</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">In\u00edcio</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">T\u00e9rmino</th><th style="padding:5px 8px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8A95A8;text-align:center;">Dur.</th></tr></thead><tbody>'+rows+'</tbody></table>';}setTimeout(()=>{window.print();setTimeout(()=>{pf.innerHTML='';pf.style.display='none';},2000);},150);}
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// PLANO FINO v4.03 — 4 colunas
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
  '#185FA5','#2A8A5A','#8A3AA8','#C4580A',
  '#0A7A8A','#8A5A0A','#A83A5A','#3A5AA8'
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

function _pfInicializar() {
  if (ESTADO.planoFino) {
    _pfDados = ESTADO.planoFino;
    // Migrar formato antigo (sem cargo)
    _pfDados.arquitetos = _pfDados.arquitetos.map((a,i) => ({
      id: a.id, nome: a.nome, cargo: a.cargo||'',
      cor: a.cor || PF_CORES[i % PF_CORES.length]
    }));
  } else {
    _pfDados = {
      arquitetos: PF_ARQUITETOS_DEFAULT.map((a, i) => ({
        id: 'arq_' + i, nome: a.nome, cargo: a.cargo, cor: PF_CORES[i % PF_CORES.length]
      })),
      etapas: {}
    };
  }
  _pfEtapaSel = null;
  _pfArqDrag = null;
  // Mês inicial = mês da primeira etapa ARQ
  const fase = gSt.projFases[0];
  const subIds = G.SUB_IDS || [];
  let primeiraData = null;
  for (const id of subIds) {
    const sub = fase?.rows?.arq?.subs?.[id];
    if (sub?.start) { primeiraData = new Date(sub.start); break; }
  }
  const ref = primeiraData || new Date();
  _pfCalMes = { ano: ref.getFullYear(), mes: ref.getMonth() };
}

function _pfSalvar() {
  ESTADO.planoFino = _pfDados;
  salvarDados();
}

function abrirPlanoFino() {
  _pfInicializar();
  document.getElementById('pf-overlay').style.display = 'flex';
  _pfRender();
}

function fecharPlanoFino() {
  document.getElementById('pf-overlay').style.display = 'none';
}

// ── Render ────────────────────────────────────────────────
function _pfRender() {
  const body = document.getElementById('pf-body');
  if (!body) return;

  const subIds = G.SUB_IDS || [];
  const subNames = G.SUB_NAMES || {};
  const fase = gSt.projFases[0];
  const cor = i => PF_CORES[i % PF_CORES.length];
  const ini2 = nome => nome.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const fmtD = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});

  // ── COL 1: Arquitetos ──────────────────────────────────
  const col1 = `
    <div style="border-right:0.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);">Arquitetos</div>
      <div style="padding:8px 10px;flex:1;overflow-y:auto;">
        <p style="font-size:11px;color:var(--txt-dim);margin-bottom:8px;">Arraste para a etapa →</p>
        ${_pfDados.arquitetos.map((arq,i) => `
          <div class="pf-arq-card" draggable="true" ondragstart="_pfDragStart(${i},event)" ondragend="_pfDragEnd(event)"
            style="display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:7px;border:0.5px solid var(--border);cursor:grab;background:var(--bg-panel);margin-bottom:4px;transition:opacity .15s;">
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none" style="opacity:.3;flex-shrink:0;color:var(--txt-muted);">
              <circle cx="2" cy="2" r="1.2" fill="currentColor"/><circle cx="6" cy="2" r="1.2" fill="currentColor"/>
              <circle cx="2" cy="6" r="1.2" fill="currentColor"/><circle cx="6" cy="6" r="1.2" fill="currentColor"/>
              <circle cx="2" cy="10" r="1.2" fill="currentColor"/><circle cx="6" cy="10" r="1.2" fill="currentColor"/>
            </svg>
            <div style="width:26px;height:26px;border-radius:50%;background:${arq.cor}22;border:1.5px solid ${arq.cor};display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:10px;font-weight:700;color:${arq.cor};flex-shrink:0;">${ini2(arq.nome)}</div>
            <div style="min-width:0;">
              <div style="font-size:12px;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${arq.nome}</div>
              <div style="font-size:10px;color:var(--txt-dim);">${arq.cargo||''}</div>
            </div>
          </div>`).join('')}
        <button onclick="_pfAddArquiteto()" style="margin-top:6px;font-size:11px;color:var(--txt-dim);background:none;border:none;cursor:pointer;padding:4px 2px;">+ novo arquiteto</button>
      </div>
    </div>`;

  // ── COL 2: Etapas ──────────────────────────────────────
  let etapasHTML = '';
  subIds.forEach(subId => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return;
    const nome = subNames[subId] || subId;
    const etDados = _pfDados.etapas[subId] || { arquitetos: [], tarefas: {} };
    const arqsNaEtapa = (etDados.arquitetos||[]).map(aid => _pfDados.arquitetos.find(a=>a.id===aid)).filter(Boolean);
    const isSel = _pfEtapaSel === subId;
    const du = CALENDARIO.contarDU(new Date(sub.start), new Date(sub.end));
    const etIdx = subIds.indexOf(subId);
    const etCor = PF_CORES[etIdx % PF_CORES.length];

    const chips = arqsNaEtapa.length > 0
      ? arqsNaEtapa.map(arq => `<div style="width:22px;height:22px;border-radius:50%;background:${arq.cor}22;border:1.5px solid ${arq.cor};display:flex;align-items:center;justify-content:center;font-family:var(--font);font-size:9px;font-weight:700;color:${arq.cor};" title="${arq.nome}">${ini2(arq.nome)}</div>`).join('')
        + `<div onclick="event.stopPropagation()" class="pf-drop-zone" data-subid="${subId}" ondragover="_pfDragOver(event)" ondrop="_pfDrop('${subId}',event)" ondragleave="_pfDragLeave(event)" style="width:22px;height:22px;border-radius:50%;border:1.5px dashed var(--border-md);display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--txt-dim);cursor:pointer;">+</div>`
      : `<div class="pf-drop-zone" data-subid="${subId}" ondragover="_pfDragOver(event)" ondrop="_pfDrop('${subId}',event)" ondragleave="_pfDragLeave(event)"
          style="border:1.5px dashed var(--border-md);border-radius:6px;padding:4px 10px;font-size:10px;color:var(--txt-dim);cursor:pointer;display:flex;align-items:center;gap:4px;">
          solte aqui
        </div>`;

    etapasHTML += `
      <div onclick="_pfSelEtapa('${subId}')"
        style="padding:10px 14px;border-bottom:0.5px solid var(--border);cursor:pointer;display:grid;grid-template-columns:105px 52px 1fr;gap:8px;align-items:center;
        ${isSel ? `background:${etCor}0D;border-left:3px solid ${etCor};` : 'border-left:3px solid transparent;'}
        transition:background .12s;">
        <div>
          <div style="font-family:var(--font);font-size:13px;font-weight:700;color:${isSel ? etCor : 'var(--txt)'};">${nome}</div>
          <div style="font-size:10px;color:var(--txt-muted);">${fmtD(sub.start)}–${fmtD(sub.end)}</div>
        </div>
        <div style="font-family:var(--font);font-size:12px;font-weight:700;color:${isSel ? etCor : 'var(--txt-muted)'};">${du} DU</div>
        <div style="display:flex;gap:3px;align-items:center;flex-wrap:wrap;">${chips}</div>
      </div>`;
  });

  const col2 = `
    <div style="border-right:0.5px solid var(--border);display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:8px 14px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);display:grid;grid-template-columns:105px 52px 1fr;gap:8px;">
        <span>Etapa</span><span>Prazo</span><span>Responsáveis</span>
      </div>
      <div style="flex:1;overflow-y:auto;">${etapasHTML}</div>
    </div>`;

  // ── COL 3: Tarefas ─────────────────────────────────────
  let col3Inner = '';
  if (_pfEtapaSel) {
    const etIdx = subIds.indexOf(_pfEtapaSel);
    const etCor = PF_CORES[etIdx % PF_CORES.length];
    const nomeSel = subNames[_pfEtapaSel] || _pfEtapaSel;
    const etDados = _pfDados.etapas[_pfEtapaSel] || { arquitetos:[], tarefas:{} };
    const tarefasPadrao = PF_TAREFAS_DEFAULT[_pfEtapaSel] || [];
    const tarefasCustom = Object.keys(etDados.tarefas||{}).filter(t => !tarefasPadrao.includes(t));
    const allTarefas = [...tarefasPadrao, ...tarefasCustom];

    const tarefasList = allTarefas.map(t => {
      const ativa = etDados.tarefas?.[t] !== false;
      return `<div onclick="_pfToggleTarefa('${_pfEtapaSel}','${t.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;
        border:0.5px solid ${ativa ? etCor+'44' : 'var(--border)'};
        background:${ativa ? etCor+'0D' : 'transparent'};
        margin-bottom:4px;cursor:pointer;transition:all .12s;">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="${ativa ? etCor : 'var(--txt-dim)'}">
          ${ativa
            ? '<rect x="1" y="1" width="12" height="12" rx="2" stroke-width="1.5" fill="'+etCor+'22"/><path d="M3.5 7l2.5 2.5 4.5-4.5" stroke-width="1.5" stroke-linecap="round"/>'
            : '<rect x="1" y="1" width="12" height="12" rx="2" stroke-width="1.5"/>'}
        </svg>
        <span style="font-size:12px;color:${ativa ? 'var(--txt)' : 'var(--txt-muted)'};">${t}</span>
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

  // ── COL 4: Calendário ──────────────────────────────────
  const { ano, mes } = _pfCalMes;
  const nomeMes = new Date(ano, mes, 1).toLocaleDateString('pt-BR', {month:'short', year:'numeric'});
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes+1, 0).getDate();
  const hoje = new Date();

  // Mapear etapas para cores por data ISO
  const etapasDoDia = {};
  subIds.forEach((subId, idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return;
    const etCor = PF_CORES[idx % PF_CORES.length];
    let cur = new Date(sub.start);
    const fim = new Date(sub.end);
    while (cur <= fim) {
      if (!CALENDARIO.isNaoUtil(cur)) {
        const iso = G.fmtISO(cur);
        etapasDoDia[iso] = etCor;
      }
      cur = G.addD(cur, 1);
    }
  });

  const total = Math.ceil((primeiroDia + ultimoDia) / 7) * 7;
  let cells = ''; let dia = 1;
  for (let cel = 0; cel < total; cel++) {
    if (cel % 7 === 0) cells += '<tr>';
    const dow = cel % 7;
    const fds = dow === 0 || dow === 6;
    if (cel < primeiroDia || dia > ultimoDia) {
      cells += `<td style="padding:1px;text-align:center;font-size:10px;opacity:.2;">${cel < primeiroDia ? '' : dia++}</td>`;
    } else {
      const d2 = new Date(ano, mes, dia);
      const iso = G.fmtISO(d2);
      const etCor = etapasDoDia[iso];
      const isHoje = d2.toDateString() === hoje.toDateString();
      if (etCor) {
        cells += `<td style="padding:1px;"><div style="background:${etCor};border-radius:3px;color:white;font-size:10px;font-weight:500;text-align:center;padding:2px 0;${isHoje?'outline:2px solid var(--accent);':''}${fds?'opacity:.5;':''}">${dia}</div></td>`;
      } else {
        cells += `<td style="padding:1px;text-align:center;font-size:10px;color:${fds?'var(--txt-dim)':'var(--txt)'};opacity:${fds?.4:1};${isHoje?'font-weight:700;color:var(--accent);':''}">${dia}</td>`;
      }
      dia++;
    }
    if (cel % 7 === 6) cells += '</tr>';
  }

  // Legenda: etapas com datas no mês atual
  const legendaEtapas = subIds.map((subId, idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return '';
    const start = new Date(sub.start);
    const end = new Date(sub.end);
    if (start.getMonth() > mes+1 || end.getMonth() < mes-1) return '';
    const etCor = PF_CORES[idx % PF_CORES.length];
    return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
      <div style="width:8px;height:8px;border-radius:2px;background:${etCor};flex-shrink:0;"></div>
      <span style="font-size:10px;color:var(--txt-muted);">${subNames[subId]||subId}</span>
    </div>`;
  }).join('');

  const col4 = `
    <div style="display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:8px 12px;font-family:var(--font);font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-muted);background:var(--bg-surface);border-bottom:0.5px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
        <span style="text-transform:capitalize;">${nomeMes}</span>
        <div style="display:flex;gap:4px;">
          <button onclick="_pfCalNav(-1)" style="width:20px;height:20px;background:var(--bg-surface2);border:0.5px solid var(--border);border-radius:4px;cursor:pointer;font-size:12px;color:var(--txt-muted);padding:0;">‹</button>
          <button onclick="_pfCalNav(1)" style="width:20px;height:20px;background:var(--bg-surface2);border:0.5px solid var(--border);border-radius:4px;cursor:pointer;font-size:12px;color:var(--txt-muted);padding:0;">›</button>
        </div>
      </div>
      <div style="padding:8px 10px;flex:1;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <thead><tr>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-dim);">D</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-muted);">S</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-muted);">T</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-muted);">Q</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-muted);">Q</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-muted);">S</th>
            <th style="padding:3px 0;text-align:center;font-size:10px;font-weight:500;color:var(--txt-dim);">S</th>
          </tr></thead>
          <tbody>${cells}</tbody>
        </table>
        <div style="margin-top:10px;padding-top:8px;border-top:0.5px solid var(--border);">${legendaEtapas}</div>
      </div>
    </div>`;

  body.innerHTML = `<div style="display:grid;grid-template-columns:175px 1fr 190px 175px;height:100%;min-height:0;">${col1}${col2}${col3}${col4}</div>`;
}

// ── Drag & Drop ───────────────────────────────────────────
function _pfDragStart(i, e) {
  _pfArqDrag = i;
  e.dataTransfer.effectAllowed = 'copy';
  e.currentTarget.style.opacity = '.35';
}
function _pfDragEnd(e) { e.currentTarget.style.opacity='1'; _pfArqDrag=null; }
function _pfDragOver(e) { e.preventDefault(); e.currentTarget.style.background='rgba(0,222,219,.08)'; e.currentTarget.style.borderColor='var(--accent)'; }
function _pfDragLeave(e) { e.currentTarget.style.background=''; e.currentTarget.style.borderColor=''; }
function _pfDrop(subId, e) {
  e.preventDefault(); e.stopPropagation();
  e.currentTarget.style.background=''; e.currentTarget.style.borderColor='';
  if (_pfArqDrag===null) return;
  const arq = _pfDados.arquitetos[_pfArqDrag];
  if (!arq) return;
  if (!_pfDados.etapas[subId]) _pfDados.etapas[subId] = {arquitetos:[], tarefas:{}};
  if (!_pfDados.etapas[subId].arquitetos.includes(arq.id)) {
    _pfDados.etapas[subId].arquitetos.push(arq.id);
    _pfSalvar();
  }
  _pfSelEtapa(subId);
}

// ── Ações ─────────────────────────────────────────────────
function _pfSelEtapa(subId) {
  _pfEtapaSel = subId;
  if (!_pfDados.etapas[subId]) _pfDados.etapas[subId] = {arquitetos:[], tarefas:{}};
  const tarefasPadrao = PF_TAREFAS_DEFAULT[subId] || [];
  tarefasPadrao.forEach(t => {
    if (_pfDados.etapas[subId].tarefas[t] === undefined)
      _pfDados.etapas[subId].tarefas[t] = true;
  });
  _pfRender();
}

function _pfRemArqEtapa(subId, arqId) {
  event.stopPropagation();
  if (!_pfDados.etapas[subId]) return;
  _pfDados.etapas[subId].arquitetos = _pfDados.etapas[subId].arquitetos.filter(id=>id!==arqId);
  _pfSalvar(); _pfRender();
}

function _pfToggleTarefa(subId, tarefa) {
  if (!_pfDados.etapas[subId]) return;
  _pfDados.etapas[subId].tarefas[tarefa] = !_pfDados.etapas[subId].tarefas[tarefa];
  _pfSalvar(); _pfRender();
}

function _pfAddTarefa() {
  if (!_pfEtapaSel) return;
  const inp = document.getElementById('pf-nova-tarefa');
  const val = inp?.value.trim();
  if (!val) return;
  if (!_pfDados.etapas[_pfEtapaSel]) _pfDados.etapas[_pfEtapaSel] = {arquitetos:[], tarefas:{}};
  _pfDados.etapas[_pfEtapaSel].tarefas[val] = true;
  inp.value = '';
  _pfSalvar(); _pfRender();
}

function _pfAddArquiteto() {
  const nome = prompt('Nome completo do arquiteto:');
  if (!nome?.trim()) return;
  const cargo = prompt('Cargo (ex: Arq. Pleno):') || '';
  const i = _pfDados.arquitetos.length;
  _pfDados.arquitetos.push({id:'arq_'+Date.now(), nome:nome.trim(), cargo, cor:PF_CORES[i%PF_CORES.length]});
  _pfSalvar(); _pfRender();
}

function _pfCalNav(dir) {
  let {ano, mes} = _pfCalMes;
  mes += dir;
  if (mes < 0) { mes=11; ano--; }
  if (mes > 11) { mes=0; ano++; }
  _pfCalMes = {ano, mes};
  _pfRender();
}

// ── Resumo para impressão ─────────────────────────────────
function _pfResumo() {
  const subIds = G.SUB_IDS || [];
  const subNames = G.SUB_NAMES || {};
  const fase = gSt.projFases[0];
  const ini2 = nome => nome.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase();
  const fmtD = d => new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit'});
  const cod = ESTADO.meta?.codigo||'';
  const nomeProj = ESTADO.meta?.nome||'Planejamento de Obra';

  let rows = '';
  subIds.forEach((subId, idx) => {
    const sub = fase?.rows?.arq?.subs?.[subId];
    if (!sub) return;
    const etDados = _pfDados.etapas[subId] || {arquitetos:[], tarefas:{}};
    const arqsNaEtapa = (etDados.arquitetos||[]).map(aid=>_pfDados.arquitetos.find(a=>a.id===aid)).filter(Boolean);
    const tarefasAtivas = Object.entries(etDados.tarefas||{}).filter(([,v])=>v).map(([k])=>k);
    const du = CALENDARIO.contarDU(new Date(sub.start), new Date(sub.end));
    const etCor = PF_CORES[idx % PF_CORES.length];

    rows += `<tr style="border-bottom:1px solid #E8ECF0;page-break-inside:avoid;">
      <td style="padding:8px 10px;vertical-align:top;">
        <div style="font-family:Oswald,sans-serif;font-size:12px;font-weight:700;color:#1A2535;">${subNames[subId]||subId}</div>
        <div style="font-size:10px;color:#6A7585;margin-top:2px;">${fmtD(sub.start)} – ${fmtD(sub.end)}</div>
        <div style="font-size:10px;color:${etCor};font-weight:600;">${du} DU</div>
      </td>
      <td style="padding:8px 10px;vertical-align:top;">
        ${arqsNaEtapa.length > 0
          ? arqsNaEtapa.map(a=>`<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;"><div style="width:18px;height:18px;border-radius:50%;background:${a.cor}22;border:1px solid ${a.cor};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:${a.cor};">${ini2(a.nome)}</div><span style="font-size:11px;color:#1A2535;">${a.nome}</span></div>`).join('')
          : '<span style="font-size:11px;color:#9AA0AF;">—</span>'}
      </td>
      <td style="padding:8px 10px;vertical-align:top;">
        ${tarefasAtivas.length > 0
          ? tarefasAtivas.map(t=>`<div style="font-size:11px;color:#1A2535;margin-bottom:2px;">• ${t}</div>`).join('')
          : '<span style="font-size:11px;color:#9AA0AF;">—</span>'}
      </td>
    </tr>`;
  });

  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9950;display:flex;align-items:center;justify-content:center;padding:20px;';
  d.addEventListener('click', e => { if(e.target===d) d.remove(); });
  d.innerHTML = `<div style="background:#fff;border-radius:10px;width:100%;max-width:820px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
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
        <button onclick="this.closest('[style*=fixed]').remove()" style="height:32px;padding:0 16px;background:#F4F6F8;border:1px solid #D8DCE4;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#5A6275;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;">Fechar</button>
        <button onclick="window.print()" style="height:32px;padding:0 20px;background:#00DEDB;border:none;border-radius:6px;font-family:Oswald,sans-serif;font-size:10px;font-weight:700;color:#0D1117;cursor:pointer;letter-spacing:.06em;text-transform:uppercase;">🖨 Imprimir A4</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(d);
}
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