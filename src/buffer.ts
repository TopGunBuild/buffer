const K_MAX_LENGTH = 0x7fffffff;

declare const SharedArrayBuffer: any;

/* eslint-disable prefer-rest-params */

export class TGBuffer extends Uint8Array
{
    _isBuffer = true;
    poolSize  = 8192;

    /**
     * Constructor
     */
    constructor(arg: ArrayBuffer|Uint8Array|number|any[]|string, encodingOrOffset?: any, length?: number)
    {
        super(arg as ArrayBuffer|Uint8Array, encodingOrOffset, length);

        // if (typeof arg === 'number')
        // {
        //     if (typeof encodingOrOffset === 'string')
        //     {
        //         throw new TypeError(
        //             'The "string" argument must be of type string. Received type number'
        //         )
        //     }
        //     return allocUnsafe(arg)
        // }
        return TGBuffer.from(arg, encodingOrOffset, length)
    }

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
                return false
        }
    }

    /**
     * Returns true if {obj} is a Buffer
     *
     * @param obj object to test.
     */
    static isBuffer(obj: any): obj is TGBuffer
    {
        return obj != null && obj._isBuffer === true && obj !== TGBuffer.prototype;
    }

    static from(array: any[]): TGBuffer;
    static from(buffer: TGBuffer|Uint8Array): TGBuffer;
    static from(str: string, encoding?: string): TGBuffer;
    static from(value: ArrayBuffer|string|TGBuffer|Uint8Array|any[], encodingOrOffset?: number, length?: number): TGBuffer;
    static from(
        value: ArrayBuffer|string|TGBuffer|Uint8Array|any[],
        encodingOrOffset?: string|number,
        length?: number
    ): TGBuffer
    {
        if (typeof value === 'string')
        {
            return fromString(value, encodingOrOffset as string)
        }

        if (ArrayBuffer.isView(value))
        {
            return fromArrayView(value)
        }

        if (value == null)
        {
            throw new TypeError(
                'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
                'or Array-like Object. Received type ' + (typeof value)
            )
        }

        if (isInstance(value, ArrayBuffer) ||
            (value && isInstance((value as any).buffer, ArrayBuffer)))
        {
            return fromArrayBuffer(value as ArrayBuffer, encodingOrOffset as number, length)
        }

        if (typeof SharedArrayBuffer !== 'undefined' &&
            (isInstance(value, SharedArrayBuffer) ||
                (value && isInstance((value as any).buffer, SharedArrayBuffer))))
        {
            return fromArrayBuffer(value as ArrayBuffer, encodingOrOffset as number, length)
        }

        if (typeof value === 'number')
        {
            throw new TypeError(
                'The "value" argument must not be of type number. Received type number'
            )
        }

        const valueOf = value && typeof (value as ArrayBuffer).valueOf === 'function' && (value as ArrayBuffer).valueOf();
        if (valueOf != null && valueOf !== value)
        {
            return TGBuffer.from(valueOf as ArrayBuffer, encodingOrOffset as number, length)
        }

        const b = fromObject(value);
        if (b)
        {
            return b;
        }

        if (
            typeof Symbol !== 'undefined'
            && Symbol.toPrimitive != null
            && typeof value[Symbol.toPrimitive] === 'function'
        )
        {
            const arg: (...args: any[]) => ArrayBuffer = value[Symbol.toPrimitive];
            return TGBuffer.from(arg('string'), encodingOrOffset as number, length)
        }

        throw new TypeError(
            'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
            'or Array-like Object. Received type ' + (typeof value)
        )
    }

    /**
     * Allocates a new buffer of {size} octets.
     *
     * @param size count of octets to allocate.
     * @param fill if specified, buffer will be initialized by calling buf.fill(fill).
     *    If parameter is omitted, buffer will be filled with zeros.
     * @param encoding encoding used for call to buf.fill while initializing
     */
    static alloc(size: number, fill?: string|TGBuffer|number, encoding?: string): TGBuffer
    {
        assertSize(size);
        if (size <= 0)
        {
            return createBuffer(size)
        }
        if (fill !== undefined)
        {
            // Only pay attention to encoding if it's a string. This
            // prevents accidentally sending in a number that would
            // be interpreted as a start offset.
            return typeof encoding === 'string'
                ? createBuffer(size).fill(fill, encoding)
                : createBuffer(size).fill(fill)
        }
        return createBuffer(size);
    }

    write(string: string, encoding?: string): number
    write(string: string, offset?: number|string, length?: number, encoding?: string|number): number
    {
        // Buffer#write(string)
        if (offset === undefined)
        {
            encoding = 'utf8';
            length   = this.length;
            offset   = 0
            // Buffer#write(string, encoding)
        }
        else if (length === undefined && typeof offset === 'string')
        {
            encoding = offset;
            length   = this.length;
            offset   = 0
            // Buffer#write(string, offset[, length][, encoding])
        }
        else if (isFinite(offset as number))
        {
            offset = offset as number >>> 0;
            if (isFinite(length))
            {
                length = length >>> 0;
                if (encoding === undefined) encoding = 'utf8'
            }
            else
            {
                encoding = length;
                length   = undefined
            }
        }
        else
        {
            throw new Error(
                'Buffer.write(string, encoding, offset[, length]) is no longer supported'
            )
        }

        const remaining = this.length - offset;
        if (length === undefined || length > remaining) length = remaining;

        if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length)
        {
            throw new RangeError('Attempt to write outside buffer bounds')
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
                    if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
                    encoding    = ('' + encoding).toLowerCase();
                    loweredCase = true
            }
        }
    }

    slice(start?: number, end?: number): TGBuffer
    {
        const len = this.length;
        start     = ~~start;
        end       = end === undefined ? len : ~~end;

        if (start < 0)
        {
            start += len;
            if (start < 0) start = 0
        }
        else if (start > len)
        {
            start = len
        }

        if (end < 0)
        {
            end += len;
            if (end < 0) end = 0
        }
        else if (end > len)
        {
            end = len
        }

        if (end < start) end = start;

        return TGBuffer.from(this.subarray(start, end));
    }

    fill(val: any, encoding?: string): any
    fill(value: number, start?: number, end?: number): any
    fill(val: any, start?: number|string, end?: number, encoding?: string): TGBuffer
    {
        // Handle string cases:
        if (typeof val === 'string')
        {
            if (typeof start === 'string')
            {
                encoding = start;
                start    = 0;
                end      = this.length
            }
            else if (typeof end === 'string')
            {
                encoding = end;
                end      = this.length
            }
            if (encoding !== undefined && typeof encoding !== 'string')
            {
                throw new TypeError('encoding must be a string')
            }
            if (typeof encoding === 'string' && !TGBuffer.isEncoding(encoding))
            {
                throw new TypeError('Unknown encoding: ' + encoding)
            }
            if (val.length === 1)
            {
                const code = val.charCodeAt(0);
                if ((encoding === 'utf8' && code < 128) ||
                    encoding === 'latin1')
                {
                    // Fast path: If `val` fits into a single byte, use that numeric value.
                    val = code
                }
            }
        }
        else if (typeof val === 'number')
        {
            val = val & 255
        }
        else if (typeof val === 'boolean')
        {
            val = Number(val)
        }

        // Invalid ranges are not set to a default, so can range check early.
        if (start < 0 || this.length < start || this.length < end)
        {
            throw new RangeError('Out of range index')
        }

        if (end <= start)
        {
            return this
        }

        start = start as number >>> 0;
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
            const bytes = TGBuffer.isBuffer(val)
                ? val
                : TGBuffer.from(val, encoding);
            const len   = bytes.length;
            if (len === 0)
            {
                throw new TypeError('The value "' + val +
                    '" is invalid for argument "value"')
            }
            for (i = 0; i < end - start; ++i)
            {
                this[i + start] = bytes[i % len]
            }
        }

        return this;
    }

    copy(target: TGBuffer, targetStart?: number, start?: number, end?: number): number
    {
        if (!TGBuffer.isBuffer(target)) throw new TypeError('argument should be a Buffer');
        if (!start) start = 0;
        if (!end && end !== 0) end = this.length;
        if (targetStart >= target.length) targetStart = target.length;
        if (!targetStart) targetStart = 0;
        if (end > 0 && end < start) end = start;

        // Copy 0 bytes; we're done
        if (end === start) return 0;
        if (target.length === 0 || this.length === 0) return 0;

        // Fatal error conditions
        if (targetStart < 0)
        {
            throw new RangeError('targetStart out of bounds')
        }
        if (start < 0 || start >= this.length) throw new RangeError('Index out of range');
        if (end < 0) throw new RangeError('sourceEnd out of bounds');

        // Are we oob?
        if (end > this.length) end = this.length;
        if (target.length - targetStart < end - start)
        {
            end = target.length - targetStart + start
        }

        const len = end - start;

        if (this === target && typeof Uint8Array.prototype.copyWithin === 'function')
        {
            // Use built-in when available, missing from IE11
            this.copyWithin(targetStart, start, end)
        }
        else
        {
            Uint8Array.prototype.set.call(
                target,
                this.subarray(start, end),
                targetStart
            )
        }

        return len
    }
}

