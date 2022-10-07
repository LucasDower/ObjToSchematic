import fs from 'fs';

export namespace FileUtil {
    export function fileExists(absolutePath: string) {
        return fs.existsSync(absolutePath);
    }

    export function mkdirSyncIfNotExist(path: fs.PathLike) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }
}
