import { FileUtil } from '../src/util/file_util';
import { Logger } from '../src/util/log_util';
import { AppPaths, PathUtil } from '../src/util/path_util';

export const TEST_PREAMBLE = () => {
    Logger.Get.disableLogToFile();
    AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '..'));
    FileUtil.mkdirSyncIfNotExist(PathUtil.join(AppPaths.Get.testData, './out/'));
};
