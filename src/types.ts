export interface IBufferCore extends Array<number>
{
    toString(enc?: string, start?: number, end?: number);
}

export interface IBuffer {

    from(array: any[]): IBufferCore;
    from(buffer: Uint8Array): IBufferCore;
    from(str: string, encoding?: string): IBufferCore;
    from(value: ArrayBuffer | string | Uint8Array | any[], encodingOrOffset?: number, length?: number): IBufferCore;

    alloc(size: number, fill?: string | number, encoding?: string): IBufferCore;
    allocUnsafe(length: number): IBufferCore;

    fill(value: number, start?: number, end?: number): IBufferCore;

    concat(arr: any[]): IBufferCore;

    toString(encoding?: string, start?: number, end?: number): string;
}