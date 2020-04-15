
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
const parse = require('csv-parse/lib/sync')

function isSuspectedPositive(entry) {
  // case definition: https://docs.google.com/spreadsheets/d/1RjW7Q4GEi4UZLK3GzF2x0pw5TpMVwKaFMLZcb-h0duQ/edit?usp=sharing
  const groupA = ['symptom_coughing','symptom_dyspnea','symptom_fever','symptom_lostTaste'];
  const groupB = ['symptom_headache','symptom_musclePain','symptom_tiredness','symptom_runnyNose','symptom_throat'];
  const groupC = ['symptom_nausea','symptom_diarrhea'];

  let score = 0;
  let hasGroupASymptom = false;

  Object.keys(entry).forEach(key => {
    if(entry[key] != "" && groupA.includes(key)) {
      score += 2;
      hasGroupASymptom = true;
    }
    if(entry[key] != "" && groupB.includes(key)) score += 1;
    if(entry[key] != "" && groupC.includes(key)) score += ((entry.age_range == '0-10') ? 1 : 0.5);
  });

  if(score >= 3 && hasGroupASymptom) return true;
  if(entry.was_in_contact_with_case != "" && hasGroupASymptom) return true;

  return false;
}

function hasTestedTPositive(entry) {
  if(entry.test_result == "positive") return true;
}

function getData(skipMost) {

  let url = 'https://covid-export.apps-customer.210235761750.ninegcp.ch/export?since=';
  const user = 'export';
  const password = Meteor.settings.exportPassword;
  
  console.log('sync entries...');
  if(skipMost) console.log('skip most');

  const youngest = Entries.find({},{sort: {_created: -1}, limit: 1}).fetch();
  
  // find correct value for since field
  let since
  if(youngest.length == 1) {
    since = youngest[0]._created.toISOString().split('.')[0];
    console.log('getting all entries since',since);
  } else {
    console.log('nothing in db, fetch since beginning');
    since = '2020-03-25T13:00:00';
  }

  if(!Meteor.settings.public.isProduction) {
    // just fetch from 1 hour ago
    console.log('we are in dev, so lets just fetch from 3 hours ago');
    const oneHourAgo = new Date(new Date().getTime()-10*1000*3600);
    since = oneHourAgo.toISOString().split('.')[0];
  }

  url = url + since;

  let string;

  try {
    // get latest data
    const result = HTTP.get(url,{auth: user+':'+password})
    string = result.content;
  } catch(e) {
    console.log(e);
    return;
  }

  // parse csv
  const entries = parse(string, {
    columns: true,
    skip_empty_lines: true
  });

  console.log('found',entries.length,'new entries.');

  // upsert
  console.log('upserting...');
  entries.forEach((entry,i) => {
    if(i%100 == 0) console.log(i);
    if(skipMost && i%100 !== 0) return;                      // faster retrieval for dev
    if(Entries.findOne({id: entry.id})) return;
    entry._created = new Date(entry._created);
    entry.suspected = isSuspectedPositive(entry);
    entry.aggregated = false;
    Entries.insert(entry)
  });
  console.log('done.');
}

Meteor.methods({

  getData(skipMost) {
    getData(skipMost);
  },

  classifyAllThatAreNot() {
    // this we have to redo if case definition changes
    const entries = Entries.find({suspected: {$exists: false}}).fetch()
    console.log('classyfing', entries.length);
    entries.forEach((e,i) => {
      if(i%100 == 0) console.log(i)
      Entries.update(e._id, {$set: {suspected: isSuspectedPositive(e)}})
    });
    console.log('done')
  },

})


Meteor.startup(() => {
  console.log('start sync data loop')
  Meteor.setInterval(() => {
    getData();
  }, 1000*3600)
})





