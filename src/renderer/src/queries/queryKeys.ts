export const queryKeys = {
  players: {
    all: () => ['players'] as const,
    assignments: () => ['players', 'assignments'] as const,
    list: () => ['players', 'list'] as const
  },
  metrics: {
    all: () => ['metrics'] as const,
    list: () => ['metrics', 'list'] as const
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
  },
  tournament: {
    state: () => ['tournament', 'state'] as const
  }
} as const
