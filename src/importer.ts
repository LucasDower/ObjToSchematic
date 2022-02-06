import { Mesh } from './mesh';

export abstract class IImporter {
    abstract createMesh(filePath: string): Mesh;
}
