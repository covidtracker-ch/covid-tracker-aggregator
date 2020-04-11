
import { Mongo } from 'meteor/mongo';

/*

	{
		isMale: true,
		age: 25,
		zip: 8004,
		hasBeenTested: false,
		dateTested: new Date(),
		worksInHealth: false,
		travelled: false,
		chronicalDisease: false,
		fever: false,
		coughing: false,
		dyspnea: false,
		phoneDigits: 0009
	}

*/

export default new Mongo.Collection('entries');
