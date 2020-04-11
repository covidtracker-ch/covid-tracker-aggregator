
import React from 'react'
import Entries from '../api/entries'
import Zips from '../api/zips'
import ZipsDaily from '../api/zipsDaily'
const axios = require('axios');

import './app.css'

export default class extends React.Component {

	state = {
		coughing: false,
		dyspnea: false,
		fever: false,
		zip: ''
	}

	onSubmit() {
		const entry = this.state;
		axios.post('/api/entries', entry)
	  .then(function (response) {
			console.log(response);
	  })
	  .catch(function (error) {
			console.log(error);
	  });

		this.setState({
			coughing: false,
			dyspnea: false,
			fever: false,
			zip: ''
		})
	}

	render() {
    return (
      <div>
        <h1>covid-tracker aggregator</h1>
      </div>
    );
	}
}
