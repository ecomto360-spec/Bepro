import { describe, expect, it, vi } from "vitest";
import { checkStoreRateLimit } from "./rate-limit";
import { publicOrderStatus } from "./tracking-handlers";

function kvMock() {
  const values = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  } as unknown as KVNamespace;
}

describe("bepro storefront guards", () => {
  it("keeps local checkout available without KV and limits repeated requests with KV", async () => {
    expect((await checkStoreRateLimit(undefined, "order", "local", 2)).allowed).toBe(true);
    const kv = kvMock();
    expect((await checkStoreRateLimit(kv, "order", "customer", 2)).allowed).toBe(true);
    expect((await checkStoreRateLimit(kv, "order", "customer", 2)).allowed).toBe(true);
    const third = await checkStoreRateLimit(kv, "order", "customer", 2);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("maps internal fulfilment states to the public tracking timeline", () => {
    expect(publicOrderStatus("new")).toBe("pending");
    expect(publicOrderStatus("confirmed")).toBe("confirmed");
    expect(publicOrderStatus("out_for_delivery")).toBe("dispatched");
    expect(publicOrderStatus("delivered")).toBe("delivered");
    expect(publicOrderStatus("returned")).toBe("returned");
  });
});
