import '../styles/globals.css'
import {Workbox} from 'workbox-window';

// dont try to load service worker if code is executed server side
// load workbox only if browser can use service workers
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
    console.log({
      queryString
    });

    let workbox = new Workbox(`/service-worker.js?${queryString}`);
    workbox.register();
  });

}

function MyApp({Component, pageProps}) {
  return <Component {...pageProps} />
}

export default MyApp
