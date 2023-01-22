import child from 'child_process';
import fs from 'fs';
import path from 'path';

import { LOGF } from './log_util';

export namespace FileUtil {
    export function fileExists(absolutePath: string) {
        return fs.existsSync(absolutePath);
    }

    export function mkdirIfNotExist(path: fs.PathLike) {
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
    }

    export function rmdirIfExist(path: fs.PathLike) {
        if (fs.existsSync(path)) {
            LOGF(`Deleting '${path.toString()}'`);
            fs.rmSync(path, { recursive: true, force: true });
        }
    }

    export function openDir(absolutePath: string) {
        switch (process.platform) {
            case 'darwin':
                child.exec(`open -R ${absolutePath}`);
                break;
            case 'win32':
                const parsed = path.parse(absolutePath);
                child.exec(`start ${parsed.dir}`);
        }
    }
}
