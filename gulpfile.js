const path = require('path');
const { task, src, dest, parallel } = require('gulp');

task('build:icons', copyIcons);
task('build:js', copyJavaScript);
task('build:all', parallel('build:icons', 'build:js'));

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	const iconsSource = path.resolve('icons', '*.{png,svg}');
	const iconsDestination = path.resolve('dist', 'icons');

	src(iconsSource).pipe(dest(iconsDestination));

	return src(credSource).pipe(dest(credDestination));
}

function copyJavaScript() {
	// Copy the main index.js file to dist
	const indexJsSource = path.resolve('index.js');
	const indexJsDestination = path.resolve('dist');

	return src(indexJsSource).pipe(dest(indexJsDestination));
}
