import path from 'path';

export namespace PathUtil {
    export function join(...paths: string[]) {
        return path.join(...paths);
    }
}

export class AppPaths {
    /* Singleton */
    private static _instance: AppPaths;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _base: string;

    private constructor() {
        this._base = PathUtil.join(__dirname, '../../..');
    }

    public setBaseDir(dir: string) {
        this._base = dir;
        //const parsed = path.parse(dir);
        //ASSERT(parsed.base === 'ObjToSchematic', `AppPaths: Not correct base ${dir}`);
    }

    public get base() {
        return this._base;
    }

    public get resources() {
        return PathUtil.join(this._base, './res/');
    }

    public get tools() {
        return PathUtil.join(this._base, './tools/');
    }

    public get tests() {
        return PathUtil.join(this._base, './tests/');
    }

    public get testData() {
        return PathUtil.join(this._base, './tests/data/');
    }

    public get atlases() {
        return PathUtil.join(this.resources, './atlases/');
    }

    public get palettes() {
        return PathUtil.join(this.resources, './palettes/');
    }

    public get static() {
        return PathUtil.join(this.resources, './static/');
    }

    public get shaders() {
        return PathUtil.join(this.resources, './shaders/');
    }

    public get logs() {
        return PathUtil.join(this._base, './logs/');
    }
}
