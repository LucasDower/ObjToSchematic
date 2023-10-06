precision mediump float;

uniform vec3 u_lightWorldPos;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec4 u_fillColour;
uniform vec3 u_cameraDir;

attribute vec3 position;
attribute vec2 texcoord;
attribute vec3 normal;

varying vec3 v_normal;

void main() {
  v_normal = normal;

  gl_Position = u_worldViewProjection * vec4(position, 1.0);
}
