
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import ZipsWeekly from '/imports/api/zipsWeekly';

function postData() {
  console.log('post data to dataserver...')
  const zips = Zips.find({submissions: {$gte: 50}}).fetch();
  let cases = 0;
  let submissions = 0;
  zips.forEach(z => {
    cases += z.cases;
    submissions += z.submissions;
  })


  HTTP.post(Meteor.settings.postURL,{
    data: {
      zips: zips,
      zipsDaily: ZipsDaily.find({submissions: {$gte: 50}}).fetch(),
      zipsWeekly: ZipsWeekly.find({submissions: {$gte: 50}}).fetch(),
      total: {
        cases, submissions
      }
    }
  }, r => {
    console.log(r)
  })
  console.log('done');
}

Meteor.methods({
  postData() {
    postData();
  }
})

Meteor.startup(() => {
  console.log('start post loop');
  Meteor.setInterval(() => {
    if(!Meteor.settings.public.isProduction) return;
    if(!Meteor.settings.public.isZuerich) postData();
  }, 1000*3600)
});

