const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './src/App.js',
	output: {
		filename: './index.js',
		path: path.resolve(__dirname, 'build')
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: path.resolve(__dirname, './src/index.html'),
		}),
	],
	devServer: {
		contentBase: path.join(__dirname, 'build'),
		compress: true,
		port: 8080
	}
};
