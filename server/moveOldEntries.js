
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import OldEntries from '/imports/api/oldEntries';

function moveOldEntries() {
  // moves entries that are older than 2 weeks to oldEntries collection, where they
  // do not limit aggregation performance
  console.log('removing old entries..');
  const before = new Date(new Date().getTime() - (14*24*3600*1000));
  const entries = Entries.find({_created: {$lt: before}}).fetch();
  console.log('amount to move:', entries.length);

  entries.forEach((entry,i) => {
    if(i%100==0) console.log(i);
    OldEntries.insert(entry);
    Entries.remove(entry._id);
  });
  console.log('done.');
}

Meteor.methods({
  moveOldEntries() {
    moveOldEntries();
  }
});

export default moveOldEntries;