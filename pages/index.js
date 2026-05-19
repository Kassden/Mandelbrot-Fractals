import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamic import of THREE to avoid SSR issues
const ThreeScene = dynamic(() => import('../components/ThreeScene'), {
  ssr: false
});

export default function Home() {
  return (
    <div>
      <Head>
        <title>Three.js Mandelbrot</title>
        <meta
          name="description"
          content="Interactive Mandelbrot viewer built with Three.js shaders."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ThreeScene />
    </div>
  );
}
