uniform mat4 u_worldViewProjection;

attribute vec3 position;

void main() {
  gl_Position = u_worldViewProjection * vec4(position.xyz * 0.1, 1.0);
}
