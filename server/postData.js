
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import ZipsWeekly from '/imports/api/zipsWeekly';
import Stats from '/imports/api/stats';

function getSummary(zips) {
  let cases = 0;
  let submissions = 0;
  zips.forEach(z => {
    cases += z.cases;
    submissions += z.submissions;
  });
  return {cases, submissions}
}

function postData() {
  console.log('post data to dataserver...')

  let postObj = {
    zips: Zips.find({submissions: {$gte: 50}}).fetch(),
    zipsDaily: ZipsDaily.find({submissions: {$gte: 50}}).fetch(),
    zipsWeekly: ZipsWeekly.find({submissions: {$gte: 50}}).fetch(),
    summary: {
      total: getSummary(Zips.find().fetch()),
      daily: getSummary(ZipsDaily.find().fetch()),
      weekly: getSummary(ZipsWeekly.find().fetch())
    }
  }

  HTTP.post(Meteor.settings.postURL,{
    data: postObj
  }, r => {
    console.log(console.log('posted.'))
  })

  HTTP.post(Meteor.settings.postURL2,{
    data: postObj
  }, r => {
    console.log(console.log('posted.'))
  })
  console.log('done');
}

Meteor.methods({
  postData() {
    postData();
  }
});

Meteor.startup(() => {
  console.log('start post loop');
  Meteor.setInterval(() => {
    if(!Meteor.settings.public.isProduction) return;
    postData();
  }, 1000*3600)
});

Meteor.startup(() => {
  console.log('sup')
  SyncedCron.add({
    name: 'Add stats',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('at 11:00 pm');
    },
    job: function() {
      const summary = {
        total: getSummary(Zips.find().fetch()),
        daily: getSummary(ZipsDaily.find().fetch()),
        weekly: getSummary(ZipsWeekly.find().fetch())
      };
      Stats.insert(summary);
    }
  });
  SyncedCron.start();
  
})

