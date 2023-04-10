declare module '*.vs';

declare module '*.fs';

declare module '*.png';

declare module '*.atlas';

declare module '*.worker.ts' {
    export default {} as typeof Worker & (new () => Worker);
}
