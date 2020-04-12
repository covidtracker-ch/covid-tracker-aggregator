
import { Meteor } from 'meteor/meteor';
import Entries from '/imports/api/entries';
import Zips from '/imports/api/zips';
import ZipsDaily from '/imports/api/zipsDaily';
import './api'
import './syncData'

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


// some handy methods
Meteor.methods({

  postData() {
    postData();
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












