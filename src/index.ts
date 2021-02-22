import type { Plugin, UserConfig } from 'vite'
import type { UserOptions } from './lib/options'
import history from 'connect-history-api-fallback'
import path from 'path'
import shell from 'shelljs'
import { getMPAIO, getHistoryReWriteRuleList } from './lib/utils'
import { name } from '../package.json'

export default function mpa(userOptions: UserOptions = {}): Plugin {
  const options = {
    filename: 'index.html',
    ...userOptions,
  }
  let resolvedConfig: UserConfig
  return {
    name,
    enforce: 'pre',
    config(config) {
      resolvedConfig = config
      config.server = config.server || {}
      config.server.open = options.open || '/index'
      config.build = config.build || {}
      config.build.rollupOptions = config.build.rollupOptions || {}
      config.build.rollupOptions.input = getMPAIO(config.root || process.cwd(), options.filename)
    },
    configureServer({ middlewares: app }) {
      app.use(
        // @see https://github.com/vitejs/vite/blob/8733a83d291677b9aff9d7d78797ebb44196596e/packages/vite/src/node/server/index.ts#L433
        // @ts-ignore
        history({
          verbose: Boolean(process.env.DEBUG) && process.env.DEBUG !== 'false',
          disableDotRule: undefined,
          htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          rewrites: getHistoryReWriteRuleList(options.filename),
        }),
      )
    },
    closeBundle() {
      const root = resolvedConfig.root || process.cwd()
      const dest = resolvedConfig.build?.outDir || 'dist'
      const resolve = (p: string) => path.resolve(root, p)

      // 1. rename all xxx.html to index.html if needed
      if (options.filename !== 'index.html') {
        shell.ls(resolve(`${dest}/src/pages/*/*.html`)).forEach(html => {
          shell.mv(html, html.replace(options.filename, 'index.html'))
        })
      }
      // 2. move src/pages/* to dest root
      shell.mv(resolve(`${dest}/src/pages/*`), resolve(dest))
      // 3. remove empty src dir
      shell.rm('-rf', resolve(`${dest}/src`))
      // 4. remove index.html copyed from public folder
      shell.rm('-rf', resolve(`${dest}/index.html`))
    },
  }
}

export type { UserOptions as MpaOptions }
