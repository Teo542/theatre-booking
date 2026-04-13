const MIN_REFRESH_MS = 700;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function keepRefreshVisible(task: () => Promise<void>) {
  const startedAt = Date.now();
  await task();

  const remaining = MIN_REFRESH_MS - (Date.now() - startedAt);
  if (remaining > 0) {
    await delay(remaining);
  }
}
