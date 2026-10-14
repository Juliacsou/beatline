(function(root){
  'use strict';
  // As categorias do catálogo são livres; classificamos os nomes conhecidos em facetas.
  // Dentro de cada faceta vale OU; entre facetas vale E; exclusões sempre prevalecem.
  function normalize(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function categoryGroup(name){
    const text = normalize(name).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    const era = /^(?:anos?\s*(?:de\s*)?(?:19|20)?\d{2}|(?:19[5-9]\d|20[0-3]\d)s?|(?:19[5-9]\d|20[0-3]\d)'?s|decada\s*(?:de\s*)?(?:19|20)?\d{2})$/;
    if(era.test(text))return 'epoca';
    if(/^(?:internaciona(?:l|is)|naciona(?:l|is)|brasil(?:eir[ao]s?)?|brasileir[ao]s?|estrangeir[ao]s?|gring[ao]s?|exterior)$/.test(text))return 'origem';
    return 'estilo';
  }
  const groupOrder = ['origem','epoca','estilo'];
  const groupTitles = {origem:'ORIGEM',epoca:'ÉPOCA',estilo:'ESTILOS E OUTRAS CATEGORIAS'};
  function groupedCategories(categories){
    return groupOrder.map(key=>({
      key, name:groupTitles[key], categories:categories.filter(category=>categoryGroup(category.name)===key)
    })).filter(group=>group.categories.length);
  }
  function eligibleTracks(tracks,categories,included=[],excluded=[]){
    const groups = new Map();
    const index = new Map(categories.map(category=>[String(category.id),category]));
    for(const id of included){
      const category = index.get(String(id));
      if(!category)continue;
      const group=categoryGroup(category.name);
      if(!groups.has(group))groups.set(group,new Set());
      groups.get(group).add(String(id));
    }
    const excludeSet = new Set(excluded.map(String));
    return tracks.filter(track=>{
      const ids=new Set((track.category_ids||[]).map(String));
      if([...excludeSet].some(id=>ids.has(id)))return false;
      for(const groupIds of groups.values()){
        if(![...groupIds].some(id=>ids.has(id)))return false;
      }
      return true;
    });
  }
  const api = {categoryGroup,groupedCategories,eligibleTracks};
  root.BeatlineFilters=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
