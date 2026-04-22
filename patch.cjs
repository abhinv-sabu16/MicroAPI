const fs = require('fs');
const path = require('path');
const root = '/workspaces/MicroAPI';

for (const svc of ['auth-service', 'user-service', 'notification-service']) {
  const p = path.join(root, 'apps', svc, 'package.json');
  if (!fs.existsSync(p)) { console.log('SKIP:', p); continue; }
  const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
  pkg.scripts.dev = 'tsx watch src/index.ts';
  if (pkg.devDependencies) {
    delete pkg.devDependencies['ts-node-dev'];
    pkg.devDependencies['tsx'] = '^4.7.1';
  }
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n');
  console.log('FIXED:', svc);
}

for (const svc of ['auth-service', 'user-service', 'notification-service']) {
  const p = path.join(root, 'apps', svc, 'tsconfig.json');
  if (!fs.existsSync(p)) {
    const cfg = {
      extends: '../../tsconfig.json',
      compilerOptions: { outDir: './dist', rootDir: './src' },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
    console.log('CREATED tsconfig:', svc);
  }
}

console.log('\nDone! Now run:');
console.log('  pnpm install --child-concurrency 1');
console.log('  pnpm dev');
