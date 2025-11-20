export const queryKeys = {
  players: {
    all: () => ['players'] as const,
    withDivisions: () => ['players', 'with-divisions'] as const
  },
  scoreables: {
    all: () => ['scoreables'] as const,
    list: () => ['scoreables', 'list'] as const,
    views: () => ['scoreables', 'views'] as const
  },
  categories: {
    all: () => ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    views: () => ['categories', 'views'] as const,
    rules: () => ['categories', 'rules'] as const
  },
  divisions: {
    all: () => ['divisions'] as const,
    list: () => ['divisions', 'list'] as const,
    views: () => ['divisions', 'views'] as const
  }
} as const
