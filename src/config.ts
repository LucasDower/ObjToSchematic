import { RGBA } from './colour';
import { LOG } from './util/log_util';

export class AppConfig {
    /* Singleton */
    private static _instance: AppConfig;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    public readonly RELEASE_MODE;
    public readonly MAJOR_VERSION = 0;
    public readonly MINOR_VERSION = 8;
    public readonly HOTFIX_VERSION = 7;
    public readonly VERSION_TYPE: 'd' | 'a' | 'r' = 'r'; // dev, alpha, or release build
    public readonly MINECRAFT_VERSION = '1.19.4';

    public readonly LOCALE = 'en_GB';
    public readonly VOXEL_BUFFER_CHUNK_SIZE = 50_000;
    public readonly AMBIENT_OCCLUSION_OVERRIDE_CORNER = true;
    public readonly USE_WORKER_THREAD = true;
    public readonly MULTISAMPLE_COUNT = 16;
    public readonly ALPHA_BIAS = 1.0;
    public readonly ANGLE_SNAP_RADIUS_DEGREES = 10.0;
    public readonly RENDER_TRIANGLE_THRESHOLD = 1_000_000;
    public readonly MAXIMUM_IMAGE_MEM_ALLOC = 2048;
    public readonly CAMERA_FOV_DEGREES = 30.0;
    public readonly CAMERA_DEFAULT_DISTANCE_UNITS = 18.0;
    public readonly CAMERA_DEFAULT_AZIMUTH_RADIANS = -1.0;
    public readonly CAMERA_DEFAULT_ELEVATION_RADIANS = 1.3;
    public readonly CAMERA_SENSITIVITY_ROTATION = 0.005;
    public readonly CAMERA_SENSITIVITY_ZOOM = 0.005;
    public readonly CONSTRAINT_MAXIMUM_HEIGHT = 380;
    public readonly SMOOTHNESS_MAX = 3.0;
    public readonly CAMERA_SMOOTHING = 1.0;
    public readonly VIEWPORT_BACKGROUND_COLOUR: RGBA = {
        r: 0.125,
        g: 0.125,
        b: 0.125,
        a: 1.0,
    };
    public readonly FRESNEL_EXPONENT = 3.0;
    public readonly FRESNEL_MIX = 0.3;

    private constructor() {
        this.RELEASE_MODE = this.VERSION_TYPE === 'r';
    }

    public dumpConfig() {
        LOG(this);
    }
}
