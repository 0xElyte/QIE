import type { AppProps } from "next/app";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { QIE_CHAIN_ID, THIRDWEB_CLIENT_ID } from "@/lib/constants";
import { Toaster } from "react-hot-toast";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider
      clientId={THIRDWEB_CLIENT_ID}
      activeChain={QIE_CHAIN_ID}
    >
      <div className="relative min-h-screen bg-qia-bg">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              color: "#e0e0e0",
              border: "1px solid #2a2a3e",
            },
            success: {
              iconTheme: { primary: "#00ff88", secondary: "#0a0a0f" },
            },
            error: {
              iconTheme: { primary: "#ff3366", secondary: "#0a0a0f" },
            },
          }}
        />
        <Component {...pageProps} />
      </div>
    </ThirdwebProvider>
  );
}
