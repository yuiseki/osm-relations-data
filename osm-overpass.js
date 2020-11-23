const fetch = require('node-fetch');
const fs = require('fs').promises;
const osmGeoJson = require('osm-geojson');

const basedir = './data/osm/';
const basedir_en = './data/osm_en/';
const basedir_ja = './data/osm_ja/';
const level_2_names_filename = 'level_2_names.json';
const level_2_object_filename = 'level_2_object.json';
const level_2_geojson_filename = 'index.geojson';
const level_4_names_filename = 'level_4_names.json';
const level_4_object_filename = 'level_4_object.json';
const level_4_geojson_filename = 'index.geojson';
const level_7_names_filename = 'level_7_names.json';
const level_7_object_filename = 'level_7_object.json';

const fetchOSMRelations = (data, prefix = null) => {
  return new Promise(async (resolve, reject) => {
    console.log('overpass api query: ');
    console.log(data);
    console.log('');
    const params = {
      data: data
    };
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
        fullnameJa = prefix.ja + ' ' + fullnameJa;
      }
      OSMRelationsJa[fullnameJa] = results[idx].id;
      OSMRelations[results[idx].id] = {
        en: fullnameEn,
        ja: fullnameJa,
      };
    }
    resolve({ OSMRelations, OSMRelationsEn, OSMRelationsJa })
  });
};

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
};

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
  await fs.writeFile(OSMRelationsDir+level_4_object_filename, OSMRelationsString, 'utf-8');

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
};

const getAllCityData = async (country_osm_id) => {
  const allState = require('./data/osm/'+country_osm_id+'/'+level_4_object_filename);
  let level_7_obj = {};
  let level_7_names_en = [];
  let level_7_obj_en = {};
  let level_7_names_ja = [];
  let level_7_obj_ja = {};
  for (const key in allState) {
    const state_osm_id = key;
    const state_name_en = allState[key].en;
    const state_name_ja = allState[key].ja;
    const overpass_query_level_7 = `
      [out:json][timeout:25];
      relation(${state_osm_id});
      map_to_area;
      relation(area)["admin_level"="7"]["type"="boundary"]["boundary"="administrative"]["name"];
      out tags;
      out skel qt;
    `;
    prefix = {
      en: state_name_en,
      ja: state_name_ja
    };
    const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOSMRelations(overpass_query_level_7, prefix);

    // write out key as relation id
    level_7_obj = Object.assign(level_7_obj, OSMRelations);
    const OSMRelationsString = JSON.stringify(OSMRelations, null, 2);
    const OSMRelationsDir = basedir+country_osm_id+'/'+state_osm_id+'/';
    try {
      await fs.stat(OSMRelationsDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsDir);
    }
    await fs.writeFile(OSMRelationsDir+level_7_object_filename, OSMRelationsString, 'utf-8');

    // write out key as name:en
    const OSMRelationsEnString = JSON.stringify(OSMRelationsEn, null, 2);
    level_7_obj_en = Object.assign(level_7_obj_en, OSMRelationsEn);
    const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn), null, 2);
    level_7_names_en = level_7_names_en.concat(Object.keys(OSMRelationsEn));
    const OSMRelationsEnDir = basedir_en+country_osm_id+'/'+state_osm_id+'/';
    try {
      await fs.stat(OSMRelationsEnDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsEnDir);
    }
    await fs.writeFile(OSMRelationsEnDir+level_7_object_filename, OSMRelationsEnString, 'utf-8');
    await fs.writeFile(OSMRelationsEnDir+level_7_names_filename, OSMRelationsEnNamesString, 'utf-8');

    // write out key as name:ja
    const OSMRelationsJaString = JSON.stringify(OSMRelationsJa, null, 2);
    level_7_obj_ja = Object.assign(level_7_obj_ja, OSMRelationsJa);
    const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa), null, 2);
    level_7_names_ja = level_7_names_ja.concat(Object.keys(OSMRelationsJa));
    const OSMRelationsJaDir = basedir_ja+country_osm_id+'/'+state_osm_id+'/';
    try {
      await fs.stat(OSMRelationsJaDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsJaDir);
    }
    await fs.writeFile(OSMRelationsJaDir+level_7_object_filename, OSMRelationsJaString, 'utf-8');
    await fs.writeFile(OSMRelationsJaDir+level_7_names_filename, OSMRelationsJaNamesString, 'utf-8');
  }
  // 国レベルの都道府県+市区町村 オブジェクト
  const level_7_obj_string = JSON.stringify(level_7_obj, null, 2);
  await fs.writeFile(basedir+country_osm_id+'/'+level_7_object_filename, level_7_obj_string, 'utf-8');

  // 国レベルの都道府県+市区町村 英語オブジェクト
  const level_7_obj_en_string = JSON.stringify(level_7_obj_en, null, 2);
  await fs.writeFile(basedir_en+country_osm_id+'/'+level_7_object_filename, level_7_obj_en_string, 'utf-8');

  // 国レベルの都道府県+市区町村 日本語オブジェクト
  const level_7_obj_ja_string = JSON.stringify(level_7_obj_ja, null, 2);
  await fs.writeFile(basedir_ja+country_osm_id+'/'+level_7_object_filename, level_7_obj_ja_string, 'utf-8');

  // 国レベルの都道府県+市区町村 英語配列
  const level_7_names_en_string = JSON.stringify(level_7_names_en, null, 2);
  await fs.writeFile(basedir_en+country_osm_id+'/'+level_7_names_filename, level_7_names_en_string, 'utf-8');

  // 国レベルの都道府県+市区町村 日本語配列
  const level_7_names_ja_string = JSON.stringify(level_7_names_ja, null, 2);
  await fs.writeFile(basedir_ja+country_osm_id+'/'+level_7_names_filename, level_7_names_ja_string, 'utf-8');
};

