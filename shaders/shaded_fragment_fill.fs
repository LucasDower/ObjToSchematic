precision mediump float;

uniform vec3 u_fillColour;

varying float v_lighting;

void main() {
  gl_FragColor = vec4(u_fillColour * v_lighting, 1.0);
}
