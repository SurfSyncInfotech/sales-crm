import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const GREEN = 0x16b26c, BLUE = 0x1b63e8;

/* dark studio with strip lights: gives the acrylic its chrome-like rims */
function studioEnv(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0b0f18);
  const strip = (w, h, pos, color, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  strip(10, 1.4, [0, 6, 3], 0xffffff, 7);
  strip(1.6, 9, [-7, 0, 2], 0xffffff, 4);
  strip(1.2, 9, [7, 1, -1], 0xffffff, 3);
  strip(9, 2, [0, -5, 5], 0xbff5d9, 1.6);
  strip(6, 4, [2, 2, -8], 0xc8d8ff, 2);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return tex;
}

const glassMat = (tint, side = THREE.FrontSide) =>
  new THREE.MeshPhysicalMaterial({
    color: tint, roughness: 0.04, metalness: 0.15, transparent: true, opacity: side === THREE.BackSide ? 0.28 : 0.42,
    depthWrite: false, side, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.8, iridescenceIOR: 1.35,
    iridescenceThicknessRange: [160, 640], envMapIntensity: 2.4,
  });
const glassMesh = (geo, tint) => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(geo, glassMat(tint, THREE.BackSide));
  const f = new THREE.Mesh(geo, glassMat(tint));
  b.renderOrder = 1;
  f.renderOrder = 2;
  g.add(b, f);
  return g;
};
const solid = (c, rough = 0.3) => new THREE.MeshPhysicalMaterial({ color: c, roughness: rough, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.1 });
const ext = (shape, depth, bevel = 0.14) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 32 });
  g.center();
  return g;
};
function bubbleShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + 0.55, y); s.lineTo(x + 0.15, y - 0.55); s.lineTo(x + 0.95, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const poly = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach((p) => s.lineTo(...p)); s.closePath(); return s; };

const builders = {
  funnel(g) {
    g.add(glassMesh(ext(poly([[-1.15, 0.95], [1.15, 0.95], [0.3, -0.15], [0.3, -1.05], [-0.3, -0.8], [-0.3, -0.15]]), 0.55), 0xd8ffe9));
    g.add(new THREE.Mesh(ext(poly([[-0.7, 0.6], [0.7, 0.6], [0.12, -0.1], [0.12, -0.75], [-0.12, -0.62], [-0.12, -0.1]]), 0.12, 0.05), solid(GREEN)));
    [[-0.55, 1.3, BLUE, 0.2], [0.05, 1.6, GREEN, 0.24], [0.6, 1.25, 0xf08a00, 0.18]].forEach(([x, y, c, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), solid(c, 0.15));
      m.position.set(x, y, 0.1);
      g.add(m);
    });
    g.position.y = -0.2;
  },
  bubble(g) {
    const back = new THREE.Mesh(ext(bubbleShape(1.7, 1.2, 0.45), 0.14, 0.05), solid(BLUE, 0.25));
    back.position.set(-0.45, -0.38, -0.5);
    g.add(back);
    g.add(glassMesh(ext(bubbleShape(2.3, 1.7, 0.55), 0.5), 0xdff7ec));
    [-0.55, 0, 0.55].forEach((x, i) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 32), solid(i === 2 ? BLUE : GREEN, 0.15));
      m.position.set(x, 0.05, 0);
      g.add(m);
    });
    [0.35, 0.6].forEach((r) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 16, 64, Math.PI / 2), solid(GREEN, 0.2));
      t.position.set(1.05, 0.85, 0);
      g.add(t);
    });
  },
  calendar(g, font) {
    g.add(glassMesh(new RoundedBoxGeometry(2.1, 2.1, 0.6, 8, 0.28), 0xe4ecff));
    const head = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.55, 0.62, 8, 0.2), solid(GREEN, 0.2));
    head.position.y = 0.78;
    g.add(head);
    [-0.5, 0.5].forEach((x) => {
      const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.4, 8, 16), new THREE.MeshPhysicalMaterial({ color: 0xdfe5ee, metalness: 1, roughness: 0.15 }));
      r.position.set(x, 1.12, 0);
      g.add(r);
    });
    if (font) {
      const tg = new TextGeometry("22", { font, size: 0.85, depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 4, curveSegments: 12 });
      tg.center();
      const t = new THREE.Mesh(tg, solid(BLUE, 0.2));
      t.position.set(0, -0.2, 0.02);
      g.add(t);
    }
  },
};

let fontPromise;
const loadFont = () =>
  (fontPromise ??= new Promise((res) =>
    new FontLoader().load("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/fonts/helvetiker_bold.typeface.json", res, undefined, () => res(null))
  ));
const tilt = { funnel: [0.35, -0.5], bubble: [0.25, 0.55], calendar: [0.3, -0.6] };

export default function Glass({ icon, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    let raf, visible = false, disposed = false;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.environment = studioEnv(renderer);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    cam.position.set(0, 0.2, 8.4);
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(3, 5, 4);
    scene.add(light);
    const group = new THREE.Group();
    scene.add(group);
    const [rx, ry] = tilt[icon];
    group.rotation.set(rx * 0.5, ry, 0);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const size = () => { const w = canvas.clientWidth; renderer.setSize(w, w, false); };
    const draw = (t = 0) => { if (!still) group.rotation.y = ry + Math.sin(t / 1600) * 0.18; renderer.render(scene, cam); };
    const loop = (t) => { draw(t); if (visible && !still) raf = requestAnimationFrame(loop); };

    (icon === "calendar" ? loadFont() : Promise.resolve(null)).then((font) => {
      if (disposed) return;
      builders[icon](group, font);
      size();
      draw();
    });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(canvas);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
    };
  }, [icon]);

  return <canvas ref={ref} className={`glass ${className}`} aria-hidden="true" />;
}
