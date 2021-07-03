uniform mat4 u_worldViewProjection;

attribute vec3 position;
attribute vec3 colour;

varying vec3 v_colour;

void main() {
  v_colour = colour;
  gl_Position = u_worldViewProjection * vec4(position.xyz, 1.0);
}
