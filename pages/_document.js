import Document, {Head, Html, Main, NextScript} from 'next/document'

export default class CustomDocument extends Document {
  render() {
    return (
      <Html>
        <Head/>
        <body>
        <Main/>
        <NextScript/>
        <script
          type="application/json"
          id="__NEXT_BASE_FILES__"
          crossOrigin="anonymous"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              lowPriority: this.props.buildManifest?.lowPriorityFiles,
              base: this.props.buildManifest.pages?.['/_app'],
            })
          }}
        />
        </body>
      </Html>
    )
  }
}