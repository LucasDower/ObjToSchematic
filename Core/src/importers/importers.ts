import { OtS_Importer } from './base_importer';
import { OtS_Importer_Gltf } from './gltf_importer';
import { OtS_Importer_Obj } from './obj_importer';

export type OtS_Importers = 'obj' | 'gltf';

export class OtS_ImporterFactory {
    public static GetImporter(importer: OtS_Importers): OtS_Importer {
        switch (importer) {
            case 'obj':
                return new OtS_Importer_Obj();
            case 'gltf':
                return new OtS_Importer_Gltf();
        }
    }
}
