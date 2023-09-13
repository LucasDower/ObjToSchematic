const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/editor/main.ts',
    plugins: [
        new NodePolyfillPlugin(),
        new HtmlWebpackPlugin({
            template: 'public/index.html',
            favicon: './res/static/icon.ico',
        }),
        new CopyWebpackPlugin({
            patterns: [
              { from: "public/styles.css", to: "." }
            ],
        }),
    ],
    module: {
        rules: [
            {
                test: /\.worker.ts$/,
                loader: 'worker-loader',
            },
            {
                test: /\.vs|fs|atlas$/,
                use: 'raw-loader',
                exclude: /\.js$/,
                exclude: /node_modules/,
            },
            {
                test: /\.png$/,
                use: 'file-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, './webpack'),
    },
};
