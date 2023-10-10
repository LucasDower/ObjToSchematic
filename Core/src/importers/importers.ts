import { ASSERT } from '../util/error_util';
import { IImporter } from './base_importer';
import { GltfLoader } from './gltf_loader';
import { ObjImporter } from './obj_importer';

export type TImporters = 'obj' | 'gltf';


export class ImporterFactory {
    public static GetImporter(importer: TImporters): IImporter {
        switch (importer) {
            case 'obj':
                return new ObjImporter();
            case 'gltf':
                return new GltfLoader();
            default:
                ASSERT(false);
        }
    }
}
