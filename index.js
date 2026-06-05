const { Calypso } = require('./nodes/Calypso/Calypso.node');
const { CalypsoApi } = require('./credentials/CalypsoApi.credentials');

module.exports = {
	nodeTypes: [new Calypso()],
	credentialTypes: [new CalypsoApi()],
};
