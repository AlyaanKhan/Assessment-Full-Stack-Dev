import dotenv from 'dotenv';

dotenv.config();

// Reads one setting from the .env file and stops the app if it is missing.
// Use this for settings the app cannot safely start without, like the database.
function readRequiredSetting(settingName) {
  const value = process.env[settingName];
  if (!value) {
    throw new Error(
      `Missing environment variable ${settingName}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

// Reads one optional setting and falls back to a sensible default.
// Use this for settings that have a safe value when nobody sets them.
function readOptionalSetting(settingName, defaultValue) {
  return process.env[settingName] || defaultValue;
}

export const config = {
  port: Number(readOptionalSetting('PORT', '4000')),
  databaseUrl: readRequiredSetting('DATABASE_URL'),
  jwtSecret: readRequiredSetting('JWT_SECRET'),
  jwtExpiresIn: '7d',
  groqApiKey: readRequiredSetting('GROQ_API_KEY'),
  groqModelName: readOptionalSetting('GROQ_MODEL_NAME', 'llama-3.1-8b-instant'),
  groqRequestTimeoutMs: 15000,
  clientOrigin: readOptionalSetting('CLIENT_ORIGIN', 'http://localhost:5173'),
  // How many past messages of a conversation get sent to the AI as memory.
  conversationMemoryLength: 10,
};
