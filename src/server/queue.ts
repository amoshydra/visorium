export interface Queue {
  <T>(task: () => Promise<T>): Promise<T>;
  readonly active: number;
  readonly pending: number;
}

/**
 * Runs asynchronous tasks with a bounded number in flight.
 */
export const createQueue = (concurrency: number): Queue => {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("concurrency must be a positive integer");
  }

  let active = 0;
  const waiting: Array<() => void> = [];

  const startNext = () => {
    const next = waiting.shift();
    if (next) {
      next();
    }
  };

  const queue = <T>(task: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active += 1;
        void Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            startNext();
          });
      };

      if (active < concurrency) {
        run();
      } else {
        waiting.push(run);
      }
    });
  };

  return Object.assign(queue, {
    get active() {
      return active;
    },
    get pending() {
      return waiting.length;
    },
  });
};
