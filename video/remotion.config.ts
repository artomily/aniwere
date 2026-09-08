import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// CRF 18 di H.264: praktis tidak terlihat bedanya dari sumber, dan masih aman
// untuk diunggah ulang oleh YouTube tanpa jadi bubur di area gelap.
Config.setCodec("h264");
Config.setCrf(18);
