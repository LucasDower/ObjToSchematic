precision mediump float;

varying vec4 v_colour;
varying vec4 v_occlusion;
varying vec2 v_texcoord;


void main() {
  float u = v_texcoord.x;
  float v = v_texcoord.y;

  float a = v_occlusion.x;
  float b = v_occlusion.y;
  float c = v_occlusion.z;
  float d = v_occlusion.w;

  float g = v*(u*b + (1.0-u)*d) + (1.0-v)*(u*a + (1.0-u)*c);

  gl_FragColor = vec4(v_colour.xyz * g, 1.0);
  //gl_FragColor = vec4(v_colour.xyz, 1.0);
  //gl_FragColor = vec4(vec3(g), 1.0);
}
