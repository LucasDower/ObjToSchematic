precision mediump float;

uniform mat4 u_worldViewProjection;

attribute vec3 position;
attribute vec4 colour;

varying vec4 v_colour;

void main() { 
  v_colour = colour;
  gl_Position = u_worldViewProjection * vec4(position, 1.0);
}
