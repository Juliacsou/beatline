const assert = require('node:assert/strict');
const test = require('node:test');
const {categoryGroup,groupedCategories,eligibleTracks} = require('../src/filters.js');
const categories = [
  {id:'int',name:'Internacional'}, {id:'br',name:'Nacional'},
  {id:'pop',name:'Pop'}, {id:'rock',name:'Rock'},
  {id:'90',name:'Anos 90'}, {id:'00',name:'Anos 2000'},
];
const tracks = [
  {id:1,title:'International Pop 90',category_ids:['int','pop','90']},
  {id:2,title:'Brazilian Pop 90',category_ids:['br','pop','90']},
  {id:3,title:'International Rock 90',category_ids:['int','rock','90']},
  {id:4,title:'International Pop 2000',category_ids:['int','pop','00']},
  {id:5,title:'Brazilian Rock 2000',category_ids:['br','rock','00']},
  {id:6,title:'International Pop elsewhere',category_ids:['int','pop']},
];
function ids(included=[],excluded=[]){return eligibleTracks(tracks,categories,included,excluded).map(t=>t.id);}
test('classifica categorias de época, origem e estilo',()=>{
  assert.equal(categoryGroup('ANOS 90'),'epoca');
  assert.equal(categoryGroup('Anos 2000'),'epoca');
  assert.equal(categoryGroup('DÉCADA DE 1980'),'epoca');
  assert.equal(categoryGroup('1990s'),'epoca');
  assert.equal(categoryGroup('BRASILEIRAS'),'origem');
  assert.equal(categoryGroup('Internacional'),'origem');
  assert.equal(categoryGroup('Pop'),'estilo');
  assert.deepEqual(groupedCategories(categories).map(x=>x.key),['origem','epoca','estilo']);
});
test('Internacional E Pop não traz pop brasileiro nem rock internacional',()=>{
  assert.deepEqual(ids(['int','pop']),[1,4,6]);
});
test('Pop E Anos 90 não traz pop de outras épocas',()=>{
  assert.deepEqual(ids(['pop','90']),[1,2]);
});
test('Anos 90 OU Anos 2000 no mesmo grupo',()=>{
  assert.deepEqual(ids(['90','00']),[1,2,3,4,5]);
});
test('Internacional E (Pop OU Rock) E (Anos 90 OU 2000)',()=>{
  assert.deepEqual(ids(['int','pop','rock','90','00']),[1,3,4]);
});
test('Exclusões prevalecem sobre inclusões e funcionam sem inclusão',()=>{
  assert.deepEqual(ids(['pop'],['br']),[1,4,6]);
  assert.deepEqual(ids([],['90']),[4,5,6]);
  assert.deepEqual(ids(['pop'],['pop']),[]);
});
test('Suporta IDs numéricos e música sem categorias',()=>{
  assert.deepEqual(eligibleTracks([{category_ids:[123]},{category_ids:[]}],[{id:123,name:'Pop'}],['123'],[]).length,1);
});