// HELPER FUNCTIONS
// ================

function allocUnsafe(size: number): TGBuffer
{
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
}

function base64Write(buf, string, offset, length)
{
    return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function asciiToBytes(str)
{
    const byteArray = [];
    for (let i = 0; i < str.length; ++i)
    {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF)
    }
    return byteArray
}

function asciiWrite(buf, string, offset, length)
{
    return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function utf8Write(buf, string, offset, length)
{
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function blitBuffer(src, dst, offset, length)
{
    let i;
    for (i = 0; i < length; ++i)
    {
        if ((i + offset >= dst.length) || (i >= src.length)) break;
        dst[i + offset] = src[i]
    }
    return i
}

function ucs2Write(buf, string, offset, length)
{
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

function utf16leToBytes(str, units)
{
    let c, hi, lo;
    const byteArray = [];
    for (let i = 0; i < str.length; ++i)
    {
        if ((units -= 2) < 0) break;

        c  = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
    }

    return byteArray
}

function hexWrite(buf, string, offset, length)
{
    offset          = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length)
    {
        length = remaining
    }
    else
    {
        length = Number(length);
        if (length > remaining)
        {
            length = remaining
        }
    }

    const strLen = string.length;

    if (length > strLen / 2)
    {
        length = strLen / 2
    }
    let i;
    for (i = 0; i < length; ++i)
    {
        const parsed = parseInt(string.substr(i * 2, 2), 16);
        if (numberIsNaN(parsed)) return i;
        buf[offset + i] = parsed
    }
    return i
}

function assertSize(size)
{
    if (typeof size !== 'number')
    {
        throw new TypeError('"size" argument must be of type number')
    }
    else if (size < 0)
    {
        throw new RangeError('The value "' + size + '" is invalid for option "size"')
    }
}

function fromObject(obj)
{
    if (TGBuffer.isBuffer(obj))
    {
        const len = checked(obj.length) | 0;
        const buf = createBuffer(len);

        if (buf.length === 0)
        {
            return buf
        }

        obj.copy(buf, 0, 0, len);
        return buf
    }

    if (obj.length !== undefined)
    {
        if (typeof obj.length !== 'number' || numberIsNaN(obj.length))
        {
            return createBuffer(0)
        }
        return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data))
    {
        return fromArrayLike(obj.data)
    }
}

function fromString(string: string, encoding: string): TGBuffer
{
    if (typeof encoding !== 'string' || encoding === '')
    {
        encoding = 'utf8'
    }

    if (!TGBuffer.isEncoding(encoding))
    {
        throw new TypeError('Unknown encoding: ' + encoding)
    }

    const length = byteLength(string, encoding) | 0;
    let buf      = createBuffer(length);

    const actual = buf.write(string, encoding);

    if (actual !== length)
    {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual)
    }

    return buf
}

