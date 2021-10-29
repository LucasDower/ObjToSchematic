precision mediump float;

uniform sampler2D u_texture;
uniform float u_atlasSize;

varying float v_lighting;
varying vec4 v_occlusion;
varying vec2 v_texcoord;
varying vec2 v_blockTexcoord;


void main() {
  float u = v_texcoord.x;
  float v = v_texcoord.y;

  float a = v_occlusion.x;
  float b = v_occlusion.y;
  float c = v_occlusion.z;
  float d = v_occlusion.w;

  float g = v*(u*b + (1.0-u)*d) + (1.0-v)*(u*a + (1.0-u)*c);

  //vec3 diffuse = texture2D(u_texture, v_texcoord).rgb;
  //vec3 diffuse = v_colour;
  vec2 tex = v_blockTexcoord + (v_texcoord / (u_atlasSize * 3.0));
  vec3 diffuse = texture2D(u_texture, tex).rgb;
  //vec3 diffuse = vec3(1.0, 1.0, 1.0);
  gl_FragColor = vec4(diffuse * (v_lighting * g), 1.0);
  //gl_FragColor = vec4(vec3(v_lighting * g), 1.0);
  //gl_FragColor = vec4(v_colour.xyz * g, 1.0);
  //gl_FragColor = vec4(v_colour.xyz, 1.0);
  //gl_FragColor = vec4(vec3(g), 1.0);
}
