export type HardwareBackHandler = () => boolean;

const stack: HardwareBackHandler[] = [];

export function pushHardwareBackHandler(handler: HardwareBackHandler): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Run handlers from most recently registered to oldest; stop if one returns true. */
export function consumeHardwareBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      if (stack[i]()) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}
