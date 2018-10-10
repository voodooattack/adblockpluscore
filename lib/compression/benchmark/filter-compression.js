/* eslint-disable */
const assert = require("assert");
const readline = require("readline");
const {
  compressString, decompressString, ready, usingWasm
} = require("../index");

let args = process.argv.slice(2);

let doCompress = args.includes("-c");
let doWasm = args.includes("--wasm");
let doAcceleration = args.indexOf("-a");
let acceleration = doAcceleration >= 0 ?
    parseInt(args[doAcceleration + 1], 10) || 1 : 1;

let knownFilters = new Set();

let slice = s => JSON.parse(JSON.stringify(s));

let mb = n => n / 1024 / 1024;

function getHeapUsed()
{
  gc();

  return mb(process.memoryUsage().heapUsed);
}

function compress(text)
{
  if (doCompress)
    return compressString(text, acceleration);
  return text;
}

function decompress(text)
{
  if (doCompress)
    return decompressString(text);
  return text;
}

async function main()
{
  let rl = readline.createInterface({input: process.stdin, terminal: false});

  let initialHeapUsed = getHeapUsed();

  let timeTakenForCompression = 0;
  let timeTakenForDecompression = 0;

  rl.on("line", line =>
  {
    // Slice out the line from its parent string.
    line = slice(line);

    let key = compress(line);
    if (!knownFilters.has(key))
      knownFilters.add(key);

    let startTime = Date.now();
    let test = compress(line);
    timeTakenForCompression += Date.now() - startTime;

    startTime = Date.now();
    test = decompress(test);
    timeTakenForDecompression += Date.now() - startTime;

    assert.equal(test, line);
  });

  rl.on("close", () =>
  {
    if (doCompress && usingWasm())
      console.log(`using WASM=1`);
    if (doCompress)
      console.log(`Acceleration is ${acceleration.toLocaleString()}`);
    console.log(`${knownFilters.size.toLocaleString()} filters`);
    console.info(`${(getHeapUsed() - initialHeapUsed).toLocaleString()} MB`);
    console.log(`Compressed in ${timeTakenForCompression}ms`);
    console.log(`Decompressed in ${timeTakenForDecompression}ms`);
  });
}

ready().then(main).catch(console.error);
