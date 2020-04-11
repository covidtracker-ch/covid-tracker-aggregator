
import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import App from '/imports/ui/App'

Meteor.startup(() => {
  render(<App />, document.getElementById('react-target'));
});

Stores = {
  entries: Meteor.connection._stores['entries']._getCollection(),
  zips: Meteor.connection._stores['zips']._getCollection(),
}

