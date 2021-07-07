uniform vec3 u_lightWorldPos;
uniform mat4 u_worldViewProjection;
uniform mat4 u_worldInverseTranspose;

attribute vec4 position;
attribute vec3 normal;

varying vec4 v_colour;

void main() {
  vec4 a_position = u_worldViewProjection * vec4(position.xyz, 1.0);
  
  vec3 v_normal = (u_worldInverseTranspose * vec4(normal, 0.0)).xyz;
  vec3 v_lightDir = normalize(u_lightWorldPos);

  float lighting = abs(dot(v_normal, v_lightDir));
  
  //v_colour = vec4(abs(normal) * lighting, 1.0);
  //v_colour = vec4(vec3(lighting), 1.0);
  /*
  vec3 normal_ = vec3(0.0, 0.0, 0.0);
  normal_.x = (normal.x + 1.0) / 2.0;
  normal_.y = (normal.y + 1.0) / 2.0;
  normal_.z = (normal.z + 1.0) / 2.0;
  */

  lighting = (clamp(lighting, 0.0, 1.0) * 0.66) + 0.33;

  vec3 normal_ = (normal + 1.0) / 2.0;

  v_colour = vec4(normal_ * lighting, 1.0);
  //v_colour = vec4(normal_, 1.0);

  gl_Position = a_position;
}
