const { EdgeTTS: ET } = require('node-edge-tts');
const node_crypto_1 = require('node:crypto');
const axios = require('axios');

/**
 * const tts = new EdgeTTS({
    voice: 'en-US-AriaNeural',
    lang: 'en-US',
    outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
    saveSubtitles: true,
    proxy: 'http://localhost:7890',
    pitch: '-10%',
    rate: '+10%',
    volume: '-50%',
    timeout: 10000
  })
 */
const BASE_URL =
  'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VOICE_LIST = `https://${BASE_URL}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
const CHROMIUM_FULL_VERSION = '130.0.2849.68';
const WINDOWS_FILE_TIME_EPOCH = 11644473600n;
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(
  '.',
  (maxsplit = 1)
)[0];
const BASE_HEADERS = {
  'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
};
const VOICE_HEADERS = {
  'Authority': 'speech.platform.bing.com',
  'Sec-CH-UA': `" Not;A Brand";v="99", "Microsoft Edge";v="${CHROMIUM_MAJOR_VERSION}","Chromium";v="${CHROMIUM_MAJOR_VERSION}"`,
  'Sec-CH-UA-Mobile': '?0',
  'Accept': '*/*',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...BASE_HEADERS,
};

function generateSecMsGecToken() {
  const ticks =
    BigInt(Math.floor(Date.now() / 1000 + Number(WINDOWS_FILE_TIME_EPOCH))) *
    10000000n;
  const roundedTicks = ticks - (ticks % 3000000000n);
  const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`;
  const hash = (0, node_crypto_1.createHash)('sha256');
  hash.update(strToHash, 'ascii');
  return hash.digest('hex').toUpperCase();
}

/**
 * EdgeTTS
 * @class
 */

class EdgeTTS {
  async tts(args) {
    const { config, text, outputFilePath } = args;
    const tts = new ET(config);
    return await tts.ttsPromise(text, outputFilePath);
  }

  async getVoices() {
    try {
      const response = await axios.get(
        `${VOICE_LIST}&Sec-MS-GEC=${generateSecMsGecToken()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`,
        {
          headers: VOICE_HEADERS,
        }
      );

      const data = response.data;

      for (const voice of data) {
        // Remove leading and trailing whitespace from categories and personalities.
        voice.VoiceTag.ContentCategories = voice.VoiceTag.ContentCategories.map(
          (category) => category.trim()
        );
        voice.VoiceTag.VoicePersonalities =
          voice.VoiceTag.VoicePersonalities.map((personality) =>
            personality.trim()
          );
      }

      return data;
    } catch (error) {
      console.error(error);
    }
  }
}

EdgeTTS.toString = () => '[class EdgeTTS]';

module.exports = EdgeTTS;
