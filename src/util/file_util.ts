import child from 'child_process';
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

    export function openDir(absolutePath: string) {
        switch (process.platform) {
            case 'darwin':
                child.exec(`open -R ${absolutePath}`);
                break;
            case 'win32':
                child.exec(`explorer /select,"${absolutePath}"`);
        }
    }
}
