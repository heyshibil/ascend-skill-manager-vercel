import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// ─── Pure Fluid Shader — No Particles ────────────────────────────────────────
// Elegant blue fluid energy on a pure black canvas.
// Mouse interaction: subtle displacement.
// Scroll: drives opacity via React (canvas style).

const FLUID_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FLUID_FRAG = `
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform vec2  uResolution;
uniform vec2  uMouse;

// ── Simplex noise helpers ────────────────────────────────────
vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x  = 2.0 * fract(p * C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x   + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ── Fractional Brownian Motion — 4 octaves for elegance ─────
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  // Slow, large-scale motion — avoids the "foggy" look
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 1.9 + vec2(0.31, 0.17);
    a *= 0.48;
  }
  return v;
}

// ── Double-domain warp — creates the fluid-within-fluid look ─
vec2 warp(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t * 0.06),
                fbm(p + vec2(5.2, 1.3) + t * 0.05));
  return vec2(
    fbm(p + 2.8 * q + vec2(1.7, 9.2)),
    fbm(p + 2.8 * q + vec2(8.3, 2.8))
  );
}

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 uv  = vUv;
  vec2 p   = (uv - 0.5) * vec2(aspect, 1.0);

  // Subtle mouse displacement — intelligence-like cursor response
  vec2 mouse = (uMouse - 0.5) * vec2(aspect, 1.0);
  vec2 toMouse = p - mouse;
  float mouseDist = length(toMouse);
  vec2 mouseDisp = normalize(toMouse + 0.001) * 0.04 * exp(-mouseDist * 2.5);
  p += mouseDisp;

  // Scale: moderate — not too zoomed in (foggy) or out (thin)
  p *= 1.2;

  float t = uTime;
  vec2 w = warp(p, t);

  // Primary fluid noise
  float n = fbm(p + 2.2 * w);

  // ── Color palette ────────────────────────────────────────────
  // Pure black base with electric blue fluid energy
  // Colors inspired by: Linear's blue, electric data-flow aesthetic

  // Deep void base
  vec3 black    = vec3(0.0, 0.0, 0.0);

  // Electric blue — the "intelligent energy" color
  vec3 blue     = vec3(0.082, 0.647, 0.996); // #15A5FE-ish

  // Deep midnight for depth
  vec3 midnight = vec3(0.02, 0.06, 0.18);

  // Soft cyan highlight — appears at peaks of fluid motion
  vec3 cyan     = vec3(0.12, 0.78, 0.95);

  // Map noise to fluid layers
  // n is roughly in [-0.8, 0.8]
  float t1 = smoothstep(-0.6, 0.2, n);      // deep midnight layer
  float t2 = smoothstep(0.0,  0.55, n);     // blue energy layer
  float t3 = smoothstep(0.4,  0.72, n);     // cyan highlight peaks

  vec3 color = black;
  color = mix(color, midnight, t1 * 0.9);
  color = mix(color, blue,     t2 * 0.85);
  color = mix(color, cyan,     t3 * 0.6);

  // ── Vignette — keeps edges dark, centers the energy ─────────
  // Stronger at corners, softer at center
  float vignette = 1.0 - smoothstep(0.25, 1.1, length((uv - 0.5) * vec2(aspect / 1.2, 1.0)));
  color *= vignette;

  // ── Subtle film grain for texture (very faint) ───────────────
  float grain = (snoise(uv * 600.0 + t * 50.0) * 0.5 + 0.5) * 0.018;
  color += grain * (color * 2.0); // grain only visible where there's light

  // ── Alpha — black stays fully transparent, fluid has presence ─
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  float alpha = smoothstep(0.0, 0.08, luminance);
  // Cap alpha so the darkest sections remain fully transparent
  alpha = clamp(alpha, 0.0, 0.92);

  gl_FragColor = vec4(color, alpha);
}
`;

export default function FluidCanvas() {
  const containerRef = useRef(null);
  const rendererRef  = useRef(null);
  const materialRef  = useRef(null);
  const frameRef     = useRef(null);
  const mouseRef     = useRef({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef      = useRef(0);
  const isRenderingRef = useRef(true);
  const restartRenderLoopRef = useRef(null);

  // Handle high-performance scroll locally by directly mutating the DOM node
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

        // Fade out: 0->1 scroll maps to opacity 1->0, complete by 15% scroll
        const opacity = Math.max(0, 1 - progress * 7);

        container.style.opacity = opacity.toFixed(3);

        // Pause or resume rendering loop dynamically to free up GPU resources
        if (opacity <= 0) {
          isRenderingRef.current = false;
        } else {
          if (!isRenderingRef.current) {
            isRenderingRef.current = true;
            restartRenderLoopRef.current?.();
          }
        }

        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Initial call to set correct opacity on load
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    targetMouseRef.current.x = e.clientX / window.innerWidth;
    targetMouseRef.current.y = 1.0 - e.clientY / window.innerHeight;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── WebGL Renderer ──────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,              // Not needed for fullscreen shader
      powerPreference: 'high-performance',
    });
    // Cap pixel ratio to 1.2 for fullscreen simplex noise.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ── Orthographic camera for fullscreen quad ─────────────────
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene  = new THREE.Scene();

    // ── Fullscreen triangle (more efficient than quad) ──────────
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader:   FLUID_VERT,
      fragmentShader: FLUID_FRAG,
      uniforms: {
        uTime:       { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      depthWrite:  false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    materialRef.current = material;

    // ── Animation Loop ──────────────────────────────────────────
    let lastTime = performance.now();

    const animate = (now) => {
      if (!isRenderingRef.current) return; // Halt the WebGL render loop when scrolled off-screen

      frameRef.current = requestAnimationFrame(animate);

      const delta = Math.min((now - lastTime) * 0.001, 0.05); // cap at 50ms
      lastTime = now;
      timeRef.current += delta;

      // Lerp mouse for smooth, lag-free response
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.06;

      material.uniforms.uTime.value = timeRef.current;
      material.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

      renderer.render(scene, camera);
    };

    // Callback hook to resume rendering loop
    restartRenderLoopRef.current = () => {
      lastTime = performance.now(); // reset delta baseline to prevent animation jumps
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    // ── Listeners ───────────────────────────────────────────────
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h);
      material.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    // ── Cleanup ─────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="fluid-canvas-container"
      style={{ opacity: 1 }}
      aria-hidden="true"
    />
  );
}
