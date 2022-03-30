importScripts('/workbox/workbox-sw.js');

workbox.setConfig({debug: true});
workbox.setConfig({modulePathPrefix: '/workbox'});

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function getClientFromClientId(clientId) {
  const client = await self.clients.get(clientId);

  if (client) {
    return client;
  }
  // TODO: improve

  // wait for window to be available
  await timeout(1000);

  return await self.clients.get(clientId);
}

async function notifyCacheUsed(event) {
  const clientId =
    event.resultingClientId !== '' ? event.resultingClientId : event.clientId;

  const client = await getClientFromClientId(clientId);

  if (!client) {
    return;
  }

  let messageReceived = false;
  const MAX_RETRY = 3;
  const messageId = Math.random()
    .toString(36)
    .substr(2, 9);

  const ackMessageListener = async event => {
    if (event.data.type !== 'ACK_CACHED_RESPONSE_HAS_BEEN_USED') {
      return;
    }

    if (event.data.messageId !== messageId) {
      return;
    }

    messageReceived = true;
  };

  addEventListener('message', ackMessageListener);

  console.log('SEND CACHED_RESPONSE_HAS_BEEN_USED');

  for (let i = 0; i < MAX_RETRY; i++) {
    client.postMessage({
      type: 'CACHED_RESPONSE_HAS_BEEN_USED',
      messageId,
    });

    await timeout(i * 1000 + 500);
    if (messageReceived) {
      break;
    }
  }

  removeEventListener('message', ackMessageListener);
}

const broadcastCachedResponseUsedPlugins = {
  cachedResponseWillBeUsed: async data => {
    data.state.cacheUsed = true;

    return data.cachedResponse;
  },
  handlerDidComplete: async data => {
    if (!data.state.cacheUsed) {
      return;
    }

    await notifyCacheUsed(data.event);
  },
};

workbox.routing.registerRoute(
  data => {
    return data.url.pathname.startsWith('/_next/data/');
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'page-data-cache',
    plugins: [
      broadcastCachedResponseUsedPlugins,
    ]
  })
)

workbox.routing.registerRoute(
  data => {
    return (
      data.request.destination === 'document'
    );
  },
  new workbox.strategies.NetworkFirst({
    cacheName: 'html-cache',
    plugins: [
      broadcastCachedResponseUsedPlugins,
    ]
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

    if (data.url.pathname.substr(0, 14) !== '/_next/static/') {
      return false;
    }

    return (
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
  console.log('I AM THE CATCH HANDLER !');

  switch (event.request.destination) {
    case 'document':
      return workbox.precaching.matchPrecache('/offline');
  }
});

function renderFile(src) {
  if (src.endsWith('.css')) {
    return `<link rel="stylesheet" href="/_next/${src}" />`;
  }

  let attributes = `src="/_next/${src}" defer=""`;

  return `<script ${attributes}  ></script>`;
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

  baseFiles = JSON.parse(baseFiles);

  const request = new Request(event.data.url);
  const response = new Response(
    `<!DOCTYPE html>
        <html>
        <head>
     <meta name="next-head-count" content="0">
        ${renderFiles(baseFiles.base)}
        ${renderFiles(chunkFiles)}
        ${renderFiles(baseFiles.lowPriority)}

</head>
        <body>
        <div id="__next" data-reactroot=""></div>
        <script id="__NEXT_DATA__" type="application/json" crossorigin="anonymous">
            ${JSON.stringify(pageData)}
        </script>

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