function byteLength(string, encoding: string): number
{
    if (TGBuffer.isBuffer(string))
    {
        return string.length
    }
    if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer))
    {
        return string.byteLength
    }
    if (typeof string !== 'string')
    {
        throw new TypeError(
            'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
            'Received type ' + typeof string
        )
    }

    const len       = string.length;
    const mustMatch = (arguments.length > 2 && arguments[2] === true);
    if (!mustMatch && len === 0) return 0;

    // Use a for loop to avoid recursion
    let loweredCase = false;
    for (; ;)
    {
        switch (encoding)
        {
            case 'ascii':
            case 'latin1':
            case 'binary':
                return len;
            case 'utf8':
            case 'utf-8':
                return utf8ToBytes(string).length;
            case 'ucs2':
            case 'ucs-2':
            case 'utf16le':
            case 'utf-16le':
                return len * 2;
            case 'hex':
                return len >>> 1;
            case 'base64':
                return base64ToBytes(string).length;
            default:
                if (loweredCase)
                {
                    return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
                }
                encoding    = ('' + encoding).toLowerCase();
                loweredCase = true
        }
    }
}

function fromArrayLike(array: ArrayLike<any>): TGBuffer
{
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf    = createBuffer(length);
    for (let i = 0; i < length; i += 1)
    {
        buf[i] = array[i] & 255;
    }
    return buf
}

