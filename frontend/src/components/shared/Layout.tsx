import Head from "next/head";
import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title = "Q.I.A" }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title} | Q.I.A — QIE Intelligent Agent</title>
      </Head>
      <Navbar />
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </>
  );
}
