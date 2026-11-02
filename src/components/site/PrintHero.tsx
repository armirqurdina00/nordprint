"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const H = 3; // vase height in scene units
const LAYERS = 72;
const LAYER_H = H / LAYERS;
const PRINT_SECONDS = 11;
const COLS = 360;
const ROWS = LAYERS * 4;

/**
 * Their sculptural vase: narrow foot, full belly, slim neck with a small flare,
 * and fine flutes that spiral around the body. Every print layer leaves a faint ridge.
 */
const FLUTES = 30;
function profile(t: number) {
  // control points (height fraction, radius), smoothly interpolated
  const pts: [number, number][] = [
    [0, 0.62], [0.12, 0.86], [0.32, 1.02], [0.5, 0.92], [0.68, 0.62], [0.82, 0.44], [0.93, 0.43], [1, 0.5],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, r0] = pts[i];
    const [t1, r1] = pts[i + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      const s = u * u * (3 - 2 * u);
      return r0 + (r1 - r0) * s;
    }
  }
  return pts[pts.length - 1][1];
}

function radiusAt(theta: number, y: number) {
  const t = y / H;
  const twist = t * 2.4;
  const flute = Math.pow(Math.abs(Math.cos((FLUTES / 2) * (theta - twist))), 0.6);
  const ridge = 1 + 0.004 * Math.cos((2 * Math.PI * y) / LAYER_H);
  return 1.25 * profile(t) * (0.955 + 0.045 * flute) * ridge;
}

function buildVase() {
  const wall = 0.05;
  const positions: number[] = [];
  const indices: number[] = [];
  const surface = (inset: number, flip: boolean) => {
    const start = positions.length / 3;
    for (let r = 0; r <= ROWS; r++) {
      const y = (r / ROWS) * H;
      for (let c = 0; c <= COLS; c++) {
        const th = (c / COLS) * Math.PI * 2;
        const rad = radiusAt(th, y) - inset;
        positions.push(Math.cos(th) * rad, y, Math.sin(th) * rad);
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = start + r * (COLS + 1) + c;
        const b = a + COLS + 1;
        if (flip) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  };
  surface(0, false);
  surface(wall, true);
  // solid bottom
  const center = positions.length / 3;
  positions.push(0, 0, 0);
  for (let c = 0; c < COLS; c++) indices.push(center, c, c + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function gridTexture() {
  const size = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#26363c";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.09)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += size / 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export default function PrintHero({ lang = "sv" }: { lang?: Lang }) {
  const d = t(lang).home;
  const mount = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const lookAt = new THREE.Vector3(0, 1.25, 0);

    scene.add(new THREE.HemisphereLight("#f4f8fa", "#4f6873", 1.6));
    const key = new THREE.DirectionalLight("#ffffff", 2.4);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3; key.shadow.camera.right = 3;
    key.shadow.camera.top = 3; key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0005;
    scene.add(key);
    const rim = new THREE.DirectionalLight("#bfd9e6", 1.2);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const turntable = new THREE.Group();
    scene.add(turntable);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.14, 4.4),
      new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: 0.85 })
    );
    plate.position.y = -0.07;
    plate.receiveShadow = true;
    turntable.add(plate);

    const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const vaseGeo = buildVase();
    const vaseMat = new THREE.MeshStandardMaterial({
      color: "#d8285a",
      roughness: 0.48,
      metalness: 0.02,
      clippingPlanes: [clip],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
    const vase = new THREE.Mesh(vaseGeo, vaseMat);
    vase.castShadow = true;
    turntable.add(vase);

    // freshly deposited layer, drawn as a hot line around the outer wall
    const ringPts = new Float32Array((COLS + 1) * 3);
    const ringGeo = new THREE.BufferGeometry();
    ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPts, 3));
    const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: "#ffd2de" }));
    turntable.add(ring);

    // print head
    const metal = new THREE.MeshStandardMaterial({ color: "#c9d2d6", metalness: 0.7, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: "#1e2b30", roughness: 0.6 });
    const head = new THREE.Group();
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 20), metal);
    nozzle.rotation.x = Math.PI;
    nozzle.position.y = 0.08;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.28), metal);
    block.position.y = 0.26;
    const fan = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.36), dark);
    fan.position.y = 0.6;
    const tip = new THREE.PointLight("#ff8fae", 0.8, 0.9);
    head.add(nozzle, block, fan, tip);
    head.traverse((o) => (o.castShadow = true));
    scene.add(head);
    const gantry = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 7, 12), metal);
    gantry.rotation.z = Math.PI / 2;
    scene.add(gantry);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      const dist = w / h < 0.9 ? 13.5 : 11.8;
      camera.position.set(0, 3.6, dist);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);

    let last = performance.now();
    let elapsed = reduced ? PRINT_SECONDS : 0;
    let lastLayer = -1;
    let raf = 0;
    const camTarget = new THREE.Vector3();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;
      elapsed += dt;
      const progress = Math.min(elapsed / PRINT_SECONDS, 1);
      const printing = progress < 1;
      const h = progress * H;
      clip.constant = printing ? h : H + 1;

      const current = Math.min(LAYERS, Math.ceil(progress * LAYERS));
      if (current !== lastLayer) {
        lastLayer = current;
        setLayer(current);
      }

      const angle = elapsed * 9;
      if (printing) {
        for (let c = 0; c <= COLS; c++) {
          const th = (c / COLS) * Math.PI * 2;
          const r = radiusAt(th, h) + 0.004;
          ringPts.set([Math.cos(th) * r, h, Math.sin(th) * r], c * 3);
        }
        ringGeo.attributes.position.needsUpdate = true;
        const r = radiusAt(angle, h);

        head.position.set(Math.cos(angle) * r, h + 0.01, Math.sin(angle) * r);
      } else {
        ring.visible = false;
        // park the head up and to the side, then slowly turn the finished piece
        head.position.lerp(new THREE.Vector3(2.6, H + 2.2, -0.6), reduced ? 1 : 0.04);
        if (!reduced) turntable.rotation.y += dt * 0.25;
      }
      tip.intensity = printing ? 0.8 : 0;
      gantry.position.set(0, head.position.y + 0.6, head.position.z);

      camTarget.set(pointer.x * 0.6, 3.6 - pointer.y * 0.4, camera.position.z);
      if (!reduced) camera.position.lerp(camTarget, 0.04);
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const done = layer >= LAYERS;

  return (
    <div className="relative h-full w-full">
      <div ref={mount} className="absolute inset-0 [&>canvas]:h-full [&>canvas]:w-full" />
      {!failed && (
        <p
          className="absolute bottom-4 left-4 rounded-full bg-paper/85 px-3.5 py-1.5 text-sm font-medium tabular-nums text-granite backdrop-blur"
          aria-live="off"
        >
          {done ? d.printed(LAYERS) : d.printing(layer, LAYERS)}
        </p>
      )}
    </div>
  );
}
