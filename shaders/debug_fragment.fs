precision mediump float;

varying vec3 v_colour;

void main() {
  gl_FragColor = vec4(v_colour, 1.0);
}
