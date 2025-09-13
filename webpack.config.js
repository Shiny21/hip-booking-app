const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
const path = require('path');

module.exports = {
  entry: './src/index',
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3002,
  },
  output: {
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
          },
        },
      },
      {
      test: /\.css$/,  // ✅ add this rule
      use: ['style-loader', 'css-loader'],
    },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'bookingApp',
      filename: 'remoteEntry.js',
      remotes: {
        authApp: 'authApp@http://localhost:3001/remoteEntry.js', // ✅ references authApp container
      },
    exposes: {
    'BookingForm': './src/components/BookingForm',
    'BookingList': './src/components/BookingList',
    },
    shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' }
    }
}),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};