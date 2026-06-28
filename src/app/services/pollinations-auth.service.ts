import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Developer's publishable App Key (pk_…). Safe to embed in client code.
// Create one at https://enter.pollinations.ai and register your redirect
// URIs there (e.g. http://localhost:4200 and your production origin).
const POLLINATIONS_APP_KEY = '';

// User-authorized keys (sk_…) are persisted in localStorage so users do
// not have to re-authorize on every page load. Server-side TTL is 7 days
// by default; users can revoke from the dashboard at any time.
const STORAGE_KEY = 'pollinations:user_key';

const AUTHORIZE_URL = 'https://enter.pollinations.ai/authorize';
const ACCOUNT_BALANCE_URL = 'https://gen.pollinations.ai/account/balance';

type BalanceResponse = { balance: number };

/**
 * Implements the "Bring Your Own Pollen" flow:
 *
 *   1. {@link authorize} redirects the user to the Pollinations consent
 *      screen. After they approve, Pollinations bounces them back to
 *      `redirect_uri` with `api_key=sk_…` in the URL fragment.
 *   2. {@link handleAuthRedirect} reads that fragment, persists the key,
 *      strips it from the URL, and refreshes the user's balance.
 *   3. {@link getApiKey} returns the current key (or null when the user
 *      is in anonymous mode).
 */
@Injectable({ providedIn: 'root' })
export class PollinationsAuthService {
  private readonly http = inject(HttpClient);

  private readonly userApiKey = signal<string | null>(this.readStoredKey());
  private readonly _balance = signal<number | null>(null);
  private readonly _balanceLoading = signal(false);

  readonly isAuthenticated = computed(() => this.userApiKey() !== null);
  readonly balance = this._balance.asReadonly();
  readonly balanceLoading = this._balanceLoading.asReadonly();

  handleAuthRedirect(): void {
    if (!window.location.hash) {
      return;
    }

    const params = new URLSearchParams(window.location.hash.slice(1));
    const apiKey = params.get('api_key');
    const error = params.get('error');

    // Strip the fragment either way: never let the key sit in history or
    // get shared via copy-paste of the URL.
    history.replaceState(null, '', window.location.pathname + window.location.search);

    if (apiKey) {
      this.userApiKey.set(apiKey);
      this.persist(apiKey);
      void this.refreshBalance();
      return;
    }

    if (error) {
      console.warn('[Pollinations] Authorization failed:', error);
    }
  }

  authorize(): void {
    const params = new URLSearchParams({
      redirect_uri: this.redirectUri(),
      // Restrict the consent screen to the model we actually use.
      models: 'flux',
      // Request both API usage and account access so we can show the
      // user's Pollen balance after they connect.
      scope: 'usage keys',
    });
    if (POLLINATIONS_APP_KEY) {
      params.set('client_id', POLLINATIONS_APP_KEY);
    }
    window.location.href = `${AUTHORIZE_URL}?${params.toString()}`;
  }

  signOut(): void {
    this.userApiKey.set(null);
    this._balance.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be disabled (private mode, etc.) — fail silently.
    }
  }

  getApiKey(): string | null {
    return this.userApiKey();
  }

  /**
   * Fetches the user's remaining Pollen. Silently does nothing if the
   * user is not authenticated. Failures (e.g. the key lacks the
   * `account:usage` permission) leave `balance` as `null` so the UI can
   * hide it.
   */
  async refreshBalance(): Promise<void> {
    const apiKey = this.userApiKey();
    if (!apiKey) {
      this._balance.set(null);
      return;
    }
    this._balanceLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<BalanceResponse>(ACCOUNT_BALANCE_URL, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
      this._balance.set(response.balance);
    } catch (err) {
      console.warn('[Pollinations] Could not fetch balance:', err);
      this._balance.set(null);
    } finally {
      this._balanceLoading.set(false);
    }
  }

  private redirectUri(): string {
    // Drop hash and query so Pollinations returns us to a clean URL.
    return window.location.origin + window.location.pathname;
  }

  private readStoredKey(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private persist(key: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore
    }
  }
}
