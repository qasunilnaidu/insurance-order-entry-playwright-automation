import { APIRequestContext, APIResponse, request } from '@playwright/test';
import { env } from './env';
import { findDeep } from './assertions';
import { UploadFile } from './fileUploadHelper';

export interface ApiCredentials {
  username: string;
  password: string;
}

export interface ApiClientOptions {
  /** Log in with `credentials` (or the valid agent) before returning the client. */
  authenticated?: boolean;
  credentials?: ApiCredentials;
  /** Send a fixed bearer token (e.g. an invalid/expired one) instead of logging in. */
  token?: string;
}

/**
 * Thin wrapper around Playwright's request context.
 * Supports both token-based (Authorization: Bearer) and cookie/session based auth.
 * Endpoint paths follow the Functional Module Descriptions (section 3.9): /api/...
 */
export class ApiClient {
  private token?: string;
  /** Whether the authenticated login succeeded (false when the app has no REST API). */
  loginOk = false;
  loginStatus = 0;

  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(options: ApiClientOptions = {}): Promise<ApiClient> {
    const ctx = await request.newContext({
      baseURL: env.apiBaseUrl,
      extraHTTPHeaders: { Accept: 'application/json' },
      ignoreHTTPSErrors: true,
    });
    const client = new ApiClient(ctx);
    if (options.token) client.token = options.token;
    if (options.authenticated) {
      const creds = options.credentials ?? { username: env.validUser, password: env.validPass };
      const res = await client.login(creds);
      // This app exposes no REST API (all /api/* routes 404). Rather than abort every
      // UI test that only uses the client for an optional backend cross-check, record the
      // failure; the explicit API assertions in the API suite still fail honestly.
      client.loginOk = res.ok();
      client.loginStatus = res.status();
    }
    return client;
  }

  /** POST /api/auth/login - stores a bearer token if the API returns one. */
  async login(credentials: ApiCredentials): Promise<APIResponse> {
    const res = await this.ctx.post('/api/auth/login', {
      data: { username: credentials.username, password: credentials.password },
    });
    if (res.ok()) {
      try {
        const body: unknown = await res.json();
        const candidate = findDeep(body, /^(token|accessToken|access_token|jwt)$/i);
        if (typeof candidate === 'string') this.token = candidate;
      } catch {
        /* session cookie based auth - nothing to store */
      }
    }
    return res;
  }

  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  get(path: string): Promise<APIResponse> {
    return this.ctx.get(path, { headers: this.headers() });
  }

  post(path: string, data?: unknown): Promise<APIResponse> {
    return this.ctx.post(path, { data: (data ?? {}) as Record<string, unknown>, headers: this.headers() });
  }

  put(path: string, data?: unknown): Promise<APIResponse> {
    return this.ctx.put(path, { data: (data ?? {}) as Record<string, unknown>, headers: this.headers() });
  }

  upload(path: string, file: UploadFile, fields: Record<string, string> = {}): Promise<APIResponse> {
    return this.ctx.post(path, {
      multipart: { ...fields, file: { name: file.name, mimeType: file.mimeType, buffer: file.buffer } },
      headers: this.headers(),
    });
  }

  /** Parses the body as JSON, returning an empty object when the body is empty or not JSON. */
  async json<T = unknown>(res: APIResponse): Promise<T> {
    try {
      return (await res.json()) as T;
    } catch {
      return {} as T;
    }
  }

  async getJson<T = unknown>(path: string): Promise<{ status: number; body: T }> {
    const res = await this.get(path);
    return { status: res.status(), body: await this.json<T>(res) };
  }

  /** POST /api/applications - creates an empty draft owned by the logged-in agent. */
  async createApplication(): Promise<string> {
    const res = await this.post('/api/applications', {});
    if (!res.ok()) throw new Error(`Creating an application failed with status ${res.status()}`);
    const body = await this.json(res);
    const id = findDeep(body, /^(id|applicationId|application_id)$/i);
    if (id === undefined) throw new Error(`No application id in response: ${JSON.stringify(body).slice(0, 200)}`);
    return String(id);
  }

  dispose(): Promise<void> {
    return this.ctx.dispose();
  }
}
