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

const urlSearchParams = new URL(location).searchParams;

console.log("WAZA", urlSearchParams.get('offlineScripts'), urlSearchParams.get('buildId'));

console.log('is ok');

const buildId = urlSearchParams.get('buildId');
if (buildId) {
  workbox.precaching.precacheAndRoute([{ url: '/offline', revision: buildId }]);

  const offlineScripts = urlSearchParams.get('offlineScripts');
  if (offlineScripts) {
    for (let offlineScript of offlineScripts.split(',')) {
      workbox.precaching.precacheAndRoute([
        { url: '/_next/' + offlineScript, revision: buildId },
      ]);
    }
  }
}

workbox.routing.setCatchHandler(event => {
  switch (event.request.destination) {
    case 'document':
      return workbox.precaching.matchPrecache('/offline');
  }
});
