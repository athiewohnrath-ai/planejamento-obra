),window.addEventListener("resize",()=>{"function"==typeof gRender&&gRender()}),document.getElementById("modal-confirm").addEventListener("click",function(t){t.target===this&&fecharConfirm()})
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