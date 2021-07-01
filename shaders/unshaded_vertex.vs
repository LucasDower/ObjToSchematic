uniform mat4 u_worldViewProjection;
uniform vec3 u_scale;

attribute vec3 position;
attribute vec3 colour;

varying vec3 v_colour;
varying float v_distance;

void main() {
  v_colour = colour;
  v_distance = length(position);

  gl_Position = u_worldViewProjection * vec4(u_scale * position  * 0.5, 1.0);
}
