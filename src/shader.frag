#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

float random(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
        mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec2 m = u_mouse / u_resolution.xy; 
    
    vec2 stAspect = st;
    stAspect.x *= u_resolution.x / u_resolution.y;
    vec2 pos = stAspect * 3.0;

    vec2 q = vec2(
        noise(pos + vec2(u_time * 0.25, u_time * 0.15)),
        noise(pos + vec2(-u_time * 0.20, u_time * 0.30) + vec2(5.2, 1.3))
    );
    float n = noise(pos + 2.5 * q + m * 0.5);

    vec3 color = mix(vec3(0.05, 0.45, 0.98), vec3(0.98, 0.15, 0.55), smoothstep(0.15, 0.55, n));
    color = mix(color, vec3(1.00, 0.88, 0.10), smoothstep(0.50, 0.85, n));
    color = mix(vec3(0.10, 0.90, 0.85), color, smoothstep(0.05, 0.25, n));

    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    float distCentro = min(1.0, length(m - 0.5) * 2.0);
    float velocidad = 1.0 + (1.0 - distCentro) * 2.5;
    float progresoGlobal = u_time * 0.25 * velocidad;

    for (int a = 0; a < 3; a++) {
        float t = fract(progresoGlobal + float(a) / 3.0);
        float radioOrbita = mix(0.85, 0.0, t);
        float escalaCirculo = (1.0 - t) * 0.09 * smoothstep(0.0, 0.08, t);
        float rotAnillo = t * 0.5;

        for (int i = 0; i < 12; i++) {
            float angulo = float(i) * 6.2831853 / 12.0 + rotAnillo;
            vec2 centroCirculo = vec2(cos(angulo), sin(angulo)) * radioOrbita;
            
            float d = length(uv - centroCirculo);
            if (d < escalaCirculo) {
                vec2 vPos = (uv - centroCirculo) / max(escalaCirculo, 0.0001);
                vec2 posC = vPos * 2.2;
                vec2 qC = vec2(
                    noise(posC + vec2(u_time * 0.4, -u_time * 0.3)),
                    noise(posC + vec2(-u_time * 0.3, u_time * 0.5) + vec2(3.1, 7.4))
                );
                float nC = noise(posC + 1.8 * qC);

                vec3 colC = mix(vec3(0.08, 0.85, 0.35), vec3(1.00, 0.42, 0.05), smoothstep(0.20, 0.60, nC));
                colC = mix(colC, vec3(1.00, 0.99, 0.96), smoothstep(0.58, 0.88, nC));

                color = mix(color, colC, smoothstep(escalaCirculo, escalaCirculo * 0.9, d));
            }
        }
    }

    gl_FragColor = vec4(color, 1.0);
}
