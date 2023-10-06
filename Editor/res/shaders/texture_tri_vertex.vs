precision mediump float;

uniform vec3 u_lightWorldPos;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;
uniform vec3 u_cameraDir;

attribute vec3 position;
attribute vec2 texcoord;
attribute vec3 normal;

varying vec2 v_texcoord;
varying vec3 v_normal;

void main() {
  v_texcoord = texcoord;
  v_normal = normal;

  gl_Position = u_worldViewProjection * vec4(position, 1.0);
}
