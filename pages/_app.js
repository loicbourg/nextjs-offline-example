import '../styles/globals.css'
import { Workbox } from 'workbox-window';

// dont try to load service worker if code is executed server side
// load workbox only if browser can use service workers
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let workbox = new Workbox(`/service-worker.js`);
  workbox.register();
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
