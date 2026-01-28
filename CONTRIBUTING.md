# Contributing to MCP Server Addon

Thank you for your interest in contributing to the MCP Server addon for Local!

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/getflywheel/local-addon-mcp-server.git
   cd local-addon-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and link to Local:
   ```bash
   npm run build
   npm run install-addon
   ```

4. Restart Local and enable the addon.

## Development Workflow

- **Build**: `npm run build`
- **Watch mode**: `npm run watch`
- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Test**: `npm run test`
- **Type check**: `npm run typecheck`

## Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint:fix` to auto-fix issues
- Run `npm run format` to format code

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for good test coverage

```bash
npm run test:coverage
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run quality checks: `npm run lint && npm run typecheck && npm run test`
4. Update CHANGELOG.md with your changes
5. Submit a pull request

## Commit Messages

Follow conventional commits format:
- `feat: Add new feature`
- `fix: Fix bug`
- `docs: Update documentation`
- `refactor: Refactor code`
- `test: Add tests`
- `chore: Maintenance tasks`

## Adding New MCP Tools

See [DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md) for detailed instructions on adding new tools.

## Questions?

Open an issue on GitHub for questions or discussions.
