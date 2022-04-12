// TODO: Replace with UI options

export namespace AppConfig {
    /** Darkens corner even if corner block does not exist, recommended */
    export const AMBIENT_OCCLUSION_OVERRIDE_CORNER = true;

    /** Enable logging to the console */
    export const LOGGING_ENABLED = true;

    /** Enables runtime assertions, useful for debugging */
    export const ASSERTIONS_ENABLED = true;

    /** Optimises rendering by not rendering triangles facing away from camera's view direction */
    export const FACE_CULLING = false;

    /** Enables extra runtimes checks that slow execution */
    export const DEBUG_ENABLED = true;

    /** The number of samples used when sampling a voxel's colour from a textured material */
    export const MULTISAMPLE_COUNT = 16;

    /** Max size of Node's old space in MBs */
    export const OLD_SPACE_SIZE = 2048;
}
