// src/locks/perChildLock.ts

class SimpleMutex {
  private queue: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.queue;
    this.queue = previous.then(() => next);
    await previous;
    return release!;
  }
}

const mutexes = new Map<string, SimpleMutex>();

export async function withChildLock<T>(
  childId: string,
  fn: () => Promise<T> | T
): Promise<T> {
  if (!mutexes.has(childId)) {
    mutexes.set(childId, new SimpleMutex());
  }
  const mutex = mutexes.get(childId)!;
  const release = await mutex.acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}