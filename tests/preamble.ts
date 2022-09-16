import { Logger } from "../src/util/log_util"

export const TEST_PREAMBLE = () => {
    Logger.Get.disableLogToFile();
}