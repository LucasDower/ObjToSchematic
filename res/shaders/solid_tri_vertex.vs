uniform vec3 u_lightWorldPos;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_fillColour;

attribute vec3 position;
attribute vec2 texcoord;
attribute vec3 normal;

varying float v_lighting;

void main() { 
  float lighting = abs(dot(normal, normalize(u_lightWorldPos)));
  lighting = (clamp(lighting, 0.0, 1.0) * 0.66) + 0.33;
  v_lighting = lighting;

  gl_Position = u_worldViewProjection * vec4(position, 1.0);
}
