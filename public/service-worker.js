importScripts('/workbox/workbox-sw.js');

workbox.setConfig({ debug: true });
workbox.setConfig({ modulePathPrefix: '/workbox' });

workbox.routing.registerRoute(
  data => {
    return (
      data.request.destination === 'document'
    );
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'html-cache',
  })
);

workbox.routing.registerRoute(
  data => {
    if (data.url.pathname === '/_next/webpack-hmr') {
      return false;
    }

    if (data.url.pathname.startsWith('/_next/static/development/')) {
      return false;
    }

    return (
      data.url.pathname.substr(0, 14) === '/_next/static/' &&
      (data.request.destination === 'script' ||
        data.url.pathname.substr(-10, 10) === '.module.js')
    );
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'assets-cache',
  })
);