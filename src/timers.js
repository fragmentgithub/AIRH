const pendingTimers = new Set();

export function after(ms, fn) {
  const id = setTimeout(() => {
    pendingTimers.delete(id);
    fn();
  }, ms);
  pendingTimers.add(id);
  return id;
}

export function cancelAfter(id) {
  if (id == null) return;
  clearTimeout(id);
  pendingTimers.delete(id);
}

export function cancelAllPending() {
  pendingTimers.forEach((id) => clearTimeout(id));
  pendingTimers.clear();
}

export function pendingTimerCount() {
  return pendingTimers.size;
}
