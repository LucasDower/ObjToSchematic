uniform mat4 u_worldViewProjection;
uniform vec3 u_lightWorldPos;
uniform mat4 u_world;
uniform mat4 u_viewInverse;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_translate;

attribute vec4 position;
attribute vec3 normal;

varying vec4 v_colour;

void main() {
  
  //vec4 a_position = u_worldViewProjection * position;
  vec4 a_position = u_worldViewProjection * vec4(position.xyz * 1.0, 1.0);
  //vec4 a_position = vec4();
  
  vec3 v_normal = (u_worldInverseTranspose * vec4(normal, 0)).xyz;
  vec3 v_lightDir = normalize(u_lightWorldPos);

  float lighting = dot(v_normal, v_lightDir);
  v_colour = vec4((0.25 * normal) + (0.75 * vec3(lighting)), 1.0);

  gl_Position = a_position;
}
