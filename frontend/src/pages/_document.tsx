import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0a0a0f" />
        <meta
          name="description"
          content="Q.I.A — QIE Intelligent Agent. Competitive P2E shooter with native QIE wagering."
        />
      </Head>
      <body className="bg-qia-bg text-qia-text-primary">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
