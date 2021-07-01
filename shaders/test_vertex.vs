uniform mat4 u_worldViewProjection;

attribute vec3 position;
attribute vec3 normal;

void main() {
  // Extrude the vertices outwards slightly to avoid z-fighting
  vec3 translated_position = position + normal * 0.0001;

  gl_Position = u_worldViewProjection * vec4(translated_position, 1.0);
}
