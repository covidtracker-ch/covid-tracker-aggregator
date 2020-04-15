
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import OldEntries from '/imports/api/oldEntries';

function moveOldEntries() {
  // moves entries that are older than 2 weeks to oldEntries collection, where they
  // do not limit aggregation performance
  console.log('removing old entries..');
  const before = new Date(new Date().getTime() - (14*24*3600*1000));
  const entries = Entries.find({_created: {$lt: before}}).fetch();
  entries.forEach(entry => {
    OldEntries.insert(entry);
    Entries.remove(entry._id);
  });
  console.log('amount moved:', entries.length);
  console.log('done.');
}

Meteor.startup(() => {
  Meteor.setInterval(() => {
    moveOldEntries();
  }, 4*3600*1000);
});