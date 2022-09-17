import { LOG_MAJOR, Logger } from '../src/util/log_util';
import { AppPaths, PathUtil } from '../src/util/path_util';
import { runHeadless } from './headless';
import { headlessConfig } from './headless-config';

void async function main() {
    AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '../..'));
    Logger.Get.enableLogToFile();
    Logger.Get.initLogFile('headless');

    runHeadless(headlessConfig);

    LOG_MAJOR('\nFinished!');
}();
