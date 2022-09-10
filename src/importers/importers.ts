import { ASSERT } from '../util/error_util';
import { IImporter } from './base_importer';
import { ObjImporter } from './obj_importer';

export type TImporters = 'obj';

export class ImporterFactor {
    public static GetImporter(importer: TImporters): IImporter {
        switch (importer) {
            case 'obj':
                return new ObjImporter();
            default:
                ASSERT(false);
        }
    }
}
