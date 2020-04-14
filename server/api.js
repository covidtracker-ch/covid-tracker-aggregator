
import { WebApp } from 'meteor/webapp'
import express from 'express'
import Entries from '/imports/api/entries'
import Zips from '/imports/api/zips'
import ZipsDaily from '/imports/api/zipsDaily'

var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()

const app = express();

app.use(bodyParser.json());

app.set('json spaces', 2);

function toCSV(json) {
  var fields = Object.keys(json[0])
  var replacer = function(key, value) { return value === null ? '' : value } 
  var csv = json.map(function(row){
    return fields.map(function(fieldName){
      return JSON.stringify(row[fieldName], replacer)
    }).join(',')
  })
  csv.unshift(fields.join(',')) // add header column
   csv = csv.join('\r\n');
  return csv
}

app.get('/api/zips', (req, res) => {
  let sortObj = {};
  if(req.query.sort) sortObj[req.query.sort] = -1;
  const zips = Zips.find({submissions: {$gte: 50}},{
    sort: sortObj, 
    limit: req.query.limit/1.0
  }).fetch();
  if(req.query.format == 'csv') {
    res.setHeader('Content-disposition', 'attachment; filename=data.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(toCSV(zips));
    return;
  }
  res.status(200).json(zips);
});

app.get('/api/zipsDaily', (req, res) => {
  const zipsDaily = ZipsDaily.find({submissions: {$gte: 50}}).fetch();
  res.status(200).json(zipsDaily);
});

app.get('/api/total', (req, res) => {
  const zips = Zips.find().fetch();
  let cases = 0;
  let submissions = 0;
  zips.forEach(z => {
    cases += z.cases;
    submissions += z.submissions;
  })
  res.status(200).json({
    cases, submissions
  });
});

WebApp.connectHandlers.use(app);

/*
  Zips.aggregate(pipeline)
  let pipeline = [ { $project: { cases: 1, submissions: 1, fraction: { $multiply: ['$cases','$submissions'] } } } ]
*/
