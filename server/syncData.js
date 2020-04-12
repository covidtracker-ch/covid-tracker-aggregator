
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
const parse = require('csv-parse/lib/sync')


// deprecated, old case definition

// function isInfected(entry) {

//   if(entry.test_result == "positive") return true;

//   const hasFever = entry.symptom_fever != "null";         // important symptom
//   const hasCoughing = entry.symptom_coughing != "null";   // important symptom
//   const hasDyspnea = entry.symptom_dyspnea != "null";     // important symptom

//   const hasTiredness = entry.symptom_tiredness != "null";
//   const hasThroad = entry.symptom_throat != "null";

//   let countImportantSymtoms = 0;
//   countImportantSymtoms += (hasFever ? 1 : 0);
//   countImportantSymtoms += (hasCoughing ? 1 : 0);
//   countImportantSymtoms += (hasDyspnea ? 1 : 0);

//   if(countImportantSymtoms == 3) return true;


//   let countOtherSymptoms = 0;
//   countOtherSymptoms += (hasTiredness ? 1 : 0);
//   countOtherSymptoms += (hasThroad ? 1 : 0);

//   if(countImportantSymtoms == 2 && countOtherSymptoms >= 1) return true;

//   return false;

//   return isInfected;
// }


function isSuspectedPositive(entry) {
  // case definition: https://docs.google.com/spreadsheets/d/1RjW7Q4GEi4UZLK3GzF2x0pw5TpMVwKaFMLZcb-h0duQ/edit?usp=sharing
  const groupA = ['symptom_coughing','symptom_dyspnea','symptom_fever','symptom_lostTaste'];
  const groupB = ['symptom_headache','symptom_musclePain','symptom_tiredness','symptom_runnyNose','symptom_throat'];
  const groupC = ['symptom_nausea','symptom_diarrhea'];

  let score = 0;
  let hasGroupASymptom = false;

  Object.keys(entry).forEach(key => {
    if(entry[key] != "null" && groupA.includes(key)) {
      score += 2;
      hasGroupASymptom = true;
    }
    if(entry[key] != "null" && groupB.includes(key)) score += 1;
    if(entry[key] != "null" && groupC.includes(key)) score += ((entry.age_range == '0-10') ? 1 : 0.5);
  });

  console.log('score',score);

  if(score >= 3 && hasGroupASymptom) return true;
  if(entry.was_in_contact_with_case != "null" && hasGroupASymptom) return true;

  return false;

}

function hasTestedTPositive(entry) {
  if(entry.test_result == "positive") return true;
}

function getData() {

  let url = 'https://covid-export.apps-customer.210235761750.ninegcp.ch/export?since=';
  const user = 'export';
  const password = Meteor.settings.exportPassword;
  
  console.log('sync entries...');
  

  const youngest = Entries.find({},{sort: {_created: -1}, limit: 1}).fetch();
  
  // find correct value for since field
  let since
  if(youngest.length == 1) {
    since = youngest[0]._created.toISOString().split('.')[0];
    console.log('getting all entries since',since);
  } else {
    console.log('nothing in db, get everything');
    since = '2020-03-25T13:00:00';
  }

  if(!Meteor.settings.public.isProduction) {
    // just fetch from 1 hour ago
    console.log('in dev, so just from 3 hours ago');
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
    // if(i%100 !== 0) return;                      // faster retrieval for dev
    if(!entry.age_range) return;                    // it is an "old" entry
    if(Entries.findOne({id: entry.id})) return;
    entry._created = new Date(entry._created);
    entry.suspected = isSuspectedPositive(entry);
    entry.aggregated = false;
    Entries.insert(entry)
  });
  console.log('done.');
}


Meteor.methods({

  getData() {
    getData();
  },

  classifyAllThatAreNot() {
    // this we have to redo if case definition changes
    const entries = Entries.find({infected: {$exists: false}}).fetch()
    console.log('classyfing', entries.length);
    entries.forEach((e,i) => {
      if(i%100 == 0) console.log(i)
      Entries.update(e._id, {$set: {infected: isInfected(e)}})
    });
    console.log('done')
  },

})