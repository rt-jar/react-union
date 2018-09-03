const webpack = require('webpack');
const { promisify } = require('util');
const fse = require('fs-extra');
const fs = require('fs');
const {
	test,
	complement,
	flatten,
	propEq,
	compose,
	filter,
	prop,
	invoker,
	forEach,
	o,
	map,
	head,
} = require('ramda');
const { rejectNil } = require('ramda-extension');
const path = require('path');

const { getUnionConfig, stats } = require('./lib/utils');
const cli = require('./lib/cli');
const configs = require('./webpack.config');

const getClientStatsList = compose(
	filter(propEq('name', 'client')),
	prop('children'),
	invoker(0, 'toJson')
);

const prependClientStats = clientStats => {
	const bundlePath = path.join(clientStats.outputPath, 'server', 'index.js');
	const bundleContent = fs.readFileSync(bundlePath);

	fs.writeFileSync(
		bundlePath,
		`global.CLIENT_STATS = ${JSON.stringify(clientStats)};${bundleContent}`
	);
};

const getWebpackConfigs = cli.noSSR ? map(head) : o(rejectNil, flatten);

async function build() {
	const webpackConfigs = getWebpackConfigs(configs);
	const compiler = webpack(webpackConfigs);
	const run = promisify(compiler.run.bind(compiler));

	const buildStats = await run();
	console.log(buildStats.toString(stats));

	forEach(prependClientStats, getClientStatsList(buildStats));
	copyPublicFolder(getUnionConfig());
}

const copyPublicFolder = forEach(config => {
	fse.copySync(config.paths.public, config.paths.build, {
		dereference: true,
		filter: complement(test(config.copyToPublicIgnore)),
	});
});

module.exports = build;
