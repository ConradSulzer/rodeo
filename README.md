# rodeo

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Seed Demo Tournament

Generate a pre-populated tournament database for local development:

```bash
$ npm run seed:tournament [./path/to/file.rodeo] [--force]

# Use electron runtime when native modules mismatch (macOS/Linux):
$ npm run seed:tournament:electron -- [./path/to/file.rodeo] [--force]
```

- If no path is provided, the script writes to `tmp/demo-tournament.rodeo`.
- Pass `--force` to overwrite an existing tournament file.
- Open the generated file through the app's "Open Tournament" flow to explore seeded players, divisions, categories, and metrics.

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
