const { count } = require('console');
const fetch = require('node-fetch');
const fs = require('fs').promises;

const basedir = './data/osm/'
const basedir_en = './data/osm_en/';
const basedir_ja = './data/osm_ja/';
const level_2_names_filename = 'level_2_names.json';
const level_2_object_filename = 'level_2_object.json';
const level_4_names_filename = 'level_4_names.json';
const level_4_object_filename = 'level_4_object.json';
const level_7_names_filename = 'level_7_names.json';
const level_7_object_filename = 'level_7_object.json';

const fetchOSMRelations = (data, prefix = null) => {
  return new Promise(async (resolve, reject) => {
    console.log('overpass api query: ');
    console.log(data);
    console.log('');
    const params = {
      data: data
    }
    const query = new URLSearchParams(params);
    const res = await fetch('https://overpass-api.de/api/interpreter?'+query);
    const json = await res.json();
    const results = json.elements.filter((e) => {return e.hasOwnProperty('tags')});
    console.log(results.length);
    const OSMRelations = {};
    const OSMRelationsEn = {};
    const OSMRelationsJa = {};
    let fullnameEn;
    let fullnameJa;
    for (const idx in results) {
      if(results[idx]['tags'].hasOwnProperty('name:en')){
        fullnameEn = results[idx]['tags']['name:en'];
      }else{
        fullnameEn = results[idx]['tags']['name'];
      }
      if(prefix && prefix.en){
        fullnameEn = prefix.en + ' ' + fullnameEn;
      }
      OSMRelationsEn[fullnameEn] = results[idx].id;
      if(results[idx]['tags'].hasOwnProperty('name:ja')){
        fullnameJa = results[idx]['tags']['name:ja'];
      }else{
        fullnameJa = results[idx]['tags']['name'];
      }
      if(prefix && prefix.ja){
        fullnameEn = prefix.ja + ' ' + fullnameEn;
      }
      OSMRelationsJa[fullnameJa] = results[idx].id;
      OSMRelations[results[idx].id] = {
        en: fullnameEn,
        ja: fullnameJa,
      }
    }
    resolve({ OSMRelations, OSMRelationsEn, OSMRelationsJa })
  });
}

const getAllCountryData = async () => {
  const overpass_query_level_2 = `
    [out:json][timeout:25];
    relation["admin_level"="2"]["type"="boundary"]["boundary"="administrative"]["name"];
    out tags;
    out skel qt;
  `;
  const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOSMRelations(overpass_query_level_2);
  // write out key as relation id
  const OSMRelationsString = JSON.stringify(OSMRelations, null, 2);
  await fs.writeFile(basedir+level_2_object_filename, OSMRelationsString, 'utf-8');
  // write out key as name:en
  const OSMRelationsEnString = JSON.stringify(OSMRelationsEn, null, 2);
  const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn), null, 2);
  await fs.writeFile(basedir_en+level_2_object_filename, OSMRelationsEnString, 'utf-8');
  await fs.writeFile(basedir_en+level_2_names_filename, OSMRelationsEnNamesString, 'utf-8');
  // write out key as name:ja
  const OSMRelationsJaString = JSON.stringify(OSMRelationsJa, null, 2);
  const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa), null, 2);
  await fs.writeFile(basedir_ja+level_2_object_filename, OSMRelationsJaString, 'utf-8');
  await fs.writeFile(basedir_ja+level_2_object_filename, OSMRelationsJaNamesString, 'utf-8');
}

