
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import './api'
const parse = require('csv-parse/lib/sync')

function isInfected(entry) {

  if(entry.test_result == "positive") return true;

  const hasFever = entry.symptom_fever != "null";         // important symptom
  const hasCoughing = entry.symptom_coughing != "null";   // important symptom
  const hasDyspnea = entry.symptom_dyspnea != "null";     // important symptom

  const hasTiredness = entry.symptom_tiredness != "null";
  const hasThroad = entry.symptom_throat != "null";

  let countImportantSymtoms = 0;
  countImportantSymtoms += (hasFever ? 1 : 0);
  countImportantSymtoms += (hasCoughing ? 1 : 0);
  countImportantSymtoms += (hasDyspnea ? 1 : 0);

  if(countImportantSymtoms == 3) return true;


  let countOtherSymptoms = 0;
  countOtherSymptoms += (hasTiredness ? 1 : 0);
  countOtherSymptoms += (hasThroad ? 1 : 0);

  if(countImportantSymtoms == 2 && countOtherSymptoms >= 1) return true;

  return false;

  return isInfected;
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
    if(i%100 == 0) console.log(i)
    // if(i%100 !== 0) return;                      // faster retrieval for dev
    if(Entries.findOne({id: entry.id})) return;
    entry._created = new Date(entry._created);
    entry.infected = isInfected(entry);
    entry.aggregated = false;
    Entries.insert(entry)
  });
  console.log('done.');
}

function computeDailyAggregations() {
  console.log('computing daily aggregations...');
  // put all counts to zero
  ZipsDaily.remove({submissions: 0});
  ZipsDaily.update({},{$set: {cases: 0, submissions: 0}}, {multi: true});

  const before = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
  const entries = Entries.find({
    _created: {$gt: before}
  }).fetch();
  console.log('amount',entries.length);
  entries.forEach((entry, i) => {
    if(i%100 == 0) console.log(i);
    let zip = ZipsDaily.findOne({zip: entry.zip});
    if(!zip) {
      const id = ZipsDaily.insert({
        zip: entry.zip,
        cases: 0,
        submissions: 0
      })
      zip = ZipsDaily.findOne(id);
    };
    const cases = zip.cases + (entry.infected ? 1 : 0);
    const submissions = zip.submissions + 1;
    const fraction = cases/submissions;
    // increment 
    ZipsDaily.update(zip._id, {$set: {
      cases, submissions, fraction
    }});
  })
  console.log('done.');

}

function computeAggregations() {
  console.log('computing aggregations...');
  const entries = Entries.find({
    aggregated: {$ne: true}
  }).fetch();
  console.log('amount not aggregated:', entries.length);
  entries.forEach((entry,i) => {
    if(i%100 == 0) console.log(i);
    let zip = Zips.findOne({zip: entry.zip});
    if(!zip) {
      const id = Zips.insert({
        zip: entry.zip,
        cases: 0,
        submissions: 0
      })
      zip = Zips.findOne(id);
    };
    Entries.update(entry._id, {$set: {aggregated: true}});

    const cases = zip.cases + (entry.infected ? 1 : 0);
    const submissions = zip.submissions + 1;
    const fraction = cases/submissions;
    // increment 
    Zips.update(zip._id, {$set: {
      cases, submissions, fraction
    }});
  })
  console.log('done. ');
}

function postData() {
  console.log('post data to dataserver...')
  const zips = Zips.find().fetch();
  let cases = 0;
  let submissions = 0;
  zips.forEach(z => {
    cases += z.cases;
    submissions += z.submissions;
  })


  HTTP.post(Meteor.settings.postURL,{
    data: {
      zips: zips,
      zipsDaily: ZipsDaily.find().fetch(),
      zipsWeekly: [],
      total: {
        cases, submissions
      }
    }
  }, r => {
    console.log(r)
  })
  console.log('done');
}

Meteor.startup(() => {

  Meteor.setInterval(() => {
    if(!Meteor.settings.public.isProduction) return;
    getData();
    computeAggregations();
    computeDailyAggregations();
    if(!Meteor.settings.public.isZuerich) postData();

  }, 1000*3600)

});


Meteor.methods({

  clean() {
    const amount = Zips.update({},{$unset: {fractions: ''}}, {multi: true});
    console.log(amount)
  },

  getData() {
    getData();
  },

  postData() {
    postData();
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

  aggregate() {
    computeAggregations();
  },

  aggregateDaily() {
    computeDailyAggregations();
  },

  setAllUnaggregated() {
    console.log('setting entries unaggregated..');
    const amount = Entries.update({},{$set: {aggregated: false}}, {multi: true});
    console.log(amount);
    console.log('putting all cases to zero in zips..');
    Zips.update({}, {$set: {cases: 0, submissions: 0, fraction: 0}}, {multi: true});
    console.log('done');
  },

  deleteMostEntries() {
    // useful for dev
    console.log('deleting every 100th')
    Entries.find().fetch().forEach((e,i) => {
      if(i%100 != 0) Entries.remove(e._id);
    })
    console.log('done.',Entries.find().count(), 'left.')
  },

  deleteLast24HoursEntries() {
    const before = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    const toDelete = Entries.find({_created: {$gt: before}}).fetch();
    console.log('delete ',toDelete.length,'out of ', Entries.find().count(),'...');
    Entries.remove({_created: {$gt: before}});
    console.log('done.');
  },

  // ------- some old methods that were used form igrations ----------

  importETHData() {
    const url = 'https://www.dropbox.com/s/9yod1mbzjkvljpj/entries.json?raw=1';
    let string;

    try {
      // get latest data
      console.log('get...');
      const result = HTTP.get(url)
      string = result.content;
      
      const entries = JSON.parse(string);
      console.log('fetched', entries.length, 'entries. inserting...');
      entries.forEach(e => {
        e._created = new Date(e._created);
        e.zip = e.zip + "";
        Entries.insert(e)
      })
      console.log('done.');

    } catch(e) {
      console.log(e);
      return;
    }
  },

})












