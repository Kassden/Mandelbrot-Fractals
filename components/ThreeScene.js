import { useEffect, useRef, useState } from 'react';

const initialView = {
  zoom: 0.95,
  centerX: -0.7,
  centerY: 0.0
};

function paletteColor(t, offset) {
  const x = t + offset;
  const r = Math.round(40 + 215 * (0.5 + 0.5 * Math.cos(6.28318 * (x + 0.0))));
  const g = Math.round(20 + 160 * (0.5 + 0.5 * Math.cos(6.28318 * (x + 0.18))));
  const b = Math.round(60 + 195 * (0.5 + 0.5 * Math.cos(6.28318 * (x + 0.34))));
  return [r, g, b];
}

export default function ThreeScene() {
  const canvasRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, y: 0 });
  const viewRef = useRef({ ...initialView });
  const renderTokenRef = useRef(0);

  const [controls, setControls] = useState({
    iterations: 180,
    colorOffset: 0
  });
  const [view, setView] = useState({ ...initialView });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      return;
    }

    const syncCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      renderMandelbrot();
    };

    const renderMandelbrot = () => {
      const token = ++renderTokenRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const aspect = width / height;
      const image = context.createImageData(width, height);
      let y = 0;

      const drawChunk = () => {
        if (token !== renderTokenRef.current) {
          return;
        }

        const maxY = Math.min(height, y + 24);
        for (; y < maxY; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const scaledX = ((x / width) - 0.5) * 3.2 / viewRef.current.zoom * aspect + viewRef.current.centerX;
            const scaledY = ((y / height) - 0.5) * 3.2 / viewRef.current.zoom + viewRef.current.centerY;

            let zx = 0;
            let zy = 0;
            let iteration = 0;

            while (zx * zx + zy * zy <= 4 && iteration < controls.iterations) {
              const nextX = zx * zx - zy * zy + scaledX;
              zy = 2 * zx * zy + scaledY;
              zx = nextX;
              iteration += 1;
            }

            const index = (y * width + x) * 4;
            if (iteration === controls.iterations) {
              image.data[index] = 4;
              image.data[index + 1] = 4;
              image.data[index + 2] = 10;
              image.data[index + 3] = 255;
              continue;
            }

            const magnitude = Math.sqrt(zx * zx + zy * zy);
            const smooth = iteration + 1 - Math.log2(Math.log2(Math.max(magnitude, 2)));
            const normalized = smooth / controls.iterations;
            const [r, g, b] = paletteColor(normalized, controls.colorOffset);

            image.data[index] = r;
            image.data[index + 1] = g;
            image.data[index + 2] = b;
            image.data[index + 3] = 255;
          }
        }

        context.putImageData(image, 0, 0);

        if (y < height) {
          requestAnimationFrame(drawChunk);
        }
      };

      drawChunk();
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
      const scale = 3.2 / viewRef.current.zoom;

      viewRef.current = {
        ...viewRef.current,
        centerX: viewRef.current.centerX - (dx / width) * scale * (width / height),
        centerY: viewRef.current.centerY + (dy / height) * scale
      };

      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
      setView({ ...viewRef.current });
      renderMandelbrot();
    };

    const onWheel = (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.88 : 1.14;
      viewRef.current = {
        ...viewRef.current,
        zoom: Math.min(2000000, Math.max(0.7, viewRef.current.zoom * factor))
      };
      setView({ ...viewRef.current });
      renderMandelbrot();
    };

    syncCanvas();
    window.addEventListener('resize', syncCanvas);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerleave', onPointerUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      renderTokenRef.current += 1;
      window.removeEventListener('resize', syncCanvas);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointerleave', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('wheel', onWheel);
    };
  }, [controls]);

  const resetView = () => {
    viewRef.current = { ...initialView };
    setView({ ...initialView });
    renderTokenRef.current += 1;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.dispatchEvent(new Event('refresh'));
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rerender = () => {
      const event = new Event('resize');
      window.dispatchEvent(event);
    };

    canvas.addEventListener('refresh', rerender);
    return () => canvas.removeEventListener('refresh', rerender);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          display: 'block',
          backgroundColor: '#04030a',
          backgroundImage:
            "radial-gradient(circle at top, rgba(54, 24, 86, 0.42), rgba(5, 5, 10, 1) 60%)"
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
          Mandelbrot Viewer
        </div>
        <h1 style={{ margin: '8px 0 6px', fontSize: 28, lineHeight: 1.1 }}>Interactive set</h1>
        <p style={{ margin: '0 0 18px', fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
          Drag to pan. Scroll to zoom.
        </p>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 8 }}>
          Iterations: {controls.iterations}
        </label>
        <input
          type="range"
          min="80"
          max="320"
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
