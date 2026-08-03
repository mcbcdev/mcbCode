/* nbt.js
 * Minimal little-endian NBT reader/writer, tailored for Bedrock .mcstructure files.
 * Where to put this: elements/beacon/nbt.js
 * Loaded by editor/beacon/index.html as a plain <script> (no build step needed).
 */

const TAG = {
  End: 0, Byte: 1, Short: 2, Int: 3, Long: 4, Float: 5, Double: 6,
  ByteArray: 7, String: 8, List: 9, Compound: 10, IntArray: 11, LongArray: 12
};

// ---------- reader ----------
class NbtReader {
  constructor(buf) {
    this.view = new DataView(buf);
    this.pos = 0;
  }
  u8()  { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
  i16() { const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
  i32() { const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
  i64() {
    // JS can't safely hold true 64-bit ints; we only ever see small longs
    // in structure files, so read as two 32-bit halves and combine via BigInt.
    const lo = this.view.getUint32(this.pos, true);
    const hi = this.view.getInt32(this.pos + 4, true);
    this.pos += 8;
    return (BigInt(hi) << 32n) | BigInt(lo);
  }
  f32() { const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
  f64() { const v = this.view.getFloat64(this.pos, true); this.pos += 8; return v; }
  str() {
    const len = this.i16();
    const bytes = new Uint8Array(this.view.buffer, this.pos, len);
    this.pos += len;
    return new TextDecoder("utf-8").decode(bytes);
  }
  bytes(n) {
    const out = new Uint8Array(this.view.buffer, this.pos, n);
    this.pos += n;
    return out;
  }

  // reads one tag's PAYLOAD (assumes the type byte was already consumed)
  payload(type) {
    switch (type) {
      case TAG.Byte: return this.u8();
      case TAG.Short: return this.i16();
      case TAG.Int: return this.i32();
      case TAG.Long: return this.i64();
      case TAG.Float: return this.f32();
      case TAG.Double: return this.f64();
      case TAG.ByteArray: { const n = this.i32(); return this.bytes(n); }
      case TAG.String: return this.str();
      case TAG.List: {
        const elemType = this.u8();
        const count = this.i32();
        const arr = [];
        for (let i = 0; i < count; i++) arr.push(this.payload(elemType));
        arr.__elemType = elemType;
        return arr;
      }
      case TAG.Compound: {
        const obj = {};
        const order = [];
        while (true) {
          const t = this.u8();
          if (t === TAG.End) break;
          const name = this.str();
          const val = this.payload(t);
          obj[name] = val;
          order.push(name);
        }
        Object.defineProperty(obj, "__order", { value: order, enumerable: false });
        return obj;
      }
      case TAG.IntArray: {
        const n = this.i32();
        const arr = new Array(n);
        for (let i = 0; i < n; i++) arr[i] = this.i32();
        return arr;
      }
      case TAG.LongArray: {
        const n = this.i32();
        const arr = new Array(n);
        for (let i = 0; i < n; i++) arr[i] = this.i64();
        return arr;
      }
      default:
        throw new Error("unsupported NBT tag type: " + type);
    }
  }
}

function parseNbt(arrayBuffer) {
  const r = new NbtReader(arrayBuffer);
  const type = r.u8();
  if (type !== TAG.Compound) throw new Error("expected root compound tag");
  r.str(); // root name, always empty for mcstructure
  return r.payload(TAG.Compound);
}

// ---------- writer ----------
class NbtWriter {
  constructor() { this.chunks = []; this.length = 0; }
  _push(buf) { this.chunks.push(buf); this.length += buf.byteLength; }
  u8(v) { this._push(Uint8Array.of(v & 0xff)); }
  i16(v) { const b = new ArrayBuffer(2); new DataView(b).setInt16(0, v, true); this._push(b); }
  i32(v) { const b = new ArrayBuffer(4); new DataView(b).setInt32(0, v, true); this._push(b); }
  i64(v) {
    const bi = typeof v === "bigint" ? v : BigInt(v);
    const b = new ArrayBuffer(8);
    const dv = new DataView(b);
    dv.setUint32(0, Number(bi & 0xffffffffn), true);
    dv.setInt32(4, Number(bi >> 32n), true);
    this._push(b);
  }
  f32(v) { const b = new ArrayBuffer(4); new DataView(b).setFloat32(0, v, true); this._push(b); }
  str(s) {
    const bytes = new TextEncoder().encode(s);
    this.i16(bytes.length);
    this._push(bytes);
  }
  // writes one tag's PAYLOAD given a JS value and an explicit type
  payload(type, val) {
    switch (type) {
      case TAG.Byte: this.u8(val); return;
      case TAG.Short: this.i16(val); return;
      case TAG.Int: this.i32(val); return;
      case TAG.Long: this.i64(val); return;
      case TAG.Float: this.f32(val); return;
      case TAG.String: this.str(val); return;
      case TAG.List: {
        const elemType = val.__elemType;
        this.u8(elemType);
        this.i32(val.length);
        for (const item of val) this.payload(elemType, item);
        return;
      }
      case TAG.Compound: {
        const order = val.__order || Object.keys(val);
        for (const key of order) {
          const entry = val[key];
          this.u8(entry.type);
          this.str(key);
          this.payload(entry.type, entry.value);
        }
        this.u8(TAG.End);
        return;
      }
      case TAG.IntArray: {
        this.i32(val.length);
        for (const v of val) this.i32(v);
        return;
      }
      default:
        throw new Error("writer: unsupported tag type " + type);
    }
  }
  toArrayBuffer() {
    const out = new Uint8Array(this.length);
    let off = 0;
    for (const c of this.chunks) {
      const arr = c instanceof Uint8Array ? c : new Uint8Array(c);
      out.set(arr, off);
      off += arr.byteLength;
    }
    return out.buffer;
  }
}

// ---------- mcstructure-specific helpers ----------
// The reader above gives back plain-value compounds (no type tags kept),
// which is fine for READING. For WRITING we build a typed tree (each
// compound entry is { type, value }) so the writer knows what tag to emit.
function typed(type, value) { return { type, value }; }
function compound(fields) {
  const obj = {};
  const order = [];
  for (const [k, v] of Object.entries(fields)) { obj[k] = v; order.push(k); }
  Object.defineProperty(obj, "__order", { value: order, enumerable: false });
  return obj;
}
function list(elemType, items) { const arr = [...items]; arr.__elemType = elemType; return arr; }

/**
 * Parses raw .mcstructure bytes into a friendly JS object:
 * { size: [x,y,z], palette: [{name, states, version}], indices: Int32Array (layer 0), waterLayer: Int32Array|null }
 */
function decodeStructure(arrayBuffer) {
  const root = parseNbt(arrayBuffer);
  const size = root.size; // [x, y, z]
  const struct = root.structure;
  const layers = struct.block_indices; // list of lists, layer 0 = blocks, layer 1 = water
  const paletteRoot = struct.palette.default.block_palette; // list of compounds
  const palette = paletteRoot.map(entry => ({
    name: entry.name,
    states: entry.states || {},
    version: entry.version
  }));
  return {
    size,
    palette,
    indices: Int32Array.from(layers[0]),
    waterLayer: layers[1] ? Int32Array.from(layers[1]) : null,
    formatVersion: root.format_version
  };
}

/**
 * Builds .mcstructure bytes from { size, palette, indices, waterLayer }.
 * palette entries: { name, states, version } — states is a plain object of
 * NBT-primitive values (we only support byte/int/string states, which covers
 * the vast majority of vanilla + custom blocks).
 */
function encodeStructure({ size, palette, indices, waterLayer }) {
  const paletteList = list(TAG.Compound, palette.map(p => {
    const statesFields = {};
    for (const [k, v] of Object.entries(p.states || {})) {
      if (typeof v === "string") statesFields[k] = typed(TAG.String, v);
      else if (typeof v === "boolean") statesFields[k] = typed(TAG.Byte, v ? 1 : 0);
      else statesFields[k] = typed(TAG.Int, v | 0);
    }
    return compound({
      name: typed(TAG.String, p.name),
      states: typed(TAG.Compound, compound(statesFields)),
      version: typed(TAG.Int, p.version ?? 18163713)
    });
  }));

  const blockIndicesList = list(TAG.List, [
    list(TAG.Int, Array.from(indices)),
    list(TAG.Int, Array.from(waterLayer || indices.map(() => -1)))
  ]);

  const root = compound({
    format_version: typed(TAG.Int, 1),
    size: typed(TAG.List, list(TAG.Int, size)),
    structure_world_origin: typed(TAG.List, list(TAG.Int, [0, 0, 0])),
    structure: typed(TAG.Compound, compound({
      block_indices: typed(TAG.List, blockIndicesList),
      entities: typed(TAG.List, list(TAG.Compound, [])),
      palette: typed(TAG.Compound, compound({
        default: typed(TAG.Compound, compound({
          block_palette: typed(TAG.List, paletteList),
          block_position_data: typed(TAG.Compound, compound({}))
        }))
      }))
    }))
  });

  const w = new NbtWriter();
  w.u8(TAG.Compound);
  w.str("");
  w.payload(TAG.Compound, root);
  return w.toArrayBuffer();
}

window.BeaconNbt = { parseNbt, decodeStructure, encodeStructure, TAG };
