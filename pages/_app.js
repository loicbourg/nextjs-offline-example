import '../styles/globals.css'
import {useNetworkStatus, useSaveOfflinePage} from "../networkStatus";


export default function MyApp({Component, pageProps}) {
  const networkStatus = useNetworkStatus(pageProps.isOfflinePage);
  useSaveOfflinePage(pageProps)

  let component = <Component networkStatus {...pageProps} />;
  if (!networkStatus.hasUsedOfflinePageForCurrentRoute) {
    return component;
  }

  return <>
    <h2>Une réponse provenant du cache a été utilisée pour cette page</h2>
    {component}
  </>
}
