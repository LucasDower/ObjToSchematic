precision mediump float;

uniform vec3 u_fillColour;

void main() {
  gl_FragColor = vec4(u_fillColour, 1.0);
}
