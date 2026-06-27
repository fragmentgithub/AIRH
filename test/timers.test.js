import test from "node:test";
import assert from "node:assert/strict";
import { after, cancelAfter, cancelAllPending, pendingTimerCount } from "../src/timers.js";

test("after runs and removes a pending timer", async () => {
  let ran = false;
  after(5, () => {
    ran = true;
  });
  assert.equal(pendingTimerCount(), 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(ran, true);
  assert.equal(pendingTimerCount(), 0);
});

test("cancelAfter prevents a pending callback", async () => {
  let ran = false;
  const id = after(20, () => {
    ran = true;
  });
  cancelAfter(id);
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(ran, false);
  assert.equal(pendingTimerCount(), 0);
});

test("cancelAllPending clears every tracked timer", async () => {
  let count = 0;
  after(20, () => count++);
  after(20, () => count++);
  assert.equal(pendingTimerCount(), 2);
  cancelAllPending();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(count, 0);
  assert.equal(pendingTimerCount(), 0);
});
