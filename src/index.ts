import { setUser, readConfig } from '../config.js';

function main() {
  setUser('Vinh');
  const config = readConfig();

  for (const entry of Object.entries(config)) {
    console.log(JSON.stringify(entry));
  }
}

main();
