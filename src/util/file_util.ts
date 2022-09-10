import fs from 'fs';

export namespace FileUtil {
    export function fileExists(absolutePath: string) {
        return fs.existsSync(absolutePath);
    }
}
