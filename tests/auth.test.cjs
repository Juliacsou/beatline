'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ROOT = path.join(__dirname,'..');
const key = 'sb_publishable_test';
const config = {url:'https://example.supabase.co',key};
function build(allowed=true) {
  const requests=[];
  const items=new Map();
  const localStorage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)};
  const fakeFetch=async (url,options={})=>{
    requests.push({url:String(url),options});
    const address=String(url);
    if(address.includes('grant_type=password'))return {ok:true,json:async()=>({access_token:'valid-user-token',refresh_token:'refresh-token',expires_in:3600,user:{email:'admin@example.com'}})};
    if(address.includes('grant_type=refresh_token'))return {ok:true,json:async()=>({access_token:'new-token',refresh_token:'new-refresh',expires_in:3600})};
    if(address.includes('is_altigames_admin'))return {ok:true,json:async()=>allowed};
    if(address.includes('/upload')&&options.method==='POST')return {ok:true,json:async()=>({success:true,key:'beatline/musicas/11111111-1111-4111-8111-111111111111.mp3'})};
    if(address.includes('/file?')&&options.method==='DELETE')return {ok:true,json:async()=>({success:true})};
    if(address.includes('/rest/v1/beatline_'))return {ok:true,text:async()=>options.method==='POST'?'[{"id":"track123"}]':'[]'};
    if(address.includes('/auth/v1/logout'))return {ok:true,json:async()=>({})};
    throw new Error('Unexpected request '+address);
  };
  const window = {BEATLINE_SUPABASE:config,BEATLINE_MEDIA:{apiBase:'https://worker.example.workers.dev',publicBase:'https://audio.example.com/beatline/musicas'},crypto:{randomUUID:()=> 'test-id'}};
  class MockFormData {constructor(){this.fields=[];} append(k,v){this.fields.push([k,v]);}}
  const ctx = vm.createContext({window,localStorage,fetch:fakeFetch,FormData:MockFormData,URL,console,Date,JSON,Promise});
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/auth.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'src/supabase.js'),'utf8'),ctx);
  return {auth:window.BeatlineAuth,db:window.BeatlineDB,requests,items,config};
}
test('Conta autorizada gera JWT nas requisições de escrita', async () => {
  const {auth,db,requests,config}=build(true);
  await auth.signIn('admin@example.com','secret');
  await db.saveCategory(config,{name:'POP',color:'#c7f456'});
  const writing=requests.find(x=>x.url.includes('/rest/v1/beatline_categories')&&x.options.method==='POST');
  assert.equal(writing.options.headers.Authorization,'Bearer valid-user-token');
  assert.equal(writing.options.headers.apikey,key);
  await db.loadCatalog(config);
  const reading=requests.find(x=>x.url.includes('/rest/v1/beatline_tracks')&&x.options.method==='GET');
  assert.equal(reading.options.headers.Authorization,undefined);
});
test('Upload de MP3 exige autenticação e usa JWT', async () => {
  const {auth,db,requests,config}=build(true);
  await auth.signIn('admin@example.com','secret');
  await db.saveTrack(config,{payload:{title:'Teste',artist:'Artista',release_year:2000},file:{size:512,type:'audio/mpeg'},ids:['123'],previous:null});
  const upload=requests.find(x=>x.url.includes('/upload')&&x.options.method==='POST');
  assert.equal(upload.options.headers.Authorization,'Bearer valid-user-token');
  assert.equal(upload.options.body.fields[0][0],'file');
});
test('Conta não autorizada não tem sessão e não escreve', async () => {
  const {auth,db,requests,config}=build(false);
  await assert.rejects(auth.signIn('wrong@example.com','secret'),/não tem autorização/);
  await assert.rejects(db.saveCategory(config,{name:'Teste'}),/Sessão encerrada/);
  assert.equal(requests.some(x=>x.url.includes('/rest/v1/beatline_categories')),false);
});
test('Logout remove a sessão local', async () => {
  const {auth,config,db}=build(true);
  await auth.signIn('admin@example.com','secret');
  await auth.signOut();
  await assert.rejects(db.deleteCategory(config,'id'),/Sessão encerrada/);
});
