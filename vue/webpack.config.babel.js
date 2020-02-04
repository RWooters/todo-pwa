import path from 'path';
import fs from 'fs';

require('dotenv').config();

const app = {
  title: 'Progressive ToDo List',
  short: 'PWA ToDo',
  description: 'A ToDo List as a Progressive Web App',
  colorbkg: '#fff',
  color: '#000',
};

import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import WebpackPwaManifest from 'webpack-pwa-manifest';
import { GenerateSW } from 'workbox-webpack-plugin';

import PurgecssPlugin from 'purgecss-webpack-plugin';
import TerserJSPlugin from 'terser-webpack-plugin';
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin';
import glob from 'glob-all';
import tailwindcss from 'tailwindcss';

module.exports = (env, argv) => {
  const dirDist = path.resolve(__dirname, 'dist');
  const dirSrc = path.resolve(__dirname, 'src');
  const dev = argv.mode !== 'production';

  let serveHttps = false;
  if (process.env.SSL_KEY && process.env.SSL_CRT && process.env.SSL_PEM) {
    serveHttps = {
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CRT),
      ca: fs.readFileSync(process.env.SSL_PEM),
    };
  }

  return {
    optimization: {
      minimizer: [new TerserJSPlugin({}), new OptimizeCSSAssetsPlugin({})],
    },
    entry: {
      app: `${dirSrc}/index.js`,
    },
    devServer: {
      contentBase: dirDist,
      compress: true,
      port: process.env.PORT || 8080,
      https: serveHttps,
      hot: true,
      historyApiFallback: true,
    },
    output: {
      path: dirDist,
      filename: 'assets/[name]-[hash].js',
    },
    devtool: dev ? `cheap-module-eval-source-map` : undefined,
    plugins: [
      new CleanWebpackPlugin({
        cleanStaleWebpackAssets: false,
      }),
      new MiniCssExtractPlugin({
        filename: dev ? 'assets/[name].css' : 'assets/[name].[hash].css',
        chunkFilename: dev
          ? 'assets/[name].[id].css'
          : 'assets/[name].[id].[hash].css',
      }),
      ...(dev
        ? []
        : [
            new PurgecssPlugin({
              paths: glob.sync([`${dirSrc}/**/*.vue`, `${dirSrc}/index.html`]),
            }),
          ]),
      new CopyWebpackPlugin([
        {
          from: 'src/assets/static',
          to: 'assets/static',
        },
      ]),
      new HtmlWebpackPlugin({
        title: app.title,
        description: app.description,
        template: 'src/index.html',
        filename: './index.html',
        chunksSortMode: 'none',
        minify: dev
          ? false
          : {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              useShortDoctype: true,
            },
      }),
      new WebpackPwaManifest({
        name: app.title,
        short_name: app.short,
        description: app.description,
        theme_color: app.color,
        background_color: app.colorbkg,
        display: 'standalone',
        crossorigin: 'use-credentials',
        icons: [
          {
            src: path.resolve('./src/assets/favicon.png'),
            sizes: [96, 128, 192, 256, 384, 512],
            destination: path.join('assets', 'icon'),
            ios: true,
          },
        ],
        share_target: {
          action: '/vue/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      }),
      new GenerateSW({
        include: [/\.html$/, /\.js$/, /\.css$/],
        runtimeCaching: [
          {
            urlPattern: new RegExp(/\.(?:png|gif|jpg|svg|ico|webp)$/),
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
            },
          },
          {
            urlPattern: new RegExp(/\.html$/),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'index-cache',
            },
          },
        ],
        navigateFallback: 'index.html',
        skipWaiting: true,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.svg$/,
          exclude: /node_modules/,
          loader: ['babel-loader', 'raw-loader'],
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.(png|jpg|gif)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]?[hash]',
          },
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: dev,
                //reloadAll: true,
              },
            },
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [
                  require('postcss-nested'),
                  tailwindcss('./tailwind.config.js'),
                  require('autoprefixer'),
                ],
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {},
      extensions: ['.js', '.vue'],
    },
  };
};