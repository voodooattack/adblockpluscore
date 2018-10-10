/* eslint-disable */
const {compressString, decompressString, hashString} = require("./index");

const sample = "@@||yahooapis.com^$script,third-party,domain=truththeory.com";
const compressed = compressString(sample);
const decompressed = decompressString(compressed);
console.log(sample);
console.log(decompressed);
console.log(new Uint8Array(compressed));
console.log("match:", sample === decompressed);
console.log("hash:", hashString(sample));
