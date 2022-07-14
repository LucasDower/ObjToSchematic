precision mediump float;

uniform vec4 u_fillColour;

varying float v_lighting;

void main() {
  gl_FragColor = vec4(u_fillColour.rgb * v_lighting, u_fillColour.a);
}
