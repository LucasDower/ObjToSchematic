const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
    entry: './src/client.ts',
    plugins: [
        new NodePolyfillPlugin(),
    ],
    module: {
        rules: [
            /*
            {
                test: /\.json$/i,
                use: ['json-loader'],
                exclude: /node_modules/,
            },
            */
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
                exclude: /node_modules|main\.ts/,
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
