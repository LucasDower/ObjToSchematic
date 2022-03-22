precision mediump float;

uniform sampler2D u_texture;

varying float v_lighting;
varying vec2 v_texcoord;

void main() {
  vec2 tex = vec2(v_texcoord.x, 1.0 - v_texcoord.y);
  vec3 diffuse = texture2D(u_texture, tex).rgb;

  gl_FragColor = vec4(diffuse * v_lighting, 1.0);
}
