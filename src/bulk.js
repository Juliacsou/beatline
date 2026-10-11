/* Importação em lote BEAT//LINE. Usa o mesmo catálogo e Storage do cadastro individual. */
'use strict';

const BULK_MAX_MP3 = 20 * 1024 * 1024; // Limite configurado para o bucket beatline-music.
const BULK_MAX_ZIP_UNCOMPRESSED = 500 * 1024 * 1024; // Proteção do navegador contra ZIP bombs.
const bulkFold = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
const bulkKey = r => [r.title,r.artist,r.year].map(bulkFold).join('|');
const bulkCategs = r => [...new Map(String(r.categoriesText||'').split(',').map(x=>x.trim().replace(/\s+/g,' ').toLocaleUpperCase('pt-BR')).filter(Boolean).map(x=>[bulkFold(x),x])).values()];
const bulkRow = id => state.bulk.rows.find(r=>String(r.id)===String(id));

function bulkParseFile(file) {
  const stem=file.name.replace(/\.mp3$/i,'');
  const segments=stem.split('-').map(p=>p.trim());
  return {
    id:state.bulk.nextId++,file,fileName:file.name,
    title:segments[0]||'',artist:segments[1]||'',
    year:segments[2]||'',
    categoriesText:segments.slice(3).filter(Boolean).join(', '),
    status:'ready',note:'',editing:false,trackId:null
  };
}
function bulkValidation(row) {
  if(!row.title.trim())return 'Informe o título da música.';
  if(row.title.length>140)return 'O título pode ter até 140 caracteres.';
  if(!row.artist.trim())return 'Informe o artista.';
  if(row.artist.length>140)return 'O artista pode ter até 140 caracteres.';
  if(!/^\d{4}$/.test(String(row.year).trim())||Number(row.year)<1900||Number(row.year)>2100)return 'Ano inválido (1900 a 2100).';
  const names=bulkCategs(row);
  if(!names.length)return 'Informe ao menos uma categoria.';
  if(names.some(n=>n.length>40))return 'Cada categoria deve ter até 40 caracteres.';
  return '';
}
function bulkDuplicate(row,already=[]) {
  const key=bulkKey(row);
  const catalogDuplicate=state.tracks.find(t=>t.id!==row.trackId && bulkKey({title:t.title,artist:t.artist,year:t.release_year})===key);
  return !!catalogDuplicate || already.includes(key);
}
function bulkReviewRows() {
  const seen=[];
  for(const row of state.bulk.rows){
    if(['saved','uploading','deleted'].includes(row.status))continue;
    if(row.editing)continue;
    if(row.status==='failed')continue;
    const issue=bulkValidation(row);
    if(issue){row.status='invalid';row.note=issue;continue;}
    if(bulkDuplicate(row,seen)){row.status='duplicate';row.note='Já existe no catálogo ou foi repetida neste lote.';continue;}
    row.status='ready';row.note='Pronta para enviar.';
    seen.push(bulkKey(row));
  }
}

