import {useEffect, useState} from "react";
import {useRouter} from "next/router";

const defaultNetworkStatus = {
  hasUsedOfflinePageForCurrentRoute: false,
};

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

      navigator.serviceWorker.addEventListener('message', messageListener);

      return () => {
        if (!('serviceWorker' in navigator)) {
          return;
        }
        navigator.serviceWorker.removeEventListener('message', messageListener);
      };
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

