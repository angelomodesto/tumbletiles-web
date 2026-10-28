// Runs the production TypeScript state transitions for the independent Python oracle.
// Transpilation goes into an OS temp directory; no generated files enter the repo.
import ts from 'typescript'
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const output = await mkdtemp(join(tmpdir(), 'tumbletiles-python-'))
try {
  const files = ['simulatorState.ts', ...(await readdir(join(root, 'src/engine'))).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')).map((f) => 'engine/' + f)]
  for (const file of files) {
    const source = await readFile(join(root, 'src', file), 'utf8')
    const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText
      .replace(/from ['"](\.[^'"]+)['"]/g, (_, specifier) => `from '${specifier === './engine' ? './engine/index' : specifier}.mjs'`)
    const path = join(output, file.replace(/\.ts$/, '.mjs'))
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, js)
  }
  const model = await import(pathToFileURL(join(output, 'simulatorState.mjs')))
  let input = ''
  for await (const chunk of process.stdin) input += chunk
  const results = JSON.parse(input).map((scenario) => {
    let state = model.loadState(scenario.config)
    const snapshots = []
    const snapshot = () => state.board.polyominoes.map((group) => group.tiles.map((t) => [t.x, t.y, t.typeId ?? '']).sort()).sort()
    snapshots.push(snapshot())
    for (const direction of scenario.commands) {
      state = model.moveState(state, direction)
      snapshots.push(snapshot())
    }
    return { snapshots, xml: model.exportState(state) }
  })
  process.stdout.write(JSON.stringify(results))
} finally { await rm(output, { recursive: true, force: true }) }
