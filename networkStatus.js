import {useEffect, useLayoutEffect, useState} from "react";
import {useRouter} from "next/router";
import {Workbox} from "workbox-window";

const defaultNetworkStatus = {
  hasUsedOfflinePageForCurrentRoute: false,
};

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

export function useSaveOfflinePage(pageProps) {
  const router = useRouter();

  useLayoutEffect(() => {
    const script = document.getElementById('__NEXT_DATA__');
    const baseFiles = document.getElementById('__NEXT_BASE_FILES__');

    const sendPageProps = url => {
      // dont try to send message if Workbox is not initialized
      if (!workbox) {
        return;
      }

      // send message to worker with page informations
      workbox.messageSW({
        type: 'POPULATE_HTML_CACHE',
        url,
        pageProps: pageProps,
        page: router.route,
        query: router.query,
        nextData: script?.innerText,
        baseFiles: baseFiles?.innerText,
        chunkFiles: window.__BUILD_MANIFEST?.[router.route],
      });
    };

    // https://nextjs.org/docs/api-reference/next/router#routerevents
    router.events.on('routeChangeComplete', sendPageProps);

    return () => {
      router.events.off('routeChangeComplete', sendPageProps);
    };
  }, [pageProps, router.route, router.query, router.events]);
}

export function useNetworkStatus(isOfflinePage = false) {
  const router = useRouter();

  // initialize networkStatus
  const [networkStatus, setNetworkStatus] = useState(() => {
    return {
      ...defaultNetworkStatus,
      hasUsedOfflinePageForCurrentRoute: isOfflinePage,
    };
  });

  // listen to "CACHED_RESPONSE_HAS_BEEN_USED" message from service worker
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      return;
    }


    const messageListener = event => {
      if (event.data.type !== 'CACHED_RESPONSE_HAS_BEEN_USED') {
        return;
      }

      setNetworkStatus(state => ({
        ...state,
        hasUsedOfflinePageForCurrentRoute: true,
        isOnline: false,
      }));

      if (event.data.messageId && workbox) {
        workbox.messageSW({
          type: 'ACK_CACHED_RESPONSE_HAS_BEEN_USED',
          messageId: event.data.messageId,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', messageListener);

    return () => {
      if (!('serviceWorker' in navigator)) {
        return;
      }
      navigator.serviceWorker.removeEventListener('message', messageListener);
    };
  });

  // reset cached response used flag when changing route
  useEffect(() => {
    const resetHasUsedOffline = () => {
      if (networkStatus.hasUsedOfflinePageForCurrentRoute) {
        setNetworkStatus(state => ({
          ...state,
          hasUsedOfflinePageForCurrentRoute: false,
        }));
      }
    };

    router.events.on('routeChangeStart', resetHasUsedOffline);

    return () => {
      router.events.off('routeChangeStart', resetHasUsedOffline);
    };
  }, [router, networkStatus, setNetworkStatus]);

  return networkStatus;
}

