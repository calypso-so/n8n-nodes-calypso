const { CalypsoRag } = require('./nodes/CalypsoRag/CalypsoRag.node');
const { CalypsoApi } = require('./credentials/CalypsoApi.credentials');

module.exports = {
	nodeTypes: [new CalypsoRag()],
	credentialTypes: [new CalypsoApi()],
};
