# Práctica Semana 9 - IG

# Escena Interactiva con Shaders en Three.js

Este proyecto implementa una composición visual en **Three.js** utilizando `ShaderMaterial` personalizados, combinando un fondo fluido a pantalla completa con anillos concéntricos de círculos animados que reaccionan a la posición del ratón.

---

## Características implementadas en el código

### 1. Fondo Dinámico a Pantalla Completa (`crearFondo` y `fragmentShaderFondo`)

A la hora de crear el fondo, decidí hacer que cubra todo el espacio visible independientemente del zoom de la cámara. Para ello creé un plano de `2x2` y en el `vertexShaderFondo` asigné directamente `gl_Position = vec4(position.xy, 0.0, 1.0)`, ya que en WebGL las coordenadas normalizadas de pantalla van desde `-1.0` hasta `1.0` en ambos ejes. Además, se desactivó `depthWrite` para que el fondo se mantenga siempre por detrás de los círculos.

```javascript
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
```

Para el aspecto visual del fondo me inspiré en el ruido 2D (estilo Perlin), partiendo del código base proporcionado y aplicando una paleta de colores vivos (azul, rosa, amarillo y cian). Con el vector `vec2 q` creamos dos capas de ruido que se desplazan en direcciones opuestas usando `u_time`, sumando `vec2(5.2, 1.3)` para desfasar ambos ejes y evitar que el patrón sea simétrico. Finalmente, al sumar `2.5 * q` y la posición del ratón (`u_mouse * 0.5`) dentro de `n`, distorsionamos las coordenadas logrando una sensación de movimiento líquido.

```glsl
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
```

---

### 2. Bucle Infinito de Anillos de Círculos (`init` y `animationLoop`)

En la inicialización se generan 3 grupos (`NUM_ANILLOS = 3`) con 12 círculos cada uno (`CIRCULOS_POR_ANILLO = 12`). Dentro de `animationLoop`, se gestiona el movimiento continuo para que los anillos viajen desde el borde exterior hacia el centro de la pantalla en un bucle sin cortes.

Para controlar la velocidad de desplazamiento sin alterar la velocidad de la textura interna de los círculos, escalamos el tiempo mediante la línea:

```javascript
const progresoGlobal = uniformsCirculos.u_time.value * 0.12;
```

Sumando el desfase inicial de cada anillo (`anillo.offset`) y aplicando el operador módulo (`% 1.0`), obtenemos la variable `t` comprendida siempre entre `0.0` y `1.0`. Cuando `t = 0.0`, el anillo nace en el borde (`radioMaximo`) y va reduciendo el radio de su órbita mediante interpolación lineal (`lerp`) hasta que en `t = 1.0` llega a `0.0` y desaparece en el centro. Al mismo tiempo, `smoothstep` suaviza su aparición inicial y `escalaCirculo` reduce su tamaño progresivamente mientras el grupo gira ligeramente sobre el eje Z.

```javascript
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
```

---

### 3. Shader Texturizado para los Círculos (`vertexShaderCirculo` y `fragmentShaderCirculos`)

Para que cada círculo tuviera su propia textura fluida en su interior en lugar de depender de las coordenadas globales de la pantalla, utilizamos el `vertexShaderCirculo` para enviar la posición local de cada vértice (`vPos = position.xy`) al fragment shader.

Dentro de `fragmentShaderCirculos`, escalamos `vPos * 2.2` para ajustar el tamaño de las manchas dentro de cada círculo y aplicamos la misma técnica de distorsión fluida con `vec2 q` y el desfase `vec2(3.1, 7.4)`. Finalmente, mapeamos el valor del ruido `n` mediante `smoothstep` y `mix` para combinar una paleta de tres colores vivos que contrastan con el fondo: **verde**, **naranja** y **blanco**. Algo parecido al fondo.

```glsl
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
```

---

### 4. Interactividad con el Ratón y Controles (`onmousemove` y `OrbitControls`)

Para añadir interactividad a la escena, se programó el evento `document.onmousemove` con doble propósito: actualizar el uniform `u_mouse` que deforma ligeramente el fondo y calcular la distancia euclidiana (`Math.hypot`) desde la posición normalizada del cursor hasta el centro de la pantalla (`0.5, 0.5`). Este valor se almacena en `distanciaCentro` (donde `0.0` es el centro exacto y `1.0` son los bordes).

```javascript
document.onmousemove = function (e) {
  uniformsFondo.u_mouse.value.x = e.pageX / window.innerWidth;
  uniformsFondo.u_mouse.value.y = e.pageY / window.innerHeight;
  const dx = uniformsFondo.u_mouse.value.x - 0.5;
  const dy = uniformsFondo.u_mouse.value.y - 0.5;
  distanciaCentro = Math.min(1.0, Math.hypot(dx, dy) * 2.0);
};
```

Posteriormente, dentro de `animationLoop`, se utiliza `distanciaCentro` para calcular `multiplicadorVelocidad`, haciendo que el avance de los anillos hacia el centro se acelere cuanto más cerca esté el puntero del medio de la pantalla:

```javascript
const multiplicadorVelocidad = 7.5 + (1.0 - distanciaCentro) * 3.0;
uniformsCirculos.u_time.value += 0.03 * multiplicadorVelocidad;
```

Por último, la escena incorpora `OrbitControls` para poder rotar y hacer zoom libremente con el ratón, junto con el evento `onWindowResize` que recalcula la relación de aspecto de la cámara, el tamaño del renderizador y el uniform `u_resolution` al cambiar el tamaño de la ventana.

Resultado final


Fuentes consultadas:

Mapeo de valores escalares (0.0 a 1.0) a paletas de color mediante mix() y smoothstep():
https://thebookofshaders.com/06/

Técnica utilizada en fragmentShader_04 para que el ruido parezca tener un movimiento de fluido.
https://iquilezles.org/articles/warp/

Referencia para el paso de uniforms (u_time, u_resolution, u_mouse):
https://threejs.org/docs/#api/en/materials/ShaderMaterial
