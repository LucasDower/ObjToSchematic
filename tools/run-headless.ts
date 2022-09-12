import { LOG_MAJOR } from '../src/util/log_util';
import { AppPaths, PathUtil } from '../src/util/path_util';
import { runHeadless } from './headless';
import { headlessConfig } from './headless-config';

void async function main() {
    AppPaths.Get.setBaseDir(PathUtil.join(__dirname, '../..'));

    runHeadless(headlessConfig);

    LOG_MAJOR('Finished!');
}();
