import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;

  uniform float time;
  uniform float zoom;
  uniform vec2 center;
  uniform float iterations;
  uniform float colorOffset;
  uniform vec2 resolution;

  vec3 palette(float t) {
    vec3 a = vec3(0.12, 0.08, 0.18);
    vec3 b = vec3(0.55, 0.45, 0.35);
    vec3 c = vec3(1.0, 0.9, 0.7);
    vec3 d = vec3(0.0, 0.15, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= resolution.x / resolution.y;

    vec2 c = center + uv / zoom;
    vec2 z = vec2(0.0);
    float escapedAt = iterations;

    for (int i = 0; i < 400; i++) {
      if (float(i) >= iterations) {
        break;
      }

      z = vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
      );

      if (dot(z, z) > 4.0) {
        float smooth = float(i) + 1.0 - log2(log2(dot(z, z)));
        escapedAt = smooth;
        break;
      }
    }

    if (escapedAt >= iterations) {
      gl_FragColor = vec4(0.02, 0.02, 0.03, 1.0);
      return;
    }

    float t = escapedAt / iterations;
    vec3 color = palette(t + colorOffset + time * 0.03);
    color *= 0.85 + 0.15 * sin(6.28318 * (t + time * 0.04));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const initialView = {
  zoom: 0.9,
  centerX: -0.5,
  centerY: 0.0
};

export default function ThreeScene() {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const materialRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(0);
  const dragRef = useRef({
    active: false,
    x: 0,
    y: 0
  });
  const viewRef = useRef({
    zoom: initialView.zoom,
    centerX: initialView.centerX,
    centerY: initialView.centerY
  });

  const [controls, setControls] = useState({
    iterations: 180,
    colorOffset: 0.0
  });
  const [view, setView] = useState(viewRef.current);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        zoom: { value: viewRef.current.zoom },
        center: { value: new THREE.Vector2(viewRef.current.centerX, viewRef.current.centerY) },
        iterations: { value: controls.iterations },
        colorOffset: { value: controls.colorOffset },
        resolution: { value: new THREE.Vector2(1, 1) }
      }
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const syncSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setSize(width, height);
      material.uniforms.resolution.value.set(width, height);
    };

    const onPointerDown = (event) => {
      dragRef.current.active = true;
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
    };

    const onPointerUp = () => {
      dragRef.current.active = false;
    };

    const onPointerMove = (event) => {
      if (!dragRef.current.active) {
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      const scale = 2 / viewRef.current.zoom;

      viewRef.current = {
        ...viewRef.current,
        centerX: viewRef.current.centerX - (dx / width) * scale * (width / height),
        centerY: viewRef.current.centerY + (dy / height) * scale
      };

      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
      setView({ ...viewRef.current });
    };

    const onWheel = (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.9 : 1.1;
      viewRef.current = {
        ...viewRef.current,
        zoom: Math.min(2000000, Math.max(0.6, viewRef.current.zoom * factor))
      };
      setView({ ...viewRef.current });
    };

    startTimeRef.current = performance.now();
    syncSize();

    const render = () => {
      animationRef.current = requestAnimationFrame(render);

      material.uniforms.time.value = (performance.now() - startTimeRef.current) / 1000;
      material.uniforms.zoom.value = viewRef.current.zoom;
      material.uniforms.center.value.set(viewRef.current.centerX, viewRef.current.centerY);
      material.uniforms.iterations.value = controls.iterations;
      material.uniforms.colorOffset.value = controls.colorOffset;

      renderer.render(scene, camera);
    };

    render();

    window.addEventListener('resize', syncSize);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerleave', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', syncSize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerleave', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(animationRef.current);
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [controls]);

  const resetView = () => {
    viewRef.current = {
      zoom: initialView.zoom,
      centerX: initialView.centerX,
      centerY: initialView.centerY
    };
    setView({ ...viewRef.current });
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#05050a',
          backgroundImage:
            "radial-gradient(circle at top, rgba(54, 24, 86, 0.45), rgba(5, 5, 10, 1) 60%), url('/mandelbrot-fallback.svg')",
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover'
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          width: 320,
          padding: 20,
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 18,
          background: 'rgba(10, 10, 16, 0.72)',
          color: '#f6f2ff',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)'
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.68 }}>
          Three.js Mandelbrot
        </div>
        <h1 style={{ margin: '8px 0 6px', fontSize: 28, lineHeight: 1.1 }}>Pure shader view</h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
          Drag to pan. Scroll to zoom.
        </p>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
          Iterations: {controls.iterations}
        </label>
        <input
          type="range"
          min="60"
          max="400"
          step="1"
          value={controls.iterations}
          onChange={(event) => {
            setControls((current) => ({
              ...current,
              iterations: Number(event.target.value)
            }));
          }}
          style={{ width: '100%', marginBottom: 18 }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
          Palette offset: {controls.colorOffset.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={controls.colorOffset}
          onChange={(event) => {
            setControls((current) => ({
              ...current,
              colorOffset: Number(event.target.value)
            }));
          }}
          style={{ width: '100%', marginBottom: 18 }}
        />

        <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>
          <div>Zoom: {view.zoom.toFixed(view.zoom >= 10 ? 1 : 3)}x</div>
          <div>Center X: {view.centerX.toFixed(6)}</div>
          <div>Center Y: {view.centerY.toFixed(6)}</div>
        </div>

        <button
          type="button"
          onClick={resetView}
          style={{
            marginTop: 18,
            width: '100%',
            border: 0,
            borderRadius: 12,
            padding: '12px 14px',
            background: '#f6f2ff',
            color: '#120b1d',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reset view
        </button>
      </div>
    </>
  );
}