(async() => {
  try {
    await fs.stat(basedir+level_2_object_filename);
  } catch (error) {
    await getAllCountryData();
  }

  const countryName = 'Japan';
  const allCountry = require(basedir_en+level_2_object_filename);
  const country_osm_id = allCountry[countryName];

  const countryGeojsonPath = basedir+country_osm_id+'/'+level_2_geojson_filename;
  try {
    await fs.stat(countryGeojsonPath);
  } catch (error) {
    const country_geojson = await osmGeoJson.get(country_osm_id);
    const country_geojson_string = JSON.stringify(country_geojson, null, 2);
    await fs.writeFile(countryGeojsonPath, country_geojson_string, 'utf-8');
  }

  //await getAllStateData(countryName, country_osm_id);
  //await getAllCityData(country_osm_id);

  // geojsonを収集する
  /*
  const allState = require(basedir+country_osm_id+'/'+level_4_object_filename);
  for (const state_osm_id in allState) {
    const state_geojson = await osmGeoJson.get(state_osm_id);
    const state_geojson_string = JSON.stringify(state_geojson, null, 2);
    console.log(state_geojson);
    const geojsonPath = basedir+country_osm_id+'/'+state_osm_id+'/'+level_4_geojson_filename;
    await fs.writeFile(geojsonPath, state_geojson_string, 'utf-8');
  }
  */

  const allState = require(basedir+country_osm_id+'/'+level_4_object_filename);
  for (const state_osm_id in allState) {
    const allCities = require(basedir+country_osm_id+'/'+state_osm_id+'/'+level_7_object_filename);
    for (const city_osm_id in allCities) {
      const city_geojson = await osmGeoJson.get(city_osm_id);
      const city_geojson_string = JSON.stringify(city_geojson, null, 2);
      console.log(city_geojson);
      const geojsonPath = basedir+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'.geojson';
      await fs.writeFile(geojsonPath, city_geojson_string, 'utf-8');
    }
  }

})();