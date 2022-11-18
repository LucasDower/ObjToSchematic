import fs from 'fs';

import { RGBA } from './colour';
import { LOG } from './util/log_util';
import { AppPaths, PathUtil } from './util/path_util';

export class AppConfig {
    /* Singleton */
    private static _instance: AppConfig;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    public readonly RELEASE_MODE: boolean;
    public readonly RELEASE_VERSION: string;
    public readonly VOXEL_BUFFER_CHUNK_SIZE: number;

    // Loaded from .json
    public readonly AMBIENT_OCCLUSION_OVERRIDE_CORNER: boolean;
    public readonly LOG_TO_FILE: boolean;
    public readonly USE_WORKER_THREAD: boolean;
    public readonly MULTISAMPLE_COUNT: number;
    public readonly OLD_SPACE_SIZE_MB: number;
    public readonly ALPHA_BIAS: number;
    public readonly ANGLE_SNAP_RADIUS_DEGREES: number;
    public readonly RENDER_TRIANGLE_THRESHOLD: number;
    public readonly MAXIMUM_IMAGE_MEM_ALLOC: number;
    public readonly CAMERA_FOV_DEGREES: number;
    public readonly CAMERA_DEFAULT_DISTANCE_UNITS: number;
    public readonly CAMERA_DEFAULT_AZIMUTH_RADIANS: number;
    public readonly CAMERA_DEFAULT_ELEVATION_RADIANS: number;
    public readonly CAMERA_SENSITIVITY_ROTATION: number;
    public readonly CAMERA_SENSITIVITY_ZOOM: number;
    public readonly CONSTRAINT_MAXIMUM_WIDTH: number;
    public readonly CONSTRAINT_MAXIMUM_HEIGHT: number;
    public readonly CONSTRAINT_MAXIMUM_DEPTH: number;
    public readonly DITHER_MAGNITUDE: number;
    public readonly SMOOTHNESS_MAX: number;
    public readonly CAMERA_SMOOTHING: number;
    public readonly VIEWPORT_BACKGROUND_COLOUR: RGBA;

    private constructor() {
        this.RELEASE_MODE = false;
        this.RELEASE_VERSION = '0.7.0d';
        this.VOXEL_BUFFER_CHUNK_SIZE = 5_000;

        const configFile = fs.readFileSync(PathUtil.join(AppPaths.Get.resources, 'config.json'), 'utf8');
        const configJSON = JSON.parse(configFile);

        this.AMBIENT_OCCLUSION_OVERRIDE_CORNER = configJSON.AMBIENT_OCCLUSION_OVERRIDE_CORNER;
        this.LOG_TO_FILE = configJSON.LOG_TO_FILE;
        this.USE_WORKER_THREAD = configJSON.USE_WORKER_THREAD;
        this.MULTISAMPLE_COUNT = configJSON.MULTISAMPLE_COUNT;
        this.OLD_SPACE_SIZE_MB = configJSON.OLD_SPACE_SIZE_MB;
        this.ALPHA_BIAS = configJSON.ALPHA_BIAS;
        this.ANGLE_SNAP_RADIUS_DEGREES = configJSON.ANGLE_SNAP_RADIUS_DEGREES;
        this.RENDER_TRIANGLE_THRESHOLD = configJSON.RENDER_TRIANGLE_THRESHOLD;
        this.MAXIMUM_IMAGE_MEM_ALLOC = configJSON.MAXIMUM_IMAGE_MEM_ALLOC;
        this.CAMERA_FOV_DEGREES = configJSON.CAMERA_FOV_DEGREES;
        this.CAMERA_DEFAULT_DISTANCE_UNITS = configJSON.CAMERA_DEFAULT_DISTANCE_UNITS;
        this.CAMERA_DEFAULT_AZIMUTH_RADIANS = configJSON.CAMERA_DEFAULT_AZIMUTH_RADIANS;
        this.CAMERA_DEFAULT_ELEVATION_RADIANS = configJSON.CAMERA_DEFAULT_ELEVATION_RADIANS;
        this.CAMERA_SENSITIVITY_ROTATION = configJSON.CAMERA_SENSITIVITY_ROTATION;
        this.CAMERA_SENSITIVITY_ZOOM = configJSON.CAMERA_SENSITIVITY_ZOOM;
        this.CONSTRAINT_MAXIMUM_WIDTH = configJSON.CONSTRAINT_MAXIMUM_WIDTH;
        this.CONSTRAINT_MAXIMUM_HEIGHT = configJSON.CONSTRAINT_MAXIMUM_HEIGHT;
        this.CONSTRAINT_MAXIMUM_DEPTH = configJSON.CONSTRAINT_MAXIMUM_DEPTH;
        this.DITHER_MAGNITUDE = configJSON.DITHER_MAGNITUDE;
        this.SMOOTHNESS_MAX = configJSON.SMOOTHNESS_MAX;
        this.CAMERA_SMOOTHING = configJSON.CAMERA_SMOOTHING;
        this.VIEWPORT_BACKGROUND_COLOUR = {
            r: configJSON.VIEWPORT_BACKGROUND_COLOUR.R,
            g: configJSON.VIEWPORT_BACKGROUND_COLOUR.G,
            b: configJSON.VIEWPORT_BACKGROUND_COLOUR.B,
            a: 1.0,
        };
    }

    public dumpConfig() {
        LOG(this);
    }
}
