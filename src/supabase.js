(function(){'use strict';
// Supabase REST + Storage. Nenhuma música ou MP3 reside no código do jogo.
function apiBase(c){return c.url.replace(/\/+$/,'');}
function headers(c,additional={}){const h={'apikey':c.key,...additional};if(!c.key.startsWith('sb_publishable_'))h.Authorization=`Bearer ${c.key}`;return h;}
async function writeHeaders(c,extra={}){
  if (!window.BeatlineAuth) throw new Error('Abra a página administrativa para modificar o catálogo.');
  const token=await window.BeatlineAuth.accessToken();
  return headers(c,{...extra,Authorization:`Bearer ${token}`});
}
async function request(c,path,{method='GET',body,extraHeaders={}}={}){
  const contentHeaders={...(body!==undefined?{'Content-Type':'application/json'}:{}),...extraHeaders};
  const authHeaders=method==='GET'?headers(c,contentHeaders):await writeHeaders(c,contentHeaders);
  const response=await fetch(`${apiBase(c)}${path}`,{method,headers:authHeaders,body:body!==undefined?JSON.stringify(body):undefined});
  const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{data=text;}
  if(!response.ok){let message=typeof data==='object'&&data?(data.message||data.error_description||data.error||data.hint||data.details):data;throw new Error(message||`HTTP ${response.status}`);}return data;
}
const enc=x=>encodeURIComponent(String(x));
async function allRows(c,table,columns,order){
  // PostgREST costuma limitar a resposta a 1000 linhas. Carregamos todas para
  // que as combinacoes de filtros e os sorteios contemplem o catalogo inteiro.
  const batch=500;
  const rows=[];
  for(let offset=0;;offset+=batch){
    const page=await request(c,`/rest/v1/${table}?select=${columns}&order=${order}&limit=${batch}&offset=${offset}`);
    if(!Array.isArray(page))throw new Error('Formato inesperado de resposta do Supabase.');
    rows.push(...page);
    if(page.length<batch)break;
  }
  return rows;
}
async function loadCatalog(c){
  // Consultas independentes, sem depender do relacionamento em cache no PostgREST.
  const [categories, tracks, relationships] = await Promise.all([
    allRows(c,'beatline_categories','id,name,color','name.asc'),
    allRows(c,'beatline_tracks','id,title,artist,release_year,file_path','title.asc'),
    allRows(c,'beatline_track_categories','track_id,category_id','track_id.asc,category_id.asc')
  ]);
  const byTrack = new Map();
  relationships.forEach(({track_id, category_id}) => {
    if (!byTrack.has(track_id)) byTrack.set(track_id, []);
    byTrack.get(track_id).push(category_id);
  });
  return {categories, tracks:tracks.map(t => ({...t, category_ids:byTrack.get(t.id) || []}))};
}
// Busca paginada: garante exportar todas as músicas, mesmo quando o catálogo passa de 1000 linhas.
async function exportCatalog(c){
  const [tracks,categories,relationships]=await Promise.all([
    allRows(c,'beatline_tracks','id,title,artist,release_year,file_path','id.asc'),
    allRows(c,'beatline_categories','id,name','id.asc'),
    allRows(c,'beatline_track_categories','track_id,category_id','track_id.asc,category_id.asc')
  ]);
  return {tracks,categories,relationships};
}
async function saveCategory(c,payload,previous){
  if(previous)return request(c,`/rest/v1/beatline_categories?id=eq.${enc(previous.id)}`,{method:'PATCH',body:payload,extraHeaders:{Prefer:'return=representation'}});
  return request(c,'/rest/v1/beatline_categories',{method:'POST',body:payload,extraHeaders:{Prefer:'return=representation'}});
}
async function deleteCategory(c,id){return request(c,`/rest/v1/beatline_categories?id=eq.${enc(id)}`,{method:'DELETE'});}
function mediaAPI(){
  const base=window.BEATLINE_MEDIA?.apiBase;
  if(!base)throw new Error('API de midia nao configurada.');
  return base.replace(/\/+$/,'');
}
async function mediaRequest(c,url,options){
  if(!window.BeatlineAuth)throw new Error('Faca login administrativo para gerenciar MP3.');
  const token=await window.BeatlineAuth.accessToken();
  const response=await fetch(url,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}});
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(payload?.error||`Falha na API de midia (${response.status})`);
  return payload;
}
async function uploadMP3(c,file){
  const form=new FormData();
  form.append('file',file);
  const data=await mediaRequest(c,`${mediaAPI()}/upload`,{method:'POST',body:form});
  const prefix='beatline/musicas/';
  if(!data?.success||typeof data.key!=='string'||!data.key.startsWith(prefix)){
    throw new Error('A API nao retornou um caminho valido para o MP3.');
  }
  return data.key.slice(prefix.length);
}
async function removeMP3(c,path){
  if(!path)return;
  // A API so aceita arquivos MP3 com identificador UUID, como os do catalogo.
  const filename=String(path).split('/').pop();
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.mp3$/i.test(filename))
    throw new Error('Nome do MP3 invalido para exclusao no R2.');
  const key=`beatline/musicas/${filename}`;
  await mediaRequest(c,`${mediaAPI()}/file?key=${encodeURIComponent(key)}`,{method:'DELETE'});
}
async function saveTrack(c,{payload,file,ids,previous}){
  let path=previous?.file_path||null,uploaded=null,saved=false,createdId=null;
  try{
    if(file){uploaded=await uploadMP3(c,file);path=uploaded;}
    const row={...payload,file_path:path};
    let id=previous?.id;
    if(previous){await request(c,`/rest/v1/beatline_tracks?id=eq.${enc(id)}`,{method:'PATCH',body:row,extraHeaders:{Prefer:'return=representation'}});}
    else{const created=await request(c,'/rest/v1/beatline_tracks',{method:'POST',body:row,extraHeaders:{Prefer:'return=representation'}});id=created?.[0]?.id;createdId=id;if(!id)throw new Error('O Supabase não retornou o ID da música.');}
    saved=true;
    await request(c,`/rest/v1/beatline_track_categories?track_id=eq.${enc(id)}`,{method:'DELETE'});
    await request(c,'/rest/v1/beatline_track_categories',{method:'POST',body:ids.map(category_id=>({track_id:id,category_id})),extraHeaders:{Prefer:'return=minimal'}});
    if(previous&&uploaded&&previous.file_path&&previous.file_path!==uploaded){await removeMP3(c,previous.file_path).catch(()=>{});}
    return {id,file_path:path};
  }catch(e){
    if(createdId){await request(c,`/rest/v1/beatline_tracks?id=eq.${enc(createdId)}`,{method:'DELETE'}).catch(()=>{});}
    if(uploaded&&(!saved||createdId))await removeMP3(c,uploaded).catch(()=>{});
    throw e;
  }
}
async function deleteTrack(c,track){if(!track)throw new Error('Música não encontrada.');await request(c,`/rest/v1/beatline_tracks?id=eq.${enc(track.id)}`,{method:'DELETE'});if(track.file_path)await removeMP3(c,track.file_path).catch(()=>{});}

// API global para ser usada por scripts classicos e funcionar tambem via file://
window.BeatlineDB = { loadCatalog, exportCatalog, saveCategory, deleteCategory, saveTrack, deleteTrack };

})();
