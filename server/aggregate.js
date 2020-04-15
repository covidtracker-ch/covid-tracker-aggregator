
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import ZipsWeekly from '/imports/api/zipsWeekly';

function computeDailyAggregations(days) {
  console.log('aggreagting',days,'days...');
  // put all counts to zero
  if(!days) return;
  let ZipsCollection;
  if(days === 1) ZipsCollection = ZipsDaily;
  else if(days === 7) ZipsCollection = ZipsWeekly;
  else return;

  ZipsCollection.remove({submissions: 0});
  ZipsCollection.update({},{$set: {cases: 0, submissions: 0}}, {multi: true});

  const before = new Date(new Date().getTime() - (days * 24 * 3600 * 1000));
  const entries = Entries.find({
    _created: {$gt: before}
  }).fetch();
  console.log('amount',entries.length);
  entries.forEach((entry, i) => {
    if(i%100 == 0) console.log(i);
    let zip = ZipsCollection.findOne({zip: entry.zip});
    if(!zip) {
      const id = ZipsCollection.insert({
        zip: entry.zip,
        cases: 0,
        submissions: 0
      })
      zip = ZipsCollection.findOne(id);
    };
    const cases = zip.cases + (entry.suspected ? 1 : 0);
    const submissions = zip.submissions + 1;
    const fraction = cases/submissions;
    // increment 
    ZipsCollection.update(zip._id, {$set: {
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

    const cases = zip.cases + (entry.suspected ? 1 : 0);
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

  aggregateDaily(days) {
    computeDailyAggregations(days);
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

Meteor.startup(() => {
  console.log('start aggregation loop');
  
  Meteor.setTimeout(() => {
    computeAggregations();
    computeDailyAggregations(1);
    computeDailyAggregations(7);
  }, 1000*3600)

});


