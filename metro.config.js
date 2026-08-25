const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Vercel's build filesystem does not support the writable CSS interop cache.
  // Keep the existing filesystem path for local/native development only.
  forceWriteFileSystem: process.env.VERCEL !== "1",
});
