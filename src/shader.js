import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene, renderer, camera, camcontrols;
let uniformsFondo, uniformsCirculos;

const NUM_ANILLOS = 3;
const CIRCULOS_POR_ANILLO = 12;
let anillos = [];
let distanciaCentro = 1.0;

init();
animationLoop();

function init() {
  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 5);

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.domElement.style.display = "block";
  document.body.appendChild(renderer.domElement);

  uniformsFondo = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2() },
    u_mouse: { value: new THREE.Vector2() },
  };

  uniformsCirculos = {
    u_time: { value: 0.0 },
  };

  const dist = camera.position.z;
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFOV / 2) * dist;
  const width = height * camera.aspect;

  crearFondo(width, height);

  const materialCirculo = new THREE.ShaderMaterial({
    uniforms: uniformsCirculos,
    vertexShader: vertexShaderCirculo(),
    fragmentShader: fragmentShaderCirculos(),
  });

  const geometriaCirculo = new THREE.CircleGeometry(1, 32);

  for (let a = 0; a < NUM_ANILLOS; a++) {
    let grupoAnillo = new THREE.Group();
    grupoAnillo.position.z = 0.01 + a * 0.001;

    let circulosDelAnillo = [];

    for (let i = 0; i < CIRCULOS_POR_ANILLO; i++) {
      const angulo = (i / CIRCULOS_POR_ANILLO) * Math.PI * 2;
      const mesh = new THREE.Mesh(geometriaCirculo, materialCirculo);

      grupoAnillo.add(mesh);
      circulosDelAnillo.push({ mesh, angulo });
    }

    scene.add(grupoAnillo);

    anillos.push({
      grupo: grupoAnillo,
      circulos: circulosDelAnillo,
      offset: a / NUM_ANILLOS,
    });
  }

  camcontrols = new OrbitControls(camera, renderer.domElement);

  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);
}

function crearFondo() {
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms: uniformsFondo,
    fragmentShader: fragmentShaderFondo(),
    vertexShader: vertexShaderFondo(),
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  uniformsFondo.u_resolution.value.x = renderer.domElement.width;
  uniformsFondo.u_resolution.value.y = renderer.domElement.height;
}

document.onmousemove = function (e) {
  uniformsFondo.u_mouse.value.x = e.pageX / window.innerWidth;
  uniformsFondo.u_mouse.value.y = e.pageY / window.innerHeight;
  const dx = uniformsFondo.u_mouse.value.x - 0.5;
  const dy = uniformsFondo.u_mouse.value.y - 0.5;
  distanciaCentro = Math.min(1.0, Math.hypot(dx, dy) * 2.0);
};

function animationLoop() {
  requestAnimationFrame(animationLoop);

  uniformsFondo.u_time.value += 0.02;
  const multiplicadorVelocidad = 7.5 + (1.0 - distanciaCentro) * 3.0;
  uniformsCirculos.u_time.value += 0.03 * multiplicadorVelocidad;

  const progresoGlobal = uniformsCirculos.u_time.value * 0.12;

  const dist = camera.position.length();
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const altoVisible = 2 * Math.tan(vFOV / 2) * dist;
  const radioMaximo = (altoVisible * Math.max(1, camera.aspect)) * 0.62;

  for (let anillo of anillos) {
    const t = (progresoGlobal + anillo.offset) % 1.0;

    const radioOrbita = THREE.MathUtils.lerp(radioMaximo, 0.0, t);
    const aparicionSuave = THREE.MathUtils.smoothstep(t, 0.0, 0.08);
    const escalaCirculo = (1.0 - t) * 0.14 * aparicionSuave;

    anillo.grupo.rotation.z = t * 0.5;

    for (let item of anillo.circulos) {
      item.mesh.position.x = Math.cos(item.angulo) * radioOrbita;
      item.mesh.position.y = Math.sin(item.angulo) * radioOrbita;

      item.mesh.scale.set(escalaCirculo, escalaCirculo, 1);
    }
  }

  renderer.render(scene, camera);
}

function vertexShaderFondo() {
  return `
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;
}

function fragmentShaderFondo() {
  return `
    
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_mouse;

    float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = smoothstep(0.0, 1.0, f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      st.x *= u_resolution.x / u_resolution.y;
      vec2 pos = st * 3.0;

      vec2 q = vec2(
        noise(pos + vec2(u_time * 0.25, u_time * 0.15)),
        noise(pos + vec2(-u_time * 0.20, u_time * 0.30) + vec2(5.2, 1.3))
      );

      float n = noise(pos + 2.5 * q + u_mouse * 0.5);

      vec3 azul     = vec3(0.05, 0.45, 0.98);
      vec3 rosa     = vec3(0.98, 0.15, 0.55);
      vec3 amarillo = vec3(1.00, 0.88, 0.10);
      vec3 cian     = vec3(0.10, 0.90, 0.85);

      vec3 color = mix(azul, rosa, smoothstep(0.15, 0.55, n));
      color = mix(color, amarillo, smoothstep(0.50, 0.85, n));
      color = mix(cian, color, smoothstep(0.05, 0.25, n));

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}

function vertexShaderCirculo() {
  return `
    varying vec2 vPos;
    void main() {
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
}

function fragmentShaderCirculos() {
  return `
    
    varying vec2 vPos;
    uniform float u_time;

    float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = smoothstep(0.0, 1.0, f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 pos = vPos * 2.2;

      vec2 q = vec2(
        noise(pos + vec2(u_time * 0.4, -u_time * 0.3)),
        noise(pos + vec2(-u_time * 0.3, u_time * 0.5) + vec2(3.1, 7.4))
      );

      float n = noise(pos + 1.8 * q);

      vec3 verde   = vec3(0.08, 0.85, 0.35);
      vec3 naranja = vec3(1.00, 0.42, 0.05);
      vec3 blanco  = vec3(1.00, 0.99, 0.96);

      vec3 color = mix(verde, naranja, smoothstep(0.20, 0.60, n));
      color = mix(color, blanco, smoothstep(0.58, 0.88, n));

      gl_FragColor = vec4(color, 1.0);
    }
  `;
}
