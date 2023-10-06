import fs from 'fs';

import { Logger } from '../src/util/log_util';
import { AppPaths, PathUtil } from '../src/util/path_util';

export const TEST_PREAMBLE = () => {
    Logger.Get.disableLogToFile();
    AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '..'));

    const outPath = PathUtil.join(AppPaths.Get.tests, './out/');
    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }
};
