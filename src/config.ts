// TODO: Replace with UI options

export namespace AppConfig {
    /** Darkens corner even if corner block does not exist, recommended. */
    export const AMBIENT_OCCLUSION_OVERRIDE_CORNER = true;

    /** Enable logging to the console. */
    export const LOGGING_ENABLED = true;

    /** Enables runtime assertions, useful for debugging. */
    export const ASSERTIONS_ENABLED = true;

    /** Optimises rendering by not rendering triangles facing away from camera's view direction. */
    export const FACE_CULLING = false;

    /** Enables extra runtimes checks that slow execution. */
    export const DEBUG_ENABLED = true;

    /** The number of samples used when sampling a voxel's colour from a textured material. */
    export const MULTISAMPLE_COUNT = 16;

    /** Max size of Node's old space in MBs. */
    export const OLD_SPACE_SIZE = 2048;

    /** This value determines how much more important it is to closely match a block's transparency value than its colour. */
    export const ALPHA_BIAS = 1.0;

    /** The angle radius (in degrees) around a snapping point the viewport camera must be within to snap. Must be between 0.0 and 90.0 */
    export const ANGLE_SNAP_RADIUS_DEGREES = 10.0;

    /** If the loaded mesh exceeds this number of triangles, the renderer will not attempt to draw it. */
    export const RENDER_TRIANGLE_THRESHOLD = 1_000_000;

    /** The maximum memory that should be allocated when attempting to decode JPEG images. 512MB is usually sufficient for 4k images, however this will need to be increased for 8k images */
    export const MAXIMUM_IMAGE_MEM_ALLOC = 512;

    /** Whether of not all logs should be saved to a file */
    export const LOG_TO_FILE = true;

    /** Whether or not to use a worker thread. You should probably never disable this unless debugging. */
    export const USE_WORKER_THREAD = true;
}
