import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import {
  INetworkAccessService,
  type NetworkAccessAddress,
  type NetworkAccessState,
  type TailscaleInstallState,
} from "@mesa-code/services";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Switch } from "@/components/ui/switch.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { SettingsGroupCard, SettingsRow, SettingsSection } from "@/settings/SettingsPageParts.js";

/**
 * Network access (LAN / Tailscale) settings section.
 *
 * Enables a local listener that serves the web client, so a browser on the LAN
 * or a Tailscale tailnet can open the SAME session as this desktop window.
 *
 * SECURITY: there is NO authentication. The warning below is required and must
 * stay visible before the toggle is switched on. See docs/specs/local-network-access.md.
 */
export function NetworkSection({ service }: { service: INetworkAccessService }) {
  const { intl } = useMesaCodeIntl();
  const [state, setState] = useState<NetworkAccessState | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [portDraft, setPortDraft] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [install, setInstall] = useState<TailscaleInstallState | null>(null);
  const [installing, setInstalling] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyState = useCallback((next: NetworkAccessState) => {
    setState(next);
    setPortDraft((current) => (current === "" ? String(next.port) : current));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await service.getState();
      applyState(next);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, [applyState, service]);

  useEffect(() => {
    void refresh();
    // Reflect changes made elsewhere (e.g. the mirror web client) without a timer.
    // `service.onStateChanged` is an RPC event: calling it subscribes, and the returned
    // IDisposable must be disposed directly (NOT returned as the effect cleanup — React
    // would call the object as a function and throw "destroy is not a function").
    const subscription = service.onStateChanged(applyState);
    return () => subscription.dispose();
  }, [applyState, refresh, service]);

  useEffect(() => {
    const subscription = service.onInstallStateChanged(setInstall);
    return () => subscription.dispose();
  }, [service]);

  useEffect(
    () => () => {
      if (copyResetRef.current) {
        clearTimeout(copyResetRef.current);
      }
    },
    [],
  );

  const runAction = useCallback(
    async (operation: () => Promise<NetworkAccessState>) => {
      setBusy(true);
      setActionError(null);
      try {
        applyState(await operation());
      } catch (error) {
        setActionError(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
    },
    [applyState],
  );

  const handleToggle = useCallback(
    (enabled: boolean) => void runAction(() => service.setEnabled(enabled)),
    [runAction, service],
  );

  const handleApplyPort = useCallback(() => {
    const parsed = Number(portDraft.trim());
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
      setActionError(intl.formatMessage({ id: "settings.network.portInvalid" }));
      return;
    }
    void runAction(() => service.setPort(parsed));
  }, [intl, portDraft, runAction, service]);

  const handleCopy = useCallback(
    (address: NetworkAccessAddress) => {
      const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (!clipboard?.writeText) {
        setActionError(intl.formatMessage({ id: "settings.network.copyFailed" }));
        return;
      }
      void clipboard.writeText(address.url).then(
        () => {
          setCopiedUrl(address.url);
          if (copyResetRef.current) {
            clearTimeout(copyResetRef.current);
          }
          copyResetRef.current = setTimeout(() => setCopiedUrl(null), 2000);
        },
        () => setActionError(intl.formatMessage({ id: "settings.network.copyFailed" })),
      );
    },
    [intl],
  );

  const handleOpen = useCallback((address: NetworkAccessAddress) => {
    if (typeof window !== "undefined") {
      window.open(address.url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleInstall = useCallback(() => {
    setInstalling(true);
    setActionError(null);
    void service.installTailscale().then(
      (next) => {
        applyState(next);
        setInstalling(false);
      },
      (error) => {
        setActionError(error instanceof Error ? error.message : String(error));
        setInstalling(false);
      },
    );
  }, [applyState, service]);

  const enabled = state?.enabled ?? false;
  const listening = state?.listening ?? false;
  const addresses = state?.addresses ?? [];
  const error = actionError ?? state?.error ?? loadError;

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title={intl.formatMessage({ id: "settings.network.group.access" })}
        description={intl.formatMessage({ id: "settings.network.description" })}
      >
        <SettingsGroupCard>
          <SettingsRow
            label={intl.formatMessage({ id: "settings.network.enable" })}
            description={intl.formatMessage({ id: "settings.network.enableDescription" })}
            control={
              <Switch
                checked={enabled}
                disabled={busy || state?.remoteWorkspace === true}
                onCheckedChange={(checked) => handleToggle(checked)}
                aria-label={intl.formatMessage({ id: "settings.network.enable" })}
              />
            }
          />
          <SettingsRow
            label={intl.formatMessage({ id: "settings.network.port" })}
            description={intl.formatMessage({ id: "settings.network.portDescription" })}
            control={
              <div className="flex items-center justify-end gap-2">
                <Input
                  type="number"
                  min={0}
                  max={65535}
                  inputMode="numeric"
                  value={portDraft}
                  disabled={busy}
                  onChange={(event) => setPortDraft(event.currentTarget.value)}
                  className="w-24"
                  aria-label={intl.formatMessage({ id: "settings.network.port" })}
                />
                <Button type="button" variant="secondary" disabled={busy} onClick={handleApplyPort}>
                  {intl.formatMessage({ id: "settings.network.applyPort" })}
                </Button>
              </div>
            }
          />
        </SettingsGroupCard>
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.network.group.addresses" })}>
        <SettingsGroupCard>
          <div className="flex items-center justify-between gap-2 py-3.5">
            <span className="text-ui-sm text-foreground-subtle">
              {listening
                ? intl.formatMessage({ id: "settings.network.listeningOn" })
                : intl.formatMessage({ id: "settings.network.notListening" })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw className="mr-1.5 size-4" />
              {intl.formatMessage({ id: "settings.network.refresh" })}
            </Button>
          </div>
          {listening && addresses.length > 0 ? (
            addresses.map((address) => (
              <SettingsRow
                key={address.url}
                label={address.address}
                description={intl.formatMessage({
                  id:
                    address.kind === "tailscale"
                      ? "settings.network.kindTailscale"
                      : "settings.network.kindLan",
                })}
                control={
                  <div className="flex items-center justify-end gap-2">
                    <span className="truncate text-ui-sm text-foreground-subtle">
                      {address.url}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={intl.formatMessage({ id: "settings.network.copy" })}
                      onClick={() => handleCopy(address)}
                    >
                      {copiedUrl === address.url ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={intl.formatMessage({ id: "settings.network.open" })}
                      onClick={() => handleOpen(address)}
                    >
                      <ExternalLink className="size-4" />
                    </Button>
                  </div>
                }
              />
            ))
          ) : (
            <div className="py-3.5 text-ui-sm text-foreground-subtle">
              {listening
                ? intl.formatMessage({ id: "settings.network.noAddresses" })
                : intl.formatMessage({ id: "settings.network.disabledDescription" })}
            </div>
          )}
        </SettingsGroupCard>
      </SettingsSection>

      <SettingsSection title={intl.formatMessage({ id: "settings.network.group.tailscale" })}>
        <SettingsGroupCard>
          <SettingsRow
            label={intl.formatMessage({ id: "settings.network.tailscaleStatus" })}
            description={intl.formatMessage({
              id: state?.tailscale.running
                ? "settings.network.tailscaleRunning"
                : state?.tailscale.installed
                  ? "settings.network.tailscaleNotRunning"
                  : "settings.network.tailscaleMissing",
            })}
            control={
              <span className="text-ui-sm tabular-nums text-foreground-subtle">
                {state?.tailscale.addresses.join(", ") || "—"}
              </span>
            }
          />
          {state?.tailscale.installed ? null : (
            <SettingsRow
              label={intl.formatMessage({ id: "settings.network.tailscaleInstall" })}
              description={intl.formatMessage({
                id: "settings.network.tailscaleInstallDescription",
              })}
              control={
                <Button
                  type="button"
                  variant="secondary"
                  disabled={installing}
                  onClick={handleInstall}
                >
                  <Download className="mr-1.5 size-4" />
                  {installing
                    ? intl.formatMessage({ id: "settings.network.tailscaleInstalling" })
                    : intl.formatMessage({ id: "settings.network.tailscaleInstall" })}
                </Button>
              }
            />
          )}
          {install ? (
            <SettingsRow
              label={intl.formatMessage({ id: "settings.network.tailscaleInstallStatus" })}
              description={install.message}
              control={
                <span className="text-ui-sm tabular-nums text-foreground-subtle">
                  {install.percent === null ? "…" : `${install.percent}%`}
                </span>
              }
            />
          ) : null}
        </SettingsGroupCard>
      </SettingsSection>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-ui-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-ui-sm text-amber-600 dark:text-amber-400">
        {intl.formatMessage({ id: "settings.network.securityWarning" })}
      </div>
    </div>
  );
}