async function addBulkFiles(files) {
  if(state.bulk.running || state.bulk.extracting || !files.length)return;
  state.bulk.extracting=true;
  state.bulk.note='Lendo arquivos e conferindo nomes…';
  render();
  const loaded=[];const problems=[];
  let totalUncompressed=0;
  try {
    for(const file of files){
      if(file.name.toLowerCase().endsWith('.mp3')){
        if(file.size>BULK_MAX_MP3){problems.push(`${file.name}: excede 20 MB.`);continue;}
        if(file.size===0){problems.push(`${file.name}: arquivo vazio.`);continue;}
        loaded.push(file);
      } else if(file.name.toLowerCase().endsWith('.zip')){
        if(typeof JSZip==='undefined')throw new Error('Não foi possível carregar o leitor de arquivos ZIP.');
        const zip=await JSZip.loadAsync(file);
        const entries=Object.values(zip.files).filter(entry=>!entry.dir&&entry.name.toLowerCase().endsWith('.mp3')&&!/(^|\/)__MACOSX\//i.test(entry.name)&&!/(^|\/)\._/.test(entry.name));
        for(const entry of entries){
          const shortName=entry.name.split('/').pop();
          const declared=entry._data?.uncompressedSize;
          if(typeof declared==='number'&&declared>BULK_MAX_MP3){problems.push(`${shortName}: excede 20 MB.`);continue;}
          if(typeof declared==='number'&&totalUncompressed+declared>BULK_MAX_ZIP_UNCOMPRESSED){problems.push('ZIP excede o limite de 500 MB de MP3s descompactados por seleção.');break;}
          const blob=await entry.async('blob');
          if(blob.size>BULK_MAX_MP3||blob.size===0){problems.push(`${shortName}: MP3 vazio ou maior que 20 MB.`);continue;}
          totalUncompressed+=blob.size;
          loaded.push(new File([blob],shortName,{type:'audio/mpeg'}));
        }
        if(!entries.length)problems.push(`${file.name}: nenhum MP3 encontrado.`);
      } else problems.push(`${file.name}: utilize MP3 ou ZIP.`);
    }
    state.bulk.rows.push(...loaded.map(bulkParseFile));
    bulkReviewRows();
    state.bulk.note=problems.length?`${loaded.length} MP3(s) lidos. ${problems.length} aviso(s): ${problems.slice(0,3).join(' ')}`:`${loaded.length} MP3(s) adicionados para revisão.`;
  }catch(err){state.bulk.note=`Erro ao ler os arquivos: ${err.message}`;}
  finally{state.bulk.extracting=false;render();if(loaded.length)root.querySelector('.bulk-review')?.scrollIntoView({block:'start'});}
}

function bulkTextFields(row) {
  return `<div class="bulk-fields">
    <label>TÍTULO<input class="form-input" data-bulk-field="title" data-id="${row.id}" maxlength="140" value="${attr(row.title)}" aria-label="Título"></label>
    <label>ARTISTA<input class="form-input" data-bulk-field="artist" data-id="${row.id}" maxlength="140" value="${attr(row.artist)}" aria-label="Artista"></label>
    <label>ANO<input class="form-input" data-bulk-field="year" data-id="${row.id}" type="number" min="1900" max="2100" value="${attr(row.year)}" aria-label="Ano"></label>
    <label class="bulk-full">CATEGORIAS <small>(SEPARADAS POR VÍRGULA)</small><input class="form-input" data-bulk-field="categoriesText" data-id="${row.id}" value="${attr(row.categoriesText)}" placeholder="POP, ANOS 90, ROCK" aria-label="Categorias separadas por vírgula"></label>
  </div>`;
}
function bulkRowHtml(row) {
  const done=row.status==='saved';
  const statusLabels={ready:'PRONTA',invalid:'REVISAR',duplicate:'DUPLICADA',uploading:'ENVIANDO...',saved:'CADASTRADA',failed:'FALHOU',deleted:'EXCLUÍDA'};
  const labels=bulkCategs(row);
  return `<article class="bulk-row bulk-${row.status}" data-bulk-row="${row.id}">
    <div class="bulk-row-top"><span class="bulk-state">${done?icon('check'):row.status==='failed'||row.status==='invalid'?icon('warning'):icon('music')} ${statusLabels[row.status]||'PENDENTE'}</span><span class="bulk-origin" title="${attr(row.fileName)}">${h(row.fileName)}</span></div>
    ${row.editing?bulkTextFields(row):`<div class="bulk-row-body"><div class="bulk-song"><strong>${h(row.title||'SEM TÍTULO')}</strong><span>${h(row.artist||'SEM ARTISTA')} · ${h(row.year||'SEM ANO')}</span></div><div class="bulk-tags">${labels.map(c=>`<span>${h(c)}</span>`).join('')||'<em>SEM CATEGORIA</em>'}</div></div>`}
    ${row.note && row.status!=='saved' && row.status!=='deleted'?`<p class="bulk-note">${h(row.note)}</p>`:''}
    <div class="bulk-row-actions">
    ${row.editing?`<button class="mini-btn bulk-action-save" data-action="bulk-apply" data-id="${row.id}" title="Salvar alterações" aria-label="Salvar alterações">${icon('check')}</button><button class="mini-btn" data-action="bulk-cancel-edit" data-id="${row.id}" title="Cancelar">${icon('x')}</button>`:
      `<button class="mini-btn" data-action="bulk-edit" data-id="${row.id}" title="Editar informações" aria-label="Editar informações" ${row.status==='uploading'||row.status==='deleted'?'disabled':''}>${icon('edit')}</button>
       ${row.status==='saved'?`<button class="mini-btn danger" data-action="bulk-delete" data-id="${row.id}" title="Excluir música cadastrada" aria-label="Excluir música">${icon('trash')}</button>`:
       `<button class="mini-btn danger" data-action="bulk-discard" data-id="${row.id}" title="Remover da lista" aria-label="Remover da lista" ${row.status==='uploading'?'disabled':''}>${icon('x')}</button>`}`}
    </div>
  </article>`;
}
function renderBulkAdmin() {
  const rows=state.bulk.rows;
  const count=k=>rows.filter(r=>r.status===k).length;
  const ready=count('ready'), saved=count('saved'), failed=count('failed'), skipped=count('duplicate')+count('invalid');
  const pct=state.bulk.total?Math.round(state.bulk.processed/state.bulk.total*100):0;
  return `<div class="bulk-page">
    <div class="admin-titlebar"><div><h2>IMPORTAÇÃO EM LOTE</h2><small>VÁRIOS MP3S OU UM ARQUIVO ZIP</small></div><span class="bulk-badge">${icon('upload')} BATCH UPLOAD</span></div>
    <section class="bulk-hero">
      <div class="bulk-hero-heading"><span class="bulk-hero-icon">${icon('album')}</span><div><strong>SUBA SEU MIX!</strong><small>NOME DO ARQUIVO = INFORMAÇÕES DA MÚSICA</small></div></div>
      <div class="bulk-filename">nomemusica<span>-</span>nomeartista<span>-</span>ano<span>-</span>categoria1<span>-</span>categoria2<span>.mp3</span></div>
      <p>Use um hífen para separar os campos. Após o ano, adicione <b>quantas categorias quiser</b>. Novas categorias serão criadas automaticamente. Evite hífens dentro dos nomes; você poderá corrigir os dados antes de enviar.</p>
    </section>
    <div class="bulk-dropzone ${state.bulk.extracting?'bulk-busy':''}" role="region" aria-label="Área para arrastar arquivos MP3 ou ZIP">
      <span class="bulk-drop-art">${icon('upload')}</span>
      <strong>${state.bulk.extracting?'ABRINDO ARQUIVOS...':'ARRASTE OS ARQUIVOS AQUI'}</strong>
      <span>MP3s individuais, pasta ou ZIP com MP3s</span>
      <div class="bulk-picker-buttons">
        <button class="small-action" data-action="bulk-pick" ${state.bulk.running||state.bulk.extracting?'disabled':''}>${icon('plus')} MP3 / ZIP</button>
        <button class="small-action neutral" data-action="bulk-folder" ${state.bulk.running||state.bulk.extracting?'disabled':''}>${icon('album')} PASTA</button>
      </div>
      <input class="bulk-hidden-input" id="bulkFileInput" type="file" accept=".mp3,audio/mpeg,.zip,application/zip" multiple>
      <input class="bulk-hidden-input" id="bulkFolderInput" type="file" webkitdirectory directory multiple>
      <small>20 MB por MP3 · ZIP descompactado até 500 MB por seleção</small>
    </div>
    ${state.bulk.note?`<div class="bulk-message" role="status">${icon('list')}${h(state.bulk.note)}</div>`:''}
    ${rows.length?`<section class="bulk-review">
      <div class="bulk-summary"><div><h3>REVISÃO DO LOTE</h3><small>${rows.length} FAIXAS NA LISTA</small></div><div class="bulk-summary-pills"><span class="bulk-pill positive">${icon('check')} ${saved} SALVAS</span><span class="bulk-pill">${ready} PRONTAS</span><span class="bulk-pill warn">${skipped} REVISAR</span>${failed?`<span class="bulk-pill danger">${failed} FALHAS</span>`:''}</div></div>
      ${state.bulk.running?`<div class="bulk-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span><strong>ENVIANDO ${state.bulk.processed} / ${state.bulk.total} · ${pct}%</strong></div>`:''}
      <div class="bulk-controls"><button class="small-action" data-action="bulk-upload" ${ready===0||state.bulk.running||state.bulk.extracting||!state.connected?'disabled':''}>${icon('upload')} ENVIAR ${ready} ${ready===1?'MÚSICA':'MÚSICAS'}</button><button class="small-action neutral" data-action="bulk-retry" ${failed===0||state.bulk.running?'disabled':''}>${icon('rotate')} TENTAR NOVAMENTE</button><button class="small-action neutral" data-action="bulk-clear" ${state.bulk.running?'disabled':''}>${icon('trash')} LIMPAR LISTA</button></div>
      <div class="bulk-list">${rows.filter(r=>r.status!=='deleted').map(bulkRowHtml).join('')}</div>
    </section>`:`<p class="bulk-empty">${icon('music')} SELECIONE ALGUNS ARQUIVOS PARA COMEÇAR.</p>`}
  </div>`;
}

function editBulkField(input){const row=bulkRow(input.dataset.id);const field=input.dataset.bulkField;if(row&&['title','artist','year','categoriesText'].includes(field))row[field]=input.value;}

async function ensureBulkCategories(row,cache) {
  const ids=[];
  for(const name of bulkCategs(row)){
    const key=bulkFold(name);
    let cat=cache.get(key);
    if(!cat){
      try{
        const created=await saveCategory(state.connection,{name,color:'#c7f456'});
        cat=created?.[0];
      }catch(e){
        // Possível cadastro simultâneo de categoria por outra aba.
        const fresh=await loadCatalog(state.connection);
        fresh.categories.forEach(c=>cache.set(bulkFold(c.name),c));
        cat=cache.get(key);
        if(!cat)throw e;
      }
      if(!cat?.id)throw new Error(`Não foi possível criar a categoria ${name}.`);
      cache.set(key,cat);
    }
    ids.push(cat.id);
  }
  return ids;
}
function bulkCategoryCache(){return new Map(state.categories.map(c=>[bulkFold(c.name),c]));}

async function uploadBulkRows() {
  if(state.bulk.running||!state.connected)return;
  bulkReviewRows();
  const ready=state.bulk.rows.filter(r=>r.status==='ready');
  if(!ready.length){render();return;}
  state.bulk.running=true;state.bulk.total=ready.length;state.bulk.processed=0;
  state.bulk.note='Enviando os MP3s para o Supabase, um por vez…';
  const categoryCache=bulkCategoryCache();
  render();
  for(const row of ready){
    row.status='uploading';row.note='Enviando arquivo e salvando informações…';
    render();
    try {
      if(bulkValidation(row))throw new Error(bulkValidation(row));
      if(bulkDuplicate(row))throw new Error('Música já cadastrada no catálogo.');
      const ids=await ensureBulkCategories(row,categoryCache);
      const payload={title:row.title.trim(),artist:row.artist.trim(),release_year:Number(row.year)};
      const saved=await saveTrack(state.connection,{payload,file:row.file,ids,previous:null});
      row.trackId=saved.id;
      row.file=null; // Não manter MP3s enviados na memória do navegador.
      row.status='saved';row.note='';
      state.tracks.push({...payload,id:saved.id,file_path:saved.file_path,category_ids:ids});
    }catch(e){row.status='failed';row.note=e.message||'Falha no envio.';}
    state.bulk.processed++;
    render();
  }
  state.bulk.running=false;
  state.bulk.note='Importação finalizada. Revise as faixas cadastradas e as que precisam de atenção.';
  try {
    const catalog=await loadCatalog(state.connection);
    state.categories=catalog.categories;
    state.tracks=catalog.tracks;
  }catch(e){state.bulk.note+=' Não foi possível atualizar a listagem completa do catálogo.';}
  bulkReviewRows();
  render();
}

async function saveBulkEdited(row) {
  const issue=bulkValidation(row);
  if(issue){row.note=issue;row.status=row.trackId?'saved':'invalid';render();return;}
  if(bulkDuplicate(row,state.bulk.rows.filter(r=>r!==row && r.status==='ready').map(bulkKey))){row.note='Já existe outra música com estes dados.';row.status=row.trackId?'saved':'duplicate';render();return;}
  if(!row.trackId){row.editing=false;row.snapshot=null;row.note='';bulkReviewRows();render();return;}
  if(state.bulk.running)return;
  state.bulk.running=true;row.note='Salvando alterações…';render();
  try {
    const old=state.tracks.find(t=>t.id===row.trackId);
    if(!old)throw new Error('Cadastro não encontrado para edição.');
    const ids=await ensureBulkCategories(row,bulkCategoryCache());
    await saveTrack(state.connection,{payload:{title:row.title.trim(),artist:row.artist.trim(),release_year:Number(row.year)},ids,previous:old,file:null});
    const catalog=await loadCatalog(state.connection);
    state.categories=catalog.categories;state.tracks=catalog.tracks;
    row.editing=false;row.snapshot=null;row.note='';row.status='saved';
    state.bulk.note=`Cadastro de “${row.title}” atualizado.`;
  }catch(e){row.note=`Não foi possível salvar: ${e.message}`;}
  finally{state.bulk.running=false;render();}
}

async function deleteBulkTrack(id) {
  const row=state.bulk.rows.find(r=>r.trackId===id);
  if(!row || state.bulk.running)return;
  state.bulk.running=true;
  render();
  try {
    const old=state.tracks.find(t=>t.id===id);
    if(!old)throw new Error('Música não encontrada no catálogo.');
    await deleteTrack(state.connection,old);
    state.tracks=state.tracks.filter(t=>t.id!==id);
    row.status='deleted';row.trackId=null;row.file=null;
    state.bulk.note='Música excluída do catálogo e do armazenamento.';
  }catch(e){row.note=e.message;state.bulk.note=`Erro ao excluir: ${e.message}`;}
  finally{state.bulk.running=false;render();}
}

function handleBulkAction(el) {
  const action=el.dataset.action;
  const row=bulkRow(el.dataset.id);
  if(action==='bulk-pick'){root.querySelector('#bulkFileInput')?.click();return;}
  if(action==='bulk-folder'){root.querySelector('#bulkFolderInput')?.click();return;}
  if(state.bulk.running || state.bulk.extracting)return;
  if(action==='bulk-upload'){uploadBulkRows();return;}
  if(action==='bulk-retry'){
    state.bulk.rows.filter(r=>r.status==='failed').forEach(r=>{r.status='ready';r.note='';});
    bulkReviewRows();uploadBulkRows();return;
  }
  if(action==='bulk-clear'){state.bulk.rows=[];state.bulk.note='Lista limpa. As músicas já cadastradas permanecem no Supabase.';state.bulk.processed=0;state.bulk.total=0;render();return;}
  if(!row)return;
  if(action==='bulk-discard'){
    if(row.status==='saved')return;
    state.bulk.rows=state.bulk.rows.filter(r=>r!==row);
    bulkReviewRows();render();return;
  }
  if(action==='bulk-edit'){
    row.snapshot={title:row.title,artist:row.artist,year:row.year,categoriesText:row.categoriesText};
    row.editing=true;render();return;
  }
  if(action==='bulk-cancel-edit'){
    if(row.snapshot)Object.assign(row,row.snapshot);
    row.snapshot=null;row.editing=false;row.note='';bulkReviewRows();render();return;
  }
  if(action==='bulk-apply'){saveBulkEdited(row);return;}
  if(action==='bulk-delete'&&row.trackId){state.modal=`bulk-delete-track:${row.trackId}`;render();}
}
