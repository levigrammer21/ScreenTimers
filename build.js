import {build} from 'esbuild';
import {readFile,access} from 'node:fs/promises';
await build({entryPoints:['firebase-entry.js'],bundle:true,format:'esm',outfile:'firebase-sdk.js',minify:true,target:['es2022'],legalComments:'eof'});
await build({entryPoints:['messaging-entry.js'],bundle:true,format:'iife',outfile:'push-sdk.js',minify:true,target:['es2022'],legalComments:'eof'});
for(const file of ['index.html','styles.css','app.js','domain.js','config.js','firebase-client.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png'])await access(file);
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));if(manifest.start_url!=='./'||manifest.scope!=='./')throw Error('PWA must work below a GitHub Pages repository path.');
console.log('Production SDK bundles and PWA file checks passed. Static files are ready at repository root.');
