/*
 * This file is part of Adblock Plus <https://adblockplus.org/>,
 * Copyright (C) 2006-present eyeo GmbH
 *
 * Adblock Plus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * Adblock Plus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Adblock Plus.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

const Module = require("./asm/compression.asm.js");

exports.usingWasm = () => !!Module["usingWasm"];

/**
 * Returns a promise that resolves when the module is fully loaded.
 * Note: only required when using WASM.
 * @returns {Promise<any>}
 */
exports.ready = () => new Promise((resolve) =>
{
  if (Module.usingWasm)
    Module.onRuntimeInitialized = () => resolve();
  else
    resolve();
});

function hashString(str)
{
  const byteSizeIn = Module.lengthBytesUTF8(str) + 1; // 1 for null-terminator
  const pIn = Module._malloc(byteSizeIn);
  Module.stringToUTF8(str, pIn, byteSizeIn);
  const state = Module._XXH32_createState();
  let value = 0;
  do
  {
    if (Module._XXH32_reset(state, 0) !== 0)
      break;
    if (Module._XXH32_update(state, pIn, byteSizeIn - 1) !== 0)
      break;
    value = Module._XXH32_digest(state);
  } while (false);
  Module._free(pIn);
  Module._XXH32_freeState(state);
  return value;
}

exports.hashString = hashString;

/**
 * Compress a string using LZ4.
 * @param {string} str The string to compress.
 * @param {number|undefined} acceleration
 *  (optional) how much to accelerate the compression.
 * @returns {ArrayBuffer|null} Returns null in case of failure.
 */
function compressString(str, acceleration = 1)
{
  const byteSizeIn = Module.lengthBytesUTF8(str) + 1; // 1 for null-terminator
  const byteSizeOut = Module._LZ4_compressBound(byteSizeIn);
  if (!byteSizeOut) return null;
  const pIn = Module._malloc(byteSizeIn);
  Module.stringToUTF8(str, pIn, byteSizeIn);
  const pOut = Module._malloc(8 + byteSizeOut);
  // reserve a short for refCount
  Module.setValue(pOut, 0, "i32");
  // write the decompressed size
  Module.setValue(pOut + 4, byteSizeIn, "i32");
  const result = Module._LZ4_compress_fast(
      pIn, pOut + 8, byteSizeIn, byteSizeOut, acceleration
  );
  Module._free(pIn);
  if (result <= 0)
  {
    Module._free(pOut);
    return null;
  }
  const out = Module.buffer.slice(pOut, pOut + 8 + result);
  Module._free(pOut);
  return out;
}

exports.compressString = compressString;

/**
 * Decompress a string.
 * @param {ArrayBuffer} arrayBuffer The buffer to decompress.
 * @returns {string|null} Returns null in case of failure.
 */
function decompressString(arrayBuffer)
{
  let byteSizeIn = arrayBuffer.byteLength - 8;
  const view = new Int32Array(arrayBuffer, 4, 1);
  const byteSizeOut = view[0];
  const pIn = Module._malloc(byteSizeIn);
  Module.HEAPU8.set(new Uint8Array(arrayBuffer, 8), pIn);
  const pOut = Module._malloc(byteSizeOut);
  const result = Module._LZ4_decompress_fast(
      pIn, pOut, byteSizeOut
  );
  Module._free(pIn);
  if (result <= 0)
  {
    return null;
  }
  const str = Module.UTF8ToString(pOut);
  Module._free(pOut);
  return str;
}

exports.decompressString = decompressString;

const stringPool = Object.create(null);

function compressStringRef(str)
{
  const hash = hashString(str).toString();
  let buffer;
  if (hash in stringPool)
    buffer = stringPool[hash];
  else
  {
    buffer = compressString(str);
  }
  (new Uint8Array(buffer, 0, 1))[0]++;
  stringPool[hash] = buffer;
  return hash;
}

exports.compressStringRef = compressStringRef;

function decompressStringRef(hash)
{
  return hash in stringPool ?
      decompressString(stringPool[hash]) :
      null;
}

exports.decompressStringRef = decompressStringRef;

function compressedStringDeref(hash)
{
  if (hash in stringPool)
  {
    const buffer = stringPool[hash];
    if (--(new Uint8Array(buffer, 0, 1))[0] <= 0)
      delete stringPool[hash];
  }
}

exports.compressedStringDeref = compressedStringDeref;

const compressibleKey = Symbol("compressibleFields");

function defineCompressableField(target, name)
{
  const storage = Object.create(target[compressibleKey] || null);
  Object.defineProperty(
      target, compressibleKey, {
        value: storage, enumerable: false, configurable: true,
        writable: false
      }
  );
  Object.defineProperty(target, name, {
    get()
    {
      return storage[name] ? decompressStringRef(storage[name]) || null : null;
    },
    set(v)
    {
      if (storage[name])
        compressedStringDeref(storage[name]);
      if (typeof v === "string")
        storage[name] = compressStringRef(v);
      else
        delete storage[name];
    }
  });
}

exports.defineCompressableField = defineCompressableField;
