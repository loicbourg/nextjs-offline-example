importScripts('/workbox/workbox-sw.js');

workbox.setConfig({debug: true});
workbox.setConfig({modulePathPrefix: '/workbox'});

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
        data.url.pathname.substr(-10, 10) === '.module.js') || data.request.destination === 'style'
    );
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'assets-cache',
  })
);

const urlSearchParams = new URL(location).searchParams;

const buildId = urlSearchParams.get('buildId');
if (buildId) {
  workbox.precaching.precacheAndRoute([{url: '/offline', revision: buildId}]);

  const offlineScripts = urlSearchParams.get('offlineScripts');
  if (offlineScripts) {
    for (let offlineScript of offlineScripts.split(',')) {
      workbox.precaching.precacheAndRoute([
        {url: '/_next/' + offlineScript, revision: buildId},
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

function renderFile(src) {
  if (src.endsWith('.css')) {
    return '';
    return `<link rel="stylesheet" href="${src}" />`;
  }

  let attributes = `src="/_next/${src}" crossorigin="anonymous" async=""`;
  if (src.substr(-10, 10) === '.module.js') {
    attributes = `${attributes} type="module"`;
  } else {
    attributes = `${attributes} nomodule=""`;
  }

  return `<script ${attributes} ></script>`;
}

function renderFiles(scriptsSrc) {
  return scriptsSrc.map(renderFile).join(' ');
}

async function populateHtmlCache(event) {
  const parsedNextData = JSON.parse(event.data.nextData);


  let pageData = {
    ...parsedNextData,
    page: event.data.page,
    query: event.data.query,
    props: {
      pageProps: {
        ...event.data.pageProps,
        isOfflinePage: true,
      },
    },
  };

  const cache = await caches.open('html-cache');

  let {chunkFiles, baseFiles} = event.data;

  baseFiles = JSON.parse(nextBaseScripts);

  const request = new Request(event.data.url);
  const response = new Response(
    `<!DOCTYPE html> 
        <html>
        <head>
        <meta name="next-head-count" content="0"/>       
                ${renderFiles(baseFiles.base)}
        ${renderFiles(baseFiles.lowPriority)} 
</head>
        <body>
        <div id="__next" ></div>
        <script id="__NEXT_DATA__" type="application/json" crossorigin="anonymous">
            ${JSON.stringify(pageData)}
        </script>
        ${renderFiles(chunkFiles)}

        </body>
        </html>`,
    {
      status: 200,
      headers: new Headers({
        'Content-Type': 'text/html; charset=utf-8',
        type: 'basic',
      }),
    }
  );

  await cache.put(request, response);
}

addEventListener('message', async event => {
  if (event.data.type === 'POPULATE_HTML_CACHE') {
    populateHtmlCache(event);
    return;
  }
})