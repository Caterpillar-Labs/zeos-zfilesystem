// packages/zfilesystem/src/chainClient.ts
import type { ABIDef } from "@wharfkit/antelope";
import type { ZfsChainClient, ZfsGetTableRowsParams, ZfsGetTableRowsResponse } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface CreateFetchZfsChainClientOptions {
  rpcUrl: string;
  cacheKey?: string;
  maxRetries?: number;
}

export function createFetchZfsChainClient(options: CreateFetchZfsChainClientOptions): ZfsChainClient {
  const rpcUrl = options.rpcUrl.replace(/\/+$/, "");
  const cacheKey = options.cacheKey ?? rpcUrl;
  const maxRetries = Math.max(options.maxRetries ?? 1, 1);
  const abiPromises = new Map<string, Promise<ABIDef>>();

  async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let retryDelay = 50;
    const maxDelay = 1000;
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxRetries) {
      try {
        const response = await fetchWithTimeout(
          `${rpcUrl}${path}`,
          {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          },
          15000,
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return (await response.json()) as T;
      } catch (err) {
        lastError = err;
        await sleep(retryDelay);
        retryDelay = Math.min(retryDelay * 2, maxDelay);
        attempt++;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`All RPC attempts failed after ${attempt} tries`);
  }

  return {
    async getAbi(account: string): Promise<ABIDef> {
      const key = `${cacheKey}\0${account}`;
      let p = abiPromises.get(key);
      if (!p) {
        p = (async () => {
          const res = await postJson<{ abi?: ABIDef }>("/v1/chain/get_abi", { account_name: account });
          if (!res?.abi) {
            throw new Error("get_abi returned no abi");
          }
          return res.abi;
        })();
        abiPromises.set(key, p);
      }
      return p;
    },

    async getTableRows<TRow>(params: ZfsGetTableRowsParams): Promise<ZfsGetTableRowsResponse<TRow>> {
      return postJson<ZfsGetTableRowsResponse<TRow>>("/v1/chain/get_table_rows", {
        code: params.code,
        table: params.table,
        scope: params.scope,
        json: true,
        limit: 1000,
        index_position: params.index_position,
        key_type: params.key_type,
        lower_bound: params.lower_bound ?? "",
      });
    },

    async getBlock(blockNumOrId: string | number, blockOptions?: { transaction_details?: string }) {
      return postJson("/v1/chain/get_block", {
        block_num_or_id: blockNumOrId,
        transaction_details: blockOptions?.transaction_details ?? "full",
      });
    },
  };
}

export async function fetchAllTableRows<TRow>(client: ZfsChainClient, params: ZfsGetTableRowsParams): Promise<TRow[]> {
  let rows: TRow[] = [];
  let lb = params.lower_bound ?? "";
  for (;;) {
    const res = await client.getTableRows<TRow>({ ...params, lower_bound: lb });
    rows = rows.concat((res?.rows ?? []) as TRow[]);
    if (!res?.more) break;
    lb = res.next_key ?? (typeof res.more === "string" ? res.more : "");
    if (!lb) break;
  }
  return rows;
}

export function networkToZfsChainContext(network: { id?: string; chainName: string; apiNodes?: string[]; zfilesystemContract?: string }): import("./types").ZfsChainContext | null {
  const contract = network.zfilesystemContract?.trim();
  const chainName = network.chainName?.trim();
  const rpcUrl = network.apiNodes?.[0]?.trim();
  if (!contract || !chainName || !rpcUrl) return null;
  const ctx: import("./types").ZfsChainContext = {
    chainName,
    rpcUrl,
    zfilesystemContract: contract,
  };
  if (network.id) ctx.id = network.id;
  return ctx;
}
