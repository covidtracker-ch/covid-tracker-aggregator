
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';

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

