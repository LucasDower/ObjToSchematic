const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/editor/main.ts',
    plugins: [
        new NodePolyfillPlugin(),
        new HtmlWebpackPlugin({
            template: './template.html',
            favicon: './res/static/icon.ico',
        }),
    ],
    module: {
        rules: [
            {
                test: /\.worker.ts$/,
                use: [
                    'worker-loader',
                    'ts-loader',
                ],
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
                exclude: /node_modules/,
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
