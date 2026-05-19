import Head from 'next/head';
import ThreeScene from '../components/ThreeScene';

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