function checked(length: number): number
{
    // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= K_MAX_LENGTH)
    {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
            'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
    }
    return length | 0
}

function fromArrayView(arrayView: ArrayLike<any>): TGBuffer
{
    if (isInstance(arrayView, Uint8Array))
    {
        const copy = new Uint8Array(arrayView);
        return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
    }
    return fromArrayLike(arrayView);
}

function fromArrayBuffer(array: ArrayBuffer, byteOffset: number, length: number): TGBuffer
{
    if (byteOffset < 0 || array.byteLength < byteOffset)
    {
        throw new RangeError('"offset" is outside of buffer bounds')
    }

    if (array.byteLength < byteOffset + (length || 0))
    {
        throw new RangeError('"length" is outside of buffer bounds')
    }

    let buf: TGBuffer;
    if (byteOffset === undefined && length === undefined)
    {
        buf = new TGBuffer(array)
    }
    else if (length === undefined)
    {
        buf = new TGBuffer(array, byteOffset)
    }
    else
    {
        buf = new TGBuffer(array, byteOffset, length)
    }

    return buf
}

function utf8ToBytes(string: string, units?: number): number[]
{
    units                 = units || Infinity;
    let codePoint;
    const length          = string.length;
    let leadSurrogate     = null;
    const bytes: number[] = [];

    for (let i = 0; i < length; ++i)
    {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000)
        {
            // last char was a lead
            if (!leadSurrogate)
            {
                // no lead yet
                if (codePoint > 0xDBFF)
                {
                    // unexpected trail
                    if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                    continue
                }
                else if (i + 1 === length)
                {
                    // unpaired lead
                    if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                    continue
                }

                // valid lead
                leadSurrogate = codePoint;

                continue
            }

            // 2 leads in a row
            if (codePoint < 0xDC00)
            {
                if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
                leadSurrogate = codePoint;
                continue
            }

            // valid surrogate pair
            codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
        }
        else if (leadSurrogate)
        {
            // valid bmp char, but last char was a lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80)
        {
            if ((units -= 1) < 0) break;
            bytes.push(codePoint)
        }
        else if (codePoint < 0x800)
        {
            if ((units -= 2) < 0) break;
            bytes.push(
                codePoint >> 0x6 | 0xC0,
                codePoint & 0x3F | 0x80
            )
        }
        else if (codePoint < 0x10000)
        {
            if ((units -= 3) < 0) break;
            bytes.push(
                codePoint >> 0xC | 0xE0,
                codePoint >> 0x6 & 0x3F | 0x80,
                codePoint & 0x3F | 0x80
            )
        }
        else if (codePoint < 0x110000)
        {
            if ((units -= 4) < 0) break;
            bytes.push(
                codePoint >> 0x12 | 0xF0,
                codePoint >> 0xC & 0x3F | 0x80,
                codePoint >> 0x6 & 0x3F | 0x80,
                codePoint & 0x3F | 0x80
            )
        }
        else
        {
            throw new Error('Invalid code point')
        }
    }

    return bytes;
}

