import { AsyncLocalStorage } from "async_hooks";

// Per-request callback stored in ALS so any agent or middleware can emit
// a user-facing status string without needing a direct reference to the SSE stream.
// Usage in route: statusContext.run(cb, asyncFn)
// Usage in agent/middleware: statusContext.getStore()?.(message)
type StatusCallback = (message: string) => void;
export const statusContext = new AsyncLocalStorage<StatusCallback>();
