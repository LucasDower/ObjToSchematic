uniform mat4 u_worldViewProjection;
uniform float u_voxelSize;
uniform vec3 u_translate;

attribute vec3 position;
attribute vec3 normal;
attribute vec3 colour;
attribute vec4 occlusion;
attribute vec2 texcoord;

varying float v_lighting;
varying vec4 v_occlusion;
varying vec2 v_texcoord;
varying vec3 v_colour;

vec3 light = vec3(0.78, 0.98, 0.59);

void main() {
    v_lighting = dot(light, abs(normal));
    v_occlusion = occlusion;
    v_texcoord = texcoord;
    v_colour = colour;

    gl_Position = u_worldViewProjection * vec4((position.xyz + vec3(0.5)) * u_voxelSize + u_translate, 1.0);
}
