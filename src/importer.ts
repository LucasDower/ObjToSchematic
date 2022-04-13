import { Mesh } from './mesh';

export abstract class IImporter {
    abstract parseFile(filePath: string): void;
    abstract toMesh(): Mesh;
}
