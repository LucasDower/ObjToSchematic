import { LOG_MAJOR } from '../src/util/log_util';
import { runHeadless } from './headless';

void async function main() {
    runHeadless();

    LOG_MAJOR('Finished!');
}();
