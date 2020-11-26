const fetch = require('node-fetch');
const fs = require('fs').promises;
const osmGeoJson = require('osm-geojson');
const osmtogeojson = require('osmtogeojson');

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
const level_7_geojson_filename = 'index.geojson';

const station_names_filename = 'station_names.json';
const station_object_filename = 'station_object.json';

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

const fetchOverpass = (data, prefix = null, suffix = null) => {
  return new Promise(async (resolve, reject) => {
    console.log('overpass api query: ');
    console.log(data);
    const params = {
      data: data
    };
    const query = new URLSearchParams(params);
    const res = await fetch('https://overpass-api.de/api/interpreter?'+query);
    const json = await res.json();
    const results = json.elements.filter((e) => {return e.hasOwnProperty('tags')});
    console.log('overpass api results: '+results.length);
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
        fullnameEn = prefix.en + fullnameEn;
      }
      if(suffix && suffix.en){
        fullnameEn = fullnameEn + suffix.en;
      }
      OSMRelationsEn[fullnameEn] = results[idx].id;
      if(results[idx]['tags'].hasOwnProperty('name:ja')){
        fullnameJa = results[idx]['tags']['name:ja'];
      }else{
        fullnameJa = results[idx]['tags']['name'];
      }
      if(prefix && prefix.ja){
        fullnameJa = prefix.ja + fullnameJa;
      }
      if(suffix && suffix.ja){
        fullnameJa = fullnameJa + suffix.ja;
      }
      OSMRelationsJa[fullnameJa] = results[idx].id;
      OSMRelations[results[idx].id] = {
        en: fullnameEn,
        ja: fullnameJa,
      };
    }
    await sleep(60000);
    resolve({ OSMRelations, OSMRelationsEn, OSMRelationsJa })
  });
};

