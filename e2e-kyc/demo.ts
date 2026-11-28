// Prueba manual: `npm run kyc:demo`. Emuladores + datos de ejemplo + web local. Ctrl+C para terminar.
import { spawn } from 'node:child_process'
import { sembrar, ADMIN, perfil } from './datos'
import { PUERTO, ENTORNO_WEB } from './entorno'

async function main() {
  await sembrar()
  console.log('\nDatos de ejemplo:')
  for (const uid of ['ana', 'beto', 'carla', 'dora']) console.log(`  ${uid.padEnd(6)} ${(await perfil(uid)).estadoKyc}`)
  console.log(`
1. Abre   http://localhost:${PUERTO}/login
2. Entra con  ${ADMIN.email}  /  ${ADMIN.password}   (solo existe en el emulador)
3. Ve a   http://localhost:${PUERTO}/admin  →  KYC Sellers
Ctrl+C para apagar todo. Al volver a ejecutar, los datos se reinician.
`)
  // Solo en esta máquina; se lanza el binario directo para poder apagarlo
  const web = spawn('node_modules/.bin/vite', ['--mode', 'e2ekyc', '--host', 'localhost', '--port', String(PUERTO), '--strictPort'],
    { stdio: 'inherit', env: { ...process.env, ...ENTORNO_WEB } })
  for (const senal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(senal, () => web.kill(senal))
  process.on('exit', () => web.kill())
  web.on('exit', codigo => process.exit(codigo ?? 0))
}
main().catch(e => { console.error(e.message); process.exit(1) })
