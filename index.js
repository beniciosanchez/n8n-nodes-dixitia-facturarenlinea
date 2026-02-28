'use strict';

const { DixitiaFEL } = require('./nodes/DixitiaFEL/DixitiaFEL.node');
const { DixitiaFELApi } = require('./credentials/DixitiaFELApi.credentials');

module.exports = {
	nodes: [DixitiaFEL],
	credentials: [DixitiaFELApi],
};
