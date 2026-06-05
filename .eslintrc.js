module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},

	ignorePatterns: ['.eslintrc.js', 'jest.config.js', '**/*.js', '**/dist/**', './node_modules/**'],

	overrides: [
		{
			files: ['**/*.ts'],
			plugins: ['n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
			rules: {
				'n8n-nodes-base/node-dirname-against-convention': 'error',
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'error',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'error',
				'n8n-nodes-base/node-execute-block-double-assertion-for-items': 'error',
				'n8n-nodes-base/node-param-default-wrong-for-number': 'error',
				'n8n-nodes-base/node-param-placeholder-miscased-id': 'error',
				'n8n-nodes-base/node-param-option-name-wrong-for-get-many': 'error',
			},
		},

		{
			files: ['**/*.credentials.ts'],
			plugins: ['n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
		},

		{
			files: ['./package.json'],
			plugins: ['n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
		},
	],
};
