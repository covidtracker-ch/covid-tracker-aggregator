
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';

import './api'
import syncData from './syncData';
import moveOldEntries from './moveOldEntries';
import { computeAggregations, computeDailyAggregations } from './aggregate';
import { postData, getSummary } from './postData';
import { Stats } from '/imports/api/stats';

// some handy methods
Meteor.methods({

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

  ETHDataImport() {
    const url = Meteor.settings.importURL;
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
  }
})

Meteor.startup(() => {
  // start all the loops
  console.log('start all loops');

  SyncedCron.add({
    name: 'Sync entries, aggregate, and post data',
    schedule: (p) => { return p.cron('0 * * * *') },
    job: () => { 
      syncData() ;
      computeAggregations();
      computeDailyAggregations(1);
      computeDailyAggregations(7);
      postData();
    }
  });

  SyncedCron.add({
    name: 'Move old data',
    schedule: (p) => { return p.cron('30 */4 * * *') },
    job: () => { 
      moveOldEntries()
    }
  });

  SyncedCron.add({
    name: 'Insert stats',
    schedule: (p) => { return p.cron('59 23 * * *') },
    job: () => { 
      Stats.insert(getSummary());
    }
  });
  
  if(Meteor.settings.public.isProduction) SyncedCron.start();

});