function createBuffer(length: number): TGBuffer
{
    if (length > K_MAX_LENGTH)
    {
        throw new RangeError('The value "' + length + '" is invalid for option "size"')
    }
    return new TGBuffer(length)
}

const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

function base64clean(str: string): string
{
    // Node takes equal signs as end of the Base64 encoding
    str = str.split('=')[0];
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = str.trim().replace(INVALID_BASE64_RE, '');
    // Node converts strings with length < 2 to ''
    if (str.length < 2) return '';
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0)
    {
        str = str + '='
    }
    return str;
}

function base64ToBytes(str: string): Uint8Array|Array<any>
{
    return toByteArray(base64clean(str));
}

function getLens(b64: string): [number, number]
{
    const len = b64.length;

    if (len % 4 > 0)
    {
        throw new Error('Invalid string. Length must be a multiple of 4')
    }

    // Trim off extra bytes after placeholder bytes are found
    // See: https://github.com/beatgammit/base64-js/issues/42
    let validLen = b64.indexOf('=');
    if (validLen === -1) validLen = len;

    const placeHoldersLen = validLen === len
        ? 0
        : 4 - (validLen % 4);

    return [validLen, placeHoldersLen]
}

function _byteLength(b64: string, validLen: number, placeHoldersLen: number): number
{
    return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

const revLookup: number[] = [];
const Arr                 = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

function toByteArray(b64: string): Uint8Array|Array<any>
{
    let tmp;
    const lens            = getLens(b64);
    const validLen        = lens[0];
    const placeHoldersLen = lens[1];

    const arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

    let curByte = 0;

    // if there are placeholders, only get up to the last complete 4 chars
    const len = placeHoldersLen > 0
        ? validLen - 4
        : validLen;

    let i;
    for (i = 0; i < len; i += 4)
    {
        tmp            =
            (revLookup[b64.charCodeAt(i)] << 18) |
            (revLookup[b64.charCodeAt(i + 1)] << 12) |
            (revLookup[b64.charCodeAt(i + 2)] << 6) |
            revLookup[b64.charCodeAt(i + 3)];
        arr[curByte++] = (tmp >> 16) & 0xFF;
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF
    }

    if (placeHoldersLen === 2)
    {
        tmp            =
            (revLookup[b64.charCodeAt(i)] << 2) |
            (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[curByte++] = tmp & 0xFF
    }

    if (placeHoldersLen === 1)
    {
        tmp            =
            (revLookup[b64.charCodeAt(i)] << 10) |
            (revLookup[b64.charCodeAt(i + 1)] << 4) |
            (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[curByte++] = (tmp >> 8) & 0xFF;
        arr[curByte++] = tmp & 0xFF
    }

    return arr
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance(obj: any, type: any): boolean
{
    return obj instanceof type ||
        (obj != null && obj.constructor != null && obj.constructor.name != null &&
            obj.constructor.name === type.name)
}

function numberIsNaN(obj: any): boolean
{
    // For IE11 support
    return obj !== obj; // eslint-disable-line no-self-compare
}

