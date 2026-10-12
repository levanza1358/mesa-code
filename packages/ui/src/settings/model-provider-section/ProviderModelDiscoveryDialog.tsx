import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import type { ModelDiscoveryResult } from "@mesa-code/services";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Checkbox } from "@/components/ui/checkbox.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { cn } from "@/components/lib/utils.js";

type DiscoveryPhase = "loading" | "ready" | "failed";

/**
 * Fetches the provider's model catalog, renders a checklist, and persists only the
 * selected models through the same write path as manual model creation.
 *
 * Ownership: this dialog owns the transient probe request and the checkbox selection.
 * It does not own the model list; `onAddSelected` commits each model and the parent
 * re-renders from the authoritative settings view.
 */
export function ProviderModelDiscoveryDialog({
  open,
  providerId,
  providerName,
  existingModelIds,
  fetchModels,
  onAddSelected,
  onOpenChange,
}: {
  open: boolean;
  providerId: string;
  providerName: string;
  existingModelIds: readonly string[];
  fetchModels: () => Promise<ModelDiscoveryResult>;
  onAddSelected: (modelIds: readonly string[]) => Promise<string[]>;
  onOpenChange: (open: boolean) => void;
}) {
  const { intl } = useMesaCodeIntl();
  const [phase, setPhase] = useState<DiscoveryPhase>("loading");
  const [discovered, setDiscovered] = useState<readonly string[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestTokenRef = useRef(0);
  const savingRef = useRef(false);
  const fetchModelsRef = useRef(fetchModels);
  fetchModelsRef.current = fetchModels;

  const existingIds = useMemo(
    () => new Set(existingModelIds.map((modelId) => modelId.trim()).filter(Boolean)),
    [existingModelIds],
  );

  // Content key for the existing-model set. `runProbe` must not depend on the
  // `Set` or array identity: a caller passing an inline array would otherwise
  // rebuild the Set every render, giving `runProbe` a new identity and making the
  // effect below re-fire endlessly (a permanent "Fetching model list…").
  const existingIdsKey = useMemo(
    () => [...existingIds].sort().join("\u0000"),
    [existingIds],
  );
  const existingIdsRef = useRef(existingIds);
  existingIdsRef.current = existingIds;

  const runProbe = useCallback(async () => {
    const token = requestTokenRef.current + 1;
    requestTokenRef.current = token;
    setPhase("loading");
    setErrorMessage(null);
    setDiscovered([]);
    setSelected(new Set());
    try {
      const result = await fetchModelsRef.current();
      // 用户可能在探测期间关闭并重新打开对话框；旧请求不能覆盖新一轮状态。
      if (token !== requestTokenRef.current) return;
      if (result.error) {
        setPhase("failed");
        setErrorMessage(result.error.message);
        return;
      }
      setDiscovered(result.models);
      // 已经存在的模型默认不选中，避免重复提交。
      const currentExistingIds = existingIdsRef.current;
      setSelected(new Set(result.models.filter((modelId) => !currentExistingIds.has(modelId))));
      setPhase("ready");
    } catch (error) {
      if (token !== requestTokenRef.current) return;
      logger.warn("[ProviderModelDiscoveryDialog] 获取模型列表失败", { providerId, error });
      setPhase("failed");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
    // Deliberately keyed by providerId only (plus the content key below via the
    // effect): `existingIds` is read through a ref so a new Set identity cannot
    // restart the probe.
  }, [providerId, existingIdsKey]);

  useEffect(() => {
    if (!open) {
      // 关闭时让在途请求失效，避免旧结果写回下一次打开的状态。
      requestTokenRef.current += 1;
      return;
    }
    void runProbe();
  }, [open, runProbe]);

  const newlyAvailable = useMemo(
    () => discovered.filter((modelId) => !existingIds.has(modelId)),
    [discovered, existingIds],
  );
  const selectedAddable = useMemo(
    () => newlyAvailable.filter((modelId) => selected.has(modelId)),
    [newlyAvailable, selected],
  );

  const toggleModel = useCallback((modelId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(modelId);
      else next.delete(modelId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(newlyAvailable)), [newlyAvailable]);
  const clearAll = useCallback(() => setSelected(new Set()), []);

  const commitSelected = useCallback(async () => {
    if (savingRef.current) return;
    if (selectedAddable.length === 0) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await onAddSelected(selectedAddable);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [onAddSelected, onOpenChange, selectedAddable]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // 保存中不允许关闭，避免丢失已提交但未返回的模型。
      if (savingRef.current) return;
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const allSelected = newlyAvailable.length > 0 && selectedAddable.length === newlyAvailable.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl" data-testid="model-discovery-dialog">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "settings.modelProvider.discovery.title" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage(
              { id: "settings.modelProvider.discovery.description" },
              { provider: providerName || providerId },
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 min-h-32 overflow-y-auto rounded-lg border border-input-border bg-input">
          {phase === "loading" ? (
            <div className="flex h-32 items-center justify-center gap-2 text-ui-base text-foreground-subtle">
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
              {intl.formatMessage({ id: "settings.modelProvider.discovery.loading" })}
            </div>
          ) : phase === "failed" ? (
            <div className="flex h-32 flex-col items-center justify-center gap-3 px-4 text-center">
              <p role="alert" className="text-ui-base text-destructive">
                {errorMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runProbe()}
                data-testid="model-discovery-retry"
              >
                <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
                {intl.formatMessage({ id: "settings.modelProvider.discovery.retry" })}
              </Button>
            </div>
          ) : discovered.length === 0 ? (
            <div className="flex h-32 items-center justify-center px-4 text-center text-ui-base text-foreground-subtle">
              {intl.formatMessage({ id: "settings.modelProvider.discovery.empty" })}
            </div>
          ) : (
            <ul className="divide-y divide-input-border">
              {discovered.map((modelId) => {
                const alreadyAdded = existingIds.has(modelId);
                const checked = alreadyAdded || selected.has(modelId);
                return (
                  <li key={modelId} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      id={`model-discovery-${modelId}`}
                      checked={checked}
                      disabled={alreadyAdded}
                      onCheckedChange={(value) => toggleModel(modelId, value === true)}
                      data-testid={`model-discovery-checkbox-${modelId}`}
                    />
                    <label
                      htmlFor={`model-discovery-${modelId}`}
                      className={cn(
                        "flex-1 truncate font-mono text-ui-base",
                        alreadyAdded ? "text-foreground-subtle" : "text-foreground",
                      )}
                    >
                      {modelId}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {phase === "ready" && newlyAvailable.length === 0 ? (
          <p className="text-ui-sm text-foreground-subtle">
            {intl.formatMessage({ id: "settings.modelProvider.discovery.allAdded" })}
          </p>
        ) : phase === "ready" ? (
          <p className="text-ui-sm text-foreground-subtle">
            {intl.formatMessage({ id: "settings.modelProvider.discovery.configHint" })}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          {phase === "ready" && newlyAvailable.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={allSelected ? clearAll : selectAll}
            >
              {intl.formatMessage({
                id: allSelected
                  ? "settings.modelProvider.discovery.clearAll"
                  : "settings.modelProvider.discovery.selectAll",
              })}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => handleOpenChange(false)}
            >
              {intl.formatMessage({ id: "settings.modelProvider.discovery.close" })}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || selectedAddable.length === 0}
              onClick={() => void commitSelected()}
              data-testid="model-discovery-add-selected"
            >
              {saving
                ? intl.formatMessage({ id: "common.loading" })
                : intl.formatMessage(
                    { id: "settings.modelProvider.discovery.addSelected" },
                    { count: selectedAddable.length },
                  )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
