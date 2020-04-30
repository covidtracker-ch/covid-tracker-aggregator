
import { Meteor } from 'meteor/meteor';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import ZipsWeekly from '/imports/api/zipsWeekly';

function zipSummary(zips) {
  let cases = 0;
  let submissions = 0;
  zips.forEach(z => {
    cases += z.cases;
    submissions += z.submissions;
  });
  return {cases, submissions}
}

function getSummary() {
  return {
    total: zipSummary(Zips.find().fetch()),
    daily: zipSummary(ZipsDaily.find().fetch()),
    weekly: zipSummary(ZipsWeekly.find().fetch()),
    _created: new Date()
  }
}

function postData() {
  console.log('post data to dataserver...')

  let postObj = {
    zips: Zips.find({submissions: {$gte: 50}}).fetch(),
    zipsDaily: ZipsDaily.find({submissions: {$gte: 50}}).fetch(),
    zipsWeekly: ZipsWeekly.find({submissions: {$gte: 50}}).fetch(),
    summary: getSummary()
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

export {postData, getSummary};
