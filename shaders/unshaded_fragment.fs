precision mediump float;

varying vec3 v_colour;
varying float v_distance;

void main() {


  float alpha = v_distance / 32.0;
  alpha = 1.0 - clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(v_colour, alpha);
}
