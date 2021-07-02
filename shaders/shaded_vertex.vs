uniform vec3 u_fillColour;
uniform float u_opacity;
uniform vec3 u_lightWorldPos;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

attribute vec4 position;
attribute vec3 normal;

varying vec4 v_colour;

void main() {
  vec4 a_position = u_worldViewProjection * vec4(position.xyz * 0.1, 1.0);
  
  vec3 v_normal = (u_worldInverseTranspose * vec4(normal, 0)).xyz;
  vec3 v_lightDir = normalize(u_lightWorldPos);

  float lighting = dot(v_normal, v_lightDir);
  
  v_colour = vec4(u_fillColour * lighting, u_opacity);

  gl_Position = a_position;
}