const getAllCountryData = async () => {
  const overpass_query_level_2 = `
    [out:json][timeout:30000];
    relation["admin_level"="2"]["type"="boundary"]["boundary"="administrative"]["name"];
    out tags;
  `;
  const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOverpass(overpass_query_level_2);
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
    [out:json][timeout:30000];
    area["name:en"="${country_name_en}"];
    relation(area)["admin_level"="4"]["type"="boundary"]["boundary"="administrative"]["name"];
    out tags;
  `;
  const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOverpass(overpass_query_level_4);

  // write out key as relation id
  const OSMRelationsString = JSON.stringify(OSMRelations, null, 2);
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

const getAllCityData = async (country_osm_id, level) => {
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
    const prefix = {
      en: state_name_en+' ',
      ja: state_name_ja+' '
    };

    let OSMRelations_ = {};
    let OSMRelationsEn_ = {};
    let OSMRelationsJa_ = {};
    const queryLevel7 = async () => {
      const overpass_query_level_7 = `
        [out:json][timeout:30000];
        relation(${state_osm_id});
        map_to_area;
        (
          relation(area)["admin_level"="7"]["type"="boundary"]["boundary"="administrative"]["name"];
        );
        out tags;
      `;
      const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOverpass(overpass_query_level_7, prefix);
      OSMRelations_ = Object.assign(OSMRelations_, OSMRelations);
      OSMRelationsEn_ = Object.assign(OSMRelationsEn_, OSMRelationsEn);
      OSMRelationJa_ = Object.assign(OSMRelationsJa_, OSMRelationsJa);
    };
    await queryLevel7();
    const queryLevel8 = async () => {
      const overpass_query_level_8 = `
        [out:json][timeout:30000];
        relation(${state_osm_id});
        map_to_area;
        (
          relation(area)["admin_level"="8"]["type"="boundary"]["boundary"="administrative"]["name"];
        );
        out tags;
      `;
      const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOverpass(overpass_query_level_8, prefix);
      OSMRelations_ = Object.assign(OSMRelations_, OSMRelations);
      OSMRelationsEn_ = Object.assign(OSMRelationsEn_, OSMRelationsEn);
      OSMRelationsJa_ = Object.assign(OSMRelationsJa_, OSMRelationsJa);
    };
    await queryLevel8();

    console.log(Object.keys(OSMRelations_).length);

    // write out key as relation id
    level_7_obj = Object.assign(level_7_obj, OSMRelations_);
    const OSMRelationsString = JSON.stringify(OSMRelations_, null, 2);
    const OSMRelationsDir = basedir+country_osm_id+'/'+state_osm_id+'/';
    try {
      await fs.stat(OSMRelationsDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsDir);
    }
    await fs.writeFile(OSMRelationsDir+level_7_object_filename, OSMRelationsString, 'utf-8');

    // write out key as name:en
    const OSMRelationsEnString = JSON.stringify(OSMRelationsEn_, null, 2);
    level_7_obj_en = Object.assign(level_7_obj_en, OSMRelationsEn_);
    const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn_), null, 2);
    level_7_names_en = level_7_names_en.concat(Object.keys(OSMRelationsEn_));
    const OSMRelationsEnDir = basedir_en+country_osm_id+'/'+state_osm_id+'/';
    try {
      await fs.stat(OSMRelationsEnDir);
    } catch (error) {
      await fs.mkdir(OSMRelationsEnDir);
    }
    await fs.writeFile(OSMRelationsEnDir+level_7_object_filename, OSMRelationsEnString, 'utf-8');
    await fs.writeFile(OSMRelationsEnDir+level_7_names_filename, OSMRelationsEnNamesString, 'utf-8');

    // write out key as name:ja
    const OSMRelationsJaString = JSON.stringify(OSMRelationsJa_, null, 2);
    level_7_obj_ja = Object.assign(level_7_obj_ja, OSMRelationsJa_);
    const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa_), null, 2);
    level_7_names_ja = level_7_names_ja.concat(Object.keys(OSMRelationsJa_));
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

const getAllStateAndCityGeoJSON = async (country_osm_id) => {
  // get state GeoJSON
  const allState = require(basedir+country_osm_id+'/'+level_4_object_filename);
  for (const state_osm_id in allState) {
    const geojsonPath = basedir+country_osm_id+'/'+state_osm_id+'/'+level_4_geojson_filename;
    try {
      await fs.stat(geojsonPath);
    } catch (error) {
      let state_geojson = {};
      try {
        state_geojson = await osmGeoJson.get(state_osm_id);
      } catch(error) {
        const state_osm_res = await fetch('https://www.openstreetmap.org/api/0.6/relation/'+state_osm_id+'/full.json');
        const state_osm_json = await state_osm_res.json();
        state_geojson = osmtogeojson(state_osm_json);
      } finally {
        const state_geojson_string = JSON.stringify(state_geojson, null, 2);
        await fs.writeFile(geojsonPath, state_geojson_string, 'utf-8');
      }
    }
  }
  // get city GeoJSON
  for (const state_osm_id in allState) {
    const allCities = require(basedir+country_osm_id+'/'+state_osm_id+'/'+level_7_object_filename);
    for (const city_osm_id in allCities) {
      const cityDir = basedir+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'/';
      const geoJSONPath = cityDir+level_7_geojson_filename;
      try {
        await fs.stat(cityDir);
      } catch (error) {
        await fs.mkdir(cityDir);
      }
      try {
        await fs.stat(geoJSONPath);
        console.log('city geojson already exists, skip.');
      } catch (error) {
        let city_geojson = {};
        try {
          city_geojson = await osmGeoJson.get(city_osm_id);
        } catch(error) {
          const city_osm_res = await fetch('https://www.openstreetmap.org/api/0.6/relation/'+city_osm_id+'/full.json');
          const city_osm_json = await city_osm_res.json();
          city_geojson = osmtogeojson(city_osm_json);
        } finally {
          const city_geojson_string = JSON.stringify(city_geojson, null, 2);
          await fs.writeFile(geoJSONPath, city_geojson_string, 'utf-8');
        }
      }
    }
  }
}

const getAllStationData = async (country_osm_id) => {
  const allStates = require(basedir+country_osm_id+'/'+level_4_object_filename);
  let station_obj = {};
  let station_names_en = [];
  let station_obj_en = {};
  let station_names_ja = [];
  let station_obj_ja = {};
  for (const state_osm_id in allStates) {
    const allCities = require(basedir+country_osm_id+'/'+state_osm_id+'/'+level_7_object_filename);
    for (const city_osm_id in allCities) {
      const OSMRelationsPath = basedir+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'/'+station_object_filename;
      try {
        await fs.stat(OSMRelationsPath);
        console.log('Station data already exists, skip: '+city_osm_id);
      } catch (error) {
        const overpass_query_station = `
          [out:json][timeout:30000];
          relation(${city_osm_id});
          map_to_area;
          (
            nwr(area)[railway=station];
          );
          out tags;
        `;
        const prefix = {
          en: allCities[city_osm_id].en+' ',
          ja: allCities[city_osm_id].ja+' ',
        };
        const suffix = {
          en: ' Station',
          ja: '駅'
        };
        const { OSMRelations, OSMRelationsEn, OSMRelationsJa } = await fetchOverpass(overpass_query_station, prefix, suffix);
        const OSMRelationsDir = basedir+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'/';
        try {
          await fs.stat(OSMRelationsDir);
        } catch (error) {
          await fs.mkdir(OSMRelationsDir);
        }
        // write out key as relation id
        station_obj = Object.assign(station_obj, OSMRelations);
        const OSMRelationsString = JSON.stringify(OSMRelations, null, 2);
        await fs.writeFile(OSMRelationsDir+station_object_filename, OSMRelationsString, 'utf-8');

        // write out key as name:en
        const OSMRelationsEnString = JSON.stringify(OSMRelationsEn, null, 2);
        station_obj_en = Object.assign(station_obj_en, OSMRelationsEn);
        const OSMRelationsEnNamesString = JSON.stringify(Object.keys(OSMRelationsEn), null, 2);
        station_names_en = station_names_en.concat(Object.keys(OSMRelationsEn));
        const OSMRelationsEnDir = basedir_en+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'/';
        try {
          await fs.stat(OSMRelationsEnDir);
        } catch (error) {
          await fs.mkdir(OSMRelationsEnDir);
        }
        await fs.writeFile(OSMRelationsEnDir+station_object_filename, OSMRelationsEnString, 'utf-8');
        await fs.writeFile(OSMRelationsEnDir+station_names_filename, OSMRelationsEnNamesString, 'utf-8');

        // write out key as name:ja
        const OSMRelationsJaString = JSON.stringify(OSMRelationsJa, null, 2);
        station_obj_ja = Object.assign(station_obj_ja, OSMRelationsJa);
        const OSMRelationsJaNamesString = JSON.stringify(Object.keys(OSMRelationsJa), null, 2);
        station_names_ja = station_names_en.concat(Object.keys(OSMRelationsJa));
        const OSMRelationsJaDir = basedir_ja+country_osm_id+'/'+state_osm_id+'/'+city_osm_id+'/';
        try {
          await fs.stat(OSMRelationsJaDir);
        } catch (error) {
          await fs.mkdir(OSMRelationsJaDir);
        }
        await fs.writeFile(OSMRelationsJaDir+station_object_filename, OSMRelationsJaString, 'utf-8');
        await fs.writeFile(OSMRelationsJaDir+station_names_filename, OSMRelationsJaNamesString, 'utf-8');
      }
    }
  }
  // 国レベルの駅 オブジェクト
  const station_obj_string = JSON.stringify(station_obj, null, 2);
  await fs.writeFile(basedir+country_osm_id+'/'+station_object_filename, station_obj_string, 'utf-8');

  // 国レベルの駅 英語オブジェクト
  const station_obj_en_string = JSON.stringify(station_obj_en, null, 2);
  await fs.writeFile(basedir_en+country_osm_id+'/'+station_object_filename, station_obj_en_string, 'utf-8');

  // 国レベルの駅 日本語オブジェクト
  const station_obj_ja_string = JSON.stringify(station_obj_ja, null, 2);
  await fs.writeFile(basedir_ja+country_osm_id+'/'+station_object_filename, station_obj_ja_string, 'utf-8');

  // 国レベルの駅 英語配列
  const station_names_en_string = JSON.stringify(station_names_en, null, 2);
  await fs.writeFile(basedir_en+country_osm_id+'/'+station_names_filename, station_names_en_string, 'utf-8');

  // 国レベルの駅 日本語配列
  const station_names_ja_string = JSON.stringify(station_names_ja, null, 2);
  await fs.writeFile(basedir_ja+country_osm_id+'/'+station_names_filename, station_names_ja_string, 'utf-8');
}

(async() => {
  try {
    await fs.stat(basedir+level_2_object_filename);
    console.log('Country index data already exists, skip.');
  } catch (error) {
    await getAllCountryData();
  }

  const countryName = 'Japan';

  const allCountry = require(basedir_en+level_2_object_filename);
  const country_osm_id = allCountry[countryName];

  const countryGeoJSONPath = basedir+country_osm_id+'/'+level_2_geojson_filename;
  try {
    await fs.stat(countryGeoJSONPath);
    console.log(countryName+' country GeoJSON already exists, skip.');
  } catch (error) {
    const country_GeoJSON = await osmGeoJson.get(country_osm_id);
    const country_GeoJSON_string = JSON.stringify(country_GeoJSON, null, 2);
    await fs.writeFile(countryGeoJSONPath, country_GeoJSON_string, 'utf-8');
  }

  const countryDir = basedir+country_osm_id+'/';
  try {
    await fs.stat(countryDir+level_4_object_filename);
    console.log(countryName+' country state index data already exists, skip.');
  } catch (error) {
    await getAllStateData(countryName, country_osm_id);
  }

  //await getAllCityData(country_osm_id);

  // GeoJSONを収集する
  //await getAllStateAndCityGeoJSON(country_osm_id);

  // 駅情報を収集する
  await getAllStationData(country_osm_id);

})();