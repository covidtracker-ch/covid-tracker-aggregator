import { Meteor } from 'meteor/meteor';

import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';

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

Meteor.methods({

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
  }

})