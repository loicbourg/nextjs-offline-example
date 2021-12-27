const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const moduleFileExtensions = [
  '.dev.js',
  '.dev.js.map',
  '.prod.js',
  '.prod.js.map',
];

function loadWorkboxModule(modules) {
  let copies = [];

  for (let module of modules) {
    for (let moduleFileExtension of moduleFileExtensions) {
      copies.push(
        {
          from: path.join(
            __dirname,
            `./node_modules/${module}/build/${module}${moduleFileExtension}`
          ),
          to: path.join(__dirname, 'public/workbox/'),
        },
      );
    }
  }

  return copies;
}

module.exports = {
  webpack: function(config, options) {
    // webpack is run twice: one time for the server part and the second time for the client part
    // we dont want to copy the workbox modules twice
    if (!options.isServer) {
      return config;
    }

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          ...loadWorkboxModule([
            'workbox-core',
            'workbox-routing',
            'workbox-strategies',
          ]),
          {
            from: path.join(
              __dirname,
              './node_modules/workbox-sw/build/workbox-sw.js'
            ),
            to: path.join(__dirname, 'public/workbox/'),
          },
          {
            from: path.join(
              __dirname,
              './node_modules/workbox-sw/build/workbox-sw.js.map'
            ),
            to: path.join(__dirname, 'public/workbox/'),
          },
        ],
      })
    );

    return config;
  }
}