import fs from 'fs';
import os from 'os';
import path from 'path';

type Config = {
  dbUrl: string;
  currentUserName?: string;
};

export function setUser(username: string): void {
  const config = readConfig();
  const updatedConfig = {
    ...config,
    currentUserName: username,
  };

  writeConfig(updatedConfig);
}

export function readConfig(): Config {
  let configFilePath = getConfigFilePath();
  let data = fs.readFileSync(configFilePath, { encoding: 'utf-8' });
  let rawConfig = JSON.parse(data);

  const config = validateConfig(rawConfig);
  return config;
}

function getConfigFilePath(): string {
  let fileName = '.gatorconfig.json';
  let filePath = path.join(os.homedir(), fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`File '${filePath}'does not exist`);
  }
  return filePath;
}

function writeConfig(cfg: Config): void {
  const newCfg: any = {};

  for (const [key, value] of Object.entries(cfg)) {
    newCfg[camelToSnakeCase(key)] = value;
  }
  const configFilePath = getConfigFilePath();
  fs.writeFileSync(configFilePath, JSON.stringify(newCfg));
}

function validateConfig(rawConfig: any): Config {
  // 1. Check if not null and is object
  if (rawConfig === null || typeof rawConfig !== 'object') {
    throw new Error('rawConfig is null or not object');
  }

  // 2. narrow type to record
  let object = rawConfig as Record<string, unknown>;

  // 3. Check required fields
  if (!object['db_url'] === undefined || typeof object['db_url'] !== 'string') {
    throw new Error('rawConfig has incorrect field - db_url');
  }

  // 4. Check optional fields
  if (
    object['current_user_name'] !== undefined &&
    typeof object['current_user_name'] !== 'string'
  ) {
    throw new Error(
      'rawConfig has incorrect optional field - current_user_name'
    );
  }

  return {
    dbUrl: object['db_url'],
    currentUserName: object['current_user_name'],
  } as Config;
}

function camelToSnakeCase(str: string): string {
  return (
    str
      // insert underscore before any uppercase that follows a lowercase or digit
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      // handle multiple uppercase letters in a row (URL → url, not u_r_l)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase()
  );
}
