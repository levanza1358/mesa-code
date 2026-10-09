import {
  BIGMODEL_PROVIDER_ID,
  type OAuthProviderId,
  type ProviderFamilyDomain,
  type MesaCodeAccountAccess,
  type MesaCodeProviderAccountAccess,
  ZAI_PROVIDER_ID,
} from "@mesa-code/shared";

export interface AccountRequestAuthMaterial {
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface AccountRequestAuthInput {
  providerId: string;
  modelId?: string;
  accountAccess: MesaCodeProviderAccountAccess | MesaCodeAccountAccess;
  reason: "model-request" | "off-peak" | "usage";
}

export interface AccountAccessIdentityInput {
  providerId: string;
  accountAccess: MesaCodeProviderAccountAccess | MesaCodeAccountAccess;
}

export class AccountRequestCredentialUnavailableError extends Error {
  constructor(readonly providerId: string) {
    super(`Account request credential is unavailable: ${providerId}`);
    this.name = "AccountRequestCredentialUnavailableError";
  }
}

export interface AccountRequestAuthResolver {
  resolveAccessCurrent(access: MesaCodeProviderAccountAccess): Promise<MesaCodeAccountAccess | null>;
  resolveCurrent(input: AccountRequestAuthInput): Promise<AccountRequestAuthMaterial>;
  assertCurrent(input: AccountAccessIdentityInput): Promise<void>;
}

interface AccountProviderRequestAuthServiceOptions {
  resolveCurrentAccountAccess(
    access: MesaCodeProviderAccountAccess,
  ): Promise<MesaCodeAccountAccess | null>;
  loadOAuthTokenSet(providerId: OAuthProviderId): Promise<{
    accessToken?: string | null;
    mesaCodeJwtToken?: string | null;
  } | null>;
  loadIndividualPlanApiKey(
    providerId: string,
    family: ProviderFamilyDomain,
  ): Promise<string | null>;
  resolveTeamPlanApiKey(
    access: Extract<MesaCodeAccountAccess, { planKind: "team-coding-plan" }>,
  ): Promise<string | null>;
}

class AccountProviderRequestAuthService implements AccountRequestAuthResolver {
  readonly #options: AccountProviderRequestAuthServiceOptions;

  constructor(options: AccountProviderRequestAuthServiceOptions) {
    this.#options = options;
  }

  resolveAccessCurrent(access: MesaCodeProviderAccountAccess): Promise<MesaCodeAccountAccess | null> {
    return this.#options.resolveCurrentAccountAccess(access);
  }

  async resolveCurrent(input: AccountRequestAuthInput): Promise<AccountRequestAuthMaterial> {
    const providerId = input.providerId.trim();
    const access = await this.#resolveAccess(input.accountAccess);
    if (!access) throw new AccountRequestCredentialUnavailableError(providerId);

    if (access.planKind === "start-plan") {
      const tokenSet = await this.#options.loadOAuthTokenSet(resolveOAuthProviderId(access.family));
      return { apiKey: requireApiKey(tokenSet?.mesaCodeJwtToken, providerId) };
    }

    if (access.planKind === "individual-coding-plan") {
      const apiKey = await this.#options.loadIndividualPlanApiKey(providerId, access.family);
      return { apiKey: requireApiKey(apiKey, providerId) };
    }

    const apiKey = await this.#options.resolveTeamPlanApiKey(access);
    return { apiKey: requireApiKey(apiKey, providerId) };
  }

  async assertCurrent(input: AccountAccessIdentityInput): Promise<void> {
    if (!(await this.#resolveAccess(input.accountAccess))) {
      throw new AccountRequestCredentialUnavailableError(input.providerId);
    }
  }

  #resolveAccess(
    access: MesaCodeProviderAccountAccess | MesaCodeAccountAccess,
  ): Promise<MesaCodeAccountAccess | null> {
    return "mode" in access
      ? this.#options.resolveCurrentAccountAccess(access)
      : Promise.resolve(access);
  }
}

function resolveOAuthProviderId(family: ProviderFamilyDomain): OAuthProviderId {
  return family === "zai" ? ZAI_PROVIDER_ID : BIGMODEL_PROVIDER_ID;
}

function requireApiKey(value: string | null | undefined, providerId: string): string {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new AccountRequestCredentialUnavailableError(providerId);
  }
  return normalized;
}

export function createAccountProviderRequestAuthService(
  options: AccountProviderRequestAuthServiceOptions,
): AccountProviderRequestAuthService {
  return new AccountProviderRequestAuthService(options);
}
