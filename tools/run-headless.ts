import { Logger, LOG_MAJOR } from '../src/util/log_util';
import { runHeadless } from './headless';
import { headlessConfig } from './headless-config';

void async function main() {
    if (headlessConfig.debug.logging) {
        Logger.Get.enableLOGMAJOR();
    }

    runHeadless();

    LOG_MAJOR('Finished!');
}();
