import path from 'path';

export namespace PathUtil {
    export function join(...paths: string[]) {
        return path.join(...paths);
    }
}