const getAllStateData = async (country_name_en, country_osm_id) => {
  const overpass_query_level_4 = `
    [out:json][timeout:25];
    area["name:en"="${country_name_en}"];
    relation(area)["admin_level"="4"]["type"="boundary"]["boundary"="administrative"]["name"];
    out tags;
    out skel qt;
  `;
  const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOSMRelations(overpass_query_level_4);

  // write out key as relation id
  const OSMRelationsString = JSON.stringify(OSMRelations, null, 2);
  const OSMRelationsDir = basedir+country_osm_id+'/';
  try {
    await fs.stat(OSMRelationsDir);
  } catch (error) {
    await fs.mkdir(OSMRelationsDir);
  }
  await fs.writeFile(basedir+level_2_object_filename, OSMRelationsString, 'utf-8');

  // write out key as name:en
  const OSMRelationsEnString = JSON.stringify(OSMRelationsEn, null, 2);
  const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn), null, 2);
  const OSMRelationsEnDir = basedir_en+country_osm_id+'/';
  try {
    await fs.stat(OSMRelationsEnDir);
  } catch (error) {
    await fs.mkdir(OSMRelationsEnDir);
  }
  await fs.writeFile(OSMRelationsEnDir+level_4_object_filename, OSMRelationsEnString, 'utf-8');
  await fs.writeFile(OSMRelationsEnDir+level_4_names_filename, OSMRelationsEnNamesString, 'utf-8');

  // write out key as name:ja
  const OSMRelationsJaString = JSON.stringify(OSMRelationsJa, null, 2);
  const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa), null, 2);
  const OSMRelationsJaDir = basedir_ja+country_osm_id+'/';
  try {
    await fs.stat(OSMRelationsJaDir);
  } catch (error) {
    await fs.mkdir(OSMRelationsJaDir);
  }
  await fs.writeFile(OSMRelationsJaDir+level_4_object_filename, OSMRelationsJaString, 'utf-8');
  await fs.writeFile(OSMRelationsJaDir+level_4_names_filename, OSMRelationsJaNamesString, 'utf-8');
}

const getAllCityData = async (country_id) => {
  const allStateJa = require('./data/osm_ja/'+country_id+'/'+level_4_object_filename);
  let level_7_names_en = [];
  for (const key in allStateJa) {
    const state_id = allStateJa[key];
    const overpass_query_level_7 = `
      [out:json][timeout:25];
      relation(${state_id});
      map_to_area;
      relation(area)["admin_level"="7"]["type"="boundary"]["boundary"="administrative"]["name"];
      out tags;
      out skel qt;
    `;
    prefix = {
      en: key,
      ja: key
    }
    const { OSMRelationsEn, OSMRelationsJa } = await fetchOSMRelations(overpass_query_level_7, prefix);
    const OSMRelationsPath = basedir+country_id+'/'+state_id+'/level_7_ja.json';
    await fs.writeFile(OSMRelationsPath, OSMRelationsString, 'utf-8');
    const OSMRelationsJaString = JSON.stringify(OSMRelationsJa, null, 2);
    level_7_names_en = "";
    const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa), null, 2);
    const OSMRelationsEnString = JSON.stringify(OSMRelationsEn, null, 2);
    const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn), null, 2);
    const OSMRelationsFileName = 'level_7.json'
    const OSMRelationsNamesFileName = 'level_7_names.json'
    const OSMRelationsEnDir = basedir+'osm_en/'+country_id+'/'+state_id+'/';
    try {
      await fs.stat(OSMRelationsEnDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsEnDir);
    }
    const OSMRelationsJaDir = basedir+'osm_ja/'+country_id+'/'+state_id+'/';
    try {
      await fs.stat(OSMRelationsJaDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsJaDir);
    }
    await fs.writeFile(OSMRelationsEnDir+OSMRelationsFileName, OSMRelationsEnString, 'utf-8');
    await fs.writeFile(OSMRelationsEnDir+OSMRelationsNamesFileName, OSMRelationsEnNamesString, 'utf-8');
    await fs.writeFile(OSMRelationsJaDir+OSMRelationsFileName, OSMRelationsJaString, 'utf-8');
    await fs.writeFile(OSMRelationsJaDir+OSMRelationsNamesFileName, OSMRelationsJaNamesString, 'utf-8');
  }
  const OSMRelationsNamesFileName = 'level_7_names.json'
    await fs.writeFile(OSMRelationsJaDir+OSMRelationsNamesFileName, OSMRelationsJaNamesString, 'utf-8');
}

(async() => {
  await getAllCountryData();
  const allCountry = require(basedir_en+level_2_object_filename);
  const country_id = allCountry['Japan'];
  await getAllStateData('Japan', country_id)
  //await getAllCityData(country_id)


})();