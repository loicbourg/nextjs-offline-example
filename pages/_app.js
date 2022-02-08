import '../styles/globals.css'
import {Workbox} from 'workbox-window';
import {useEffect, useLayoutEffect} from "react";
import {useRouter} from "next/router";
import {useNetworkStatus} from "../networkStatus";

// dont try to load service worker if code is executed server side
// load workbox only if browser can use service workers
let workbox = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    let queryString = `buildId=${window.__NEXT_DATA__.buildId}`;

    if (
      typeof window.__BUILD_MANIFEST !== 'undefined' &&
      typeof window.__BUILD_MANIFEST['/offline'] !== 'undefined'
    ) {
      queryString = `${queryString}&offlineScripts=${window.__BUILD_MANIFEST[
        '/offline'
        ].join(',')}`;
    }

    workbox = new Workbox(`/service-worker.js?${queryString}`);
    workbox.register();
  });

}

function MyApp({Component, pageProps}) {
  const router = useRouter();

  const networkStatus = useNetworkStatus(pageProps.isOfflinePage);

  console.log({networkStatus, pageProps});

  useLayoutEffect(() => {
    const sendPageProps = url => {
      // dont try to send message if Workbox is not initialized
      if (!workbox) {
        return;
      }

      const script = document.getElementById('__NEXT_DATA__');
      const baseFiles = document.getElementById('__NEXT_BASE_FILES__');

      console.log("SEND POPULATE HTML CACHE", url, router.route, pageProps);

      // send message to worker with page informations
      workbox.messageSW({
        type: 'POPULATE_HTML_CACHE',
        url,
        pageProps: pageProps,
        page: router.route,
        query: router.query,
        nextData: script.innerText,
        baseFiles: baseFiles.innerText,
        chunkFiles: window.__BUILD_MANIFEST?.[router.route],
      });
    };

    // https://nextjs.org/docs/api-reference/next/router#routerevents
    router.events.on('routeChangeComplete', sendPageProps);

    return () => {
      router.events.off('routeChangeComplete', sendPageProps);
    };
  }, [pageProps, router.route, router.query]);

  console.log("render current route", router.route);

  return <Component {...pageProps} />
}

export default MyApp
