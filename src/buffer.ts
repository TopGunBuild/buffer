import {
    asciiWrite,
    assertSize,
    base64Write,
    createBuffer,
    fromArrayBuffer,
    fromArrayView,
    fromObject,
    fromString,
    hexWrite,
    isInstance, slowToString,
    ucs2Write, utf8Slice,
    utf8Write,
} from './utils';

declare const SharedArrayBuffer: any;

/* eslint-disable prefer-rest-params */

export class BaseBuffer extends Uint8Array
{
    _isBuffer = true;
    poolSize  = 8192;

    /**
     * Constructor
     */
    constructor(arg: any, encodingOrOffset?: any, length?: number)
    {
        super(arg as ArrayBuffer|Uint8Array, encodingOrOffset, length);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Static methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Returns true if {encoding} is a valid encoding argument.
     * Valid string encodings in Node 0.12: 'ascii'|'utf8'|'utf16le'|'ucs2'(alias of 'utf16le')|'base64'|'binary'(deprecated)|'hex'
     */
    static isEncoding(encoding: string): boolean
    {
        switch (String(encoding).toLowerCase())
        {
            case 'hex':
            case 'utf8':
            case 'utf-8':
            case 'ascii':
            case 'latin1':
            case 'binary':
            case 'base64':
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return true;
            default:
                return false;
        }
    }

    /**
     * Returns true if {obj} is a Buffer
     */
    static isBuffer(obj: any): obj is BaseBuffer
    {
        return (
            obj != null && obj._isBuffer === true && obj !== BaseBuffer.prototype
        );
    }

    static from(array: any[]): BaseBuffer;
    static from(buffer: BaseBuffer|Uint8Array): BaseBuffer;
    static from(str: string, encoding?: string): BaseBuffer;
    static from(
        value: ArrayBuffer|string|BaseBuffer|Uint8Array|any[],
        encodingOrOffset?: number,
        length?: number,
    ): BaseBuffer;
    static from(
        value: ArrayBuffer|string|BaseBuffer|Uint8Array|any[],
        encodingOrOffset?: string|number,
        length?: number,
    ): BaseBuffer
    {
        if (typeof value === 'string')
        {
            return fromString(value, encodingOrOffset as string);
        }

        if (ArrayBuffer.isView(value))
        {
            return fromArrayView(value);
        }

        if (value == null)
        {
            throw new TypeError(
                'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
                'or Array-like Object. Received type ' +
                typeof value,
            );
        }

        if (
            isInstance(value, ArrayBuffer) ||
            (value && isInstance((value as any).buffer, ArrayBuffer))
        )
        {
            return fromArrayBuffer(
                value as ArrayBuffer,
                encodingOrOffset as number,
                length as number,
            );
        }

        if (
            typeof SharedArrayBuffer !== 'undefined' &&
            (isInstance(value, SharedArrayBuffer) ||
                (value && isInstance((value as any).buffer, SharedArrayBuffer)))
        )
        {
            return fromArrayBuffer(
                value as ArrayBuffer,
                encodingOrOffset as number,
                length as number,
            );
        }

        if (typeof value === 'number')
        {
            throw new TypeError(
                'The "value" argument must not be of type number. Received type number',
            );
        }

        const valueOf =
                  value &&
                  typeof (value as ArrayBuffer).valueOf === 'function' &&
                  (value as ArrayBuffer).valueOf();
        if (valueOf != null && valueOf !== value)
        {
            return BaseBuffer.from(
                valueOf as ArrayBuffer,
                encodingOrOffset as number,
                length,
            );
        }

        const b = fromObject(value);
        if (b)
        {
            return b;
        }

        if (
            typeof Symbol !== 'undefined' &&
            Symbol.toPrimitive != null &&
            typeof (value as any)[Symbol.toPrimitive] === 'function'
        )
        {
            const arg: (...args: any[]) => ArrayBuffer = (value as any)[Symbol.toPrimitive];
            return BaseBuffer.from(
                arg('string'),
                encodingOrOffset as number,
                length,
            );
        }

        throw new TypeError(
            'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
            'or Array-like Object. Received type ' +
            typeof value,
        );
    }

    /**
     * Allocates a new buffer of {size} octets.
     *
     * @param size count of octets to allocate.
     * @param fill if specified, buffer will be initialized by calling buf.fill(fill).
     *    If parameter is omitted, buffer will be filled with zeros.
     * @param encoding encoding used for call to buf.fill while initializing
     */
    static alloc(
        size: number,
        fill?: string|BaseBuffer|number,
        encoding?: string,
    ): BaseBuffer
    {
        assertSize(size);
        if (size <= 0)
        {
            return createBuffer(size);
        }
        if (fill !== undefined)
        {
            // Only pay attention to encoding if it's a string. This
            // prevents accidentally sending in a number that would
            // be interpreted as a start offset.
            return typeof encoding === 'string'
                ? createBuffer(size).fill(fill, encoding)
                : createBuffer(size).fill(fill);
        }
        return createBuffer(size);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    write(string: string, encoding?: string): number;
    write(
        string: string,
        offset?: number|string,
        length?: number,
        encoding?: string|number,
    ): number
    {
        // Buffer#write(string)
        if (offset === undefined)
        {
            encoding = 'utf8';
            length   = this.length;
            offset   = 0;
            // Buffer#write(string, encoding)
        }
        else if (length === undefined && typeof offset === 'string')
        {
            encoding = offset;
            length   = this.length;
            offset   = 0;
            // Buffer#write(string, offset[, length][, encoding])
        }
        else if (isFinite(offset as number))
        {
            offset = (offset as number) >>> 0;
            if (isFinite(length as number))
            {
                length = (length as number) >>> 0;
                if (encoding === undefined) encoding = 'utf8';
            }
            else
            {
                encoding = length;
                length   = undefined;
            }
        }
        else
        {
            throw new Error(
                'Buffer.write(string, encoding, offset[, length]) is no longer supported',
            );
        }

        const remaining = this.length - offset;
        if (length === undefined || length > remaining) length = remaining;

        if (
            (string.length > 0 && (length < 0 || offset < 0)) ||
            offset > this.length
        )
        {
            throw new RangeError('Attempt to write outside buffer bounds');
        }

        if (!encoding) encoding = 'utf8';

        let loweredCase = false;
        for (; ;)
        {
            switch (encoding)
            {
                case 'hex':
                    return hexWrite(this, string, offset, length);

                case 'utf8':
                case 'utf-8':
                    return utf8Write(this, string, offset, length);

                case 'ascii':
                case 'latin1':
                case 'binary':
                    return asciiWrite(this, string, offset, length);

                case 'base64':
                    // Warning: maxLength not taken into account in base64Write
                    return base64Write(this, string, offset, length);

                case 'ucs2':
                case 'ucs-2':
                case 'utf16le':
                case 'utf-16le':
                    return ucs2Write(this, string, offset, length);

                default:
                    if (loweredCase)
                    {
                        throw new TypeError('Unknown encoding: ' + encoding);
                    }
                    encoding    = ('' + encoding).toLowerCase();
                    loweredCase = true;
            }
        }
    }

    slice(start?: number, end?: number): BaseBuffer
    {
        const len = this.length;
        start     = ~~(start as number);
        end       = end === undefined ? len : ~~end;

        if (start < 0)
        {
            start += len;
            if (start < 0) start = 0;
        }
        else if (start > len)
        {
            start = len;
        }

        if (end < 0)
        {
            end += len;
            if (end < 0) end = 0;
        }
        else if (end > len)
        {
            end = len;
        }

        if (end < start) end = start;

        return BaseBuffer.from(this.subarray(start, end));
    }

    fill(val: any, encoding?: string): any;
    fill(value: number, start?: number, end?: number): any;
    fill(
        val: any,
        start?: number|string,
        end?: number,
        encoding?: string,
    ): BaseBuffer
    {
        // Handle string cases:
        if (typeof val === 'string')
        {
            if (typeof start === 'string')
            {
                encoding = start;
                start    = 0;
                end      = this.length;
            }
            else if (typeof end === 'string')
            {
                encoding = end;
                end      = this.length;
            }
            if (encoding !== undefined && typeof encoding !== 'string')
            {
                throw new TypeError('encoding must be a string');
            }
            if (
                typeof encoding === 'string' &&
                !BaseBuffer.isEncoding(encoding)
            )
            {
                throw new TypeError('Unknown encoding: ' + encoding);
            }
            if (val.length === 1)
            {
                const code = val.charCodeAt(0);
                if (
                    (encoding === 'utf8' && code < 128) ||
                    encoding === 'latin1'
                )
                {
                    // Fast path: If `val` fits into a single byte, use that numeric value.
                    val = code;
                }
            }
        }
        else if (typeof val === 'number')
        {
            val = val & 255;
        }
        else if (typeof val === 'boolean')
        {
            val = Number(val);
        }

        if (typeof start === 'number' && typeof end === 'number')
        {
            // Invalid ranges are not set to a default, so can range check early.
            if (start < 0 || this.length < start || this.length < end)
            {
                throw new RangeError('Out of range index');
            }

            if (end <= start)
            {
                return this;
            }
        }

        start = (start as number) >>> 0;
        end   = end === undefined ? this.length : end >>> 0;

        if (!val) val = 0;

        let i;
        if (typeof val === 'number')
        {
            for (i = start; i < end; ++i)
            {
                this[i] = val;
            }
        }
        else
        {
            const bytes = BaseBuffer.isBuffer(val)
                ? val
                : BaseBuffer.from(val, encoding);
            const len   = bytes.length;
            if (len === 0)
            {
                throw new TypeError(
                    'The value "' + val + '" is invalid for argument "value"',
                );
            }
            for (i = 0; i < end - start; ++i)
            {
                this[i + start] = bytes[i % len];
            }
        }

        return this;
    }

    copy(
        target: BaseBuffer,
        targetStart?: number,
        start?: number,
        end?: number,
    ): number
    {
        if (!BaseBuffer.isBuffer(target))
        {
            throw new TypeError('argument should be a Buffer');
        }
        if (!start)
        {
            start = 0;
        }
        if (!end && end !== 0)
        {
            end = this.length;
        }
        if (typeof targetStart === 'number' && targetStart >= target.length)
        {
            targetStart = target.length;
        }
        if (!targetStart)
        {
            targetStart = 0;
        }
        if (end > 0 && end < start)
        {
            end = start;
        }

        // Copy 0 bytes; we're done
        if (end === start)
        {
            return 0;
        }
        if (target.length === 0 || this.length === 0)
        {
            return 0;
        }

        // Fatal error conditions
        if (targetStart < 0)
        {
            throw new RangeError('targetStart out of bounds');
        }
        if (start < 0 || start >= this.length)
        {
            throw new RangeError('Index out of range');
        }
        if (end >= 0)
        {
            if (end > this.length) end = this.length;
            if (target.length - targetStart < end - start)
            {
                end = target.length - targetStart + start;
            }
            const len = end - start;
            if (
                this === target &&
                typeof Uint8Array.prototype.copyWithin === 'function'
            )
            {
                // Use built-in when available, missing from IE11
                this.copyWithin(targetStart, start, end);
            }
            else
            {
                Uint8Array.prototype.set.call(
                    target,
                    this.subarray(start, end),
                    targetStart,
                );
            }
            return len;
        }
        else
        {
            throw new RangeError('sourceEnd out of bounds');
        }
    }

    toString(encoding?: string, start?: number, end?: number): string
    {
        const length = this.length;
        if (length === 0) return '';
        if (!encoding && !start && !end)
        {
            return utf8Slice(this, 0, length);
        }
        return slowToString(encoding as string, start as number, end as number);
    }
}

export class Buffer extends BaseBuffer
{
    constructor(arg: any, encodingOrOffset?: any, length?: number)
    {
        const buf = BaseBuffer.from(arg, encodingOrOffset, length);
        super(buf.length);
        buf.copy(this);
    }
}
