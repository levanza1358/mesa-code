import { useCallback, useEffect, useRef, useState } from "react";
import { Save, Sparkles, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Textarea } from "@/components/ui/textarea.js";
import { toast } from "@/components/ui/toast.js";
import {
  useBaseWorkspaceServices,
  useWorkspaceServicesResolution,
} from "@/hooks/useWorkspaceServices.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";
import { SettingsGroupCard } from "@/settings/SettingsPageParts.js";
import { logger } from "@/logger.js";

/**
 * SOUL.md persona editor.
 *
 * The persona layer is a plain file on disk in two scopes, both edited here:
 * user scope (`~/.mesaCode/SOUL.md`, applies to every workspace) and workspace scope
 * (`<root>/SOUL.md`, adds to the global one). The CLI context adapter stays the only
 * reader, so a save takes effect on the next context resolution.
 */

type SoulScope = "user" | "workspace";

interface SoulSectionProps {
  workspacePath?: string | null;
  workspaceIdentity?: string;
}

type SoulFileState = {
  content: string;
  source: "file" | "template";
};

export function SoulSection({ workspacePath, workspaceIdentity }: SoulSectionProps) {
  return (
    <div className="space-y-4">
      <SoulEditor scope="user" />
      {workspacePath ? (
        <SoulEditor scope="workspace" workspacePath={workspacePath} workspaceIdentity={workspaceIdentity} />
      ) : null}
    </div>
  );
}

function SoulEditor({
  scope,
  workspacePath,
  workspaceIdentity,
}: {
  scope: SoulScope;
  workspacePath?: string;
  workspaceIdentity?: string;
}) {
  const { intl } = useMesaCodeIntl();
  const baseServices = useBaseWorkspaceServices();
  const resolution = useWorkspaceServicesResolution(workspacePath, undefined, workspaceIdentity);
  // Global SOUL.md is local user state. Do not route it through the active remote workspace.
  const services = scope === "user" ? baseServices : resolution.services;
  const rpcReady = scope === "user" ? true : resolution.rpcReady;

  const [loaded, setLoaded] = useState<SoulFileState | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const loadVersionRef = useRef(0);

  const load = useCallback(async () => {
    if (scope === "workspace" && !rpcReady) {
      return;
    }
    const version = loadVersionRef.current + 1;
    loadVersionRef.current = version;
    setLoading(true);
    try {
      const result = await services.fileService.readSoulFile({
        scope,
        rootPath: scope === "workspace" ? workspacePath : null,
      });
      if (loadVersionRef.current !== version) {
        return;
      }
      setLoaded({ content: result.content, source: result.source });
      setDraft(result.content);
    } catch (error) {
      if (loadVersionRef.current !== version) {
        return;
      }
      logger.warn("[SoulSection] Failed to read SOUL.md", {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
      toast(intl.formatMessage({ id: "settings.soul.loadFailed" }));
    } finally {
      if (loadVersionRef.current === version) {
        setLoading(false);
      }
    }
  }, [intl, rpcReady, scope, services, workspacePath]);

  useEffect(() => {
    if (scope === "workspace" && !rpcReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoaded(null);
    setDraft("");
    void load();
  }, [load, rpcReady, scope]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await services.fileService.writeSoulFile({
        scope,
        rootPath: scope === "workspace" ? workspacePath : null,
        content: draft,
      });
      setLoaded({ content: draft, source: "file" });
      toast(intl.formatMessage({ id: "settings.soul.saved" }));
    } catch (error) {
      logger.warn("[SoulSection] Failed to save SOUL.md", {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
      toast(intl.formatMessage({ id: "settings.soul.saveFailed" }));
    } finally {
      setSaving(false);
    }
  }, [draft, intl, scope, services, workspacePath]);

  const handleRestoreDefaults = useCallback(() => {
    // Restoring only fills the editor; the user still has to save, matching the
    // .mesaCodeignore section behaviour.
    setDraft(intl.formatMessage({ id: "settings.soul.defaultContent" }));
  }, [intl]);

  // Auto-generate drafts from on-disk workspace facts and fills the editor only.
  // Disk is untouched until save, so an existing persona can never be silently replaced.
  const handleAutoGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await services.fileService.generateSoulFile({
        scope,
        rootPath: scope === "workspace" ? workspacePath : null,
      });
      setDraft(result.content);
      toast(intl.formatMessage({ id: "settings.soul.generated" }));
    } catch (error) {
      logger.warn("[SoulSection] Failed to auto-generate SOUL.md", {
        scope,
        error: error instanceof Error ? error.message : String(error),
      });
      toast(intl.formatMessage({ id: "settings.soul.generateFailed" }));
    } finally {
      setGenerating(false);
    }
  }, [intl, scope, services, workspacePath]);

  // Same save gating as the ignore editor: a not-yet-created file can be saved even
  // when untouched, otherwise the user could never create it on first visit.
  const canSave = loaded === null || loaded.source === "template" || draft !== loaded.content;
  const dirty = loaded !== null && loaded.source === "file" && draft !== loaded.content;

  return (
    <div className="space-y-3">
      <div className="text-ui-base font-medium text-foreground-subtle">
        {intl.formatMessage({
          id: scope === "user" ? "settings.soul.userTitle" : "settings.soul.workspaceTitle",
        })}
      </div>
      <div className="text-ui-base leading-6 text-foreground-subtle">
        {intl.formatMessage({
          id: scope === "user" ? "settings.soul.userDescription" : "settings.soul.workspaceDescription",
        })}
      </div>
      <SettingsGroupCard>
        <div className="space-y-3 px-4 py-3">
          {loaded?.source === "template" ? (
            <div className="text-ui-base leading-6 text-foreground-subtle">
              {intl.formatMessage({ id: "settings.soul.templateHint" })}
            </div>
          ) : null}
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (canSave && !saving && !loading) {
                  void handleSave();
                }
              }
            }}
            spellCheck={false}
            disabled={loading || saving}
            className="min-h-64 w-full font-mono text-ui-base"
            aria-label={intl.formatMessage({
              id: scope === "user"
                ? "settings.soul.userEditorLabel"
                : "settings.soul.workspaceEditorLabel",
            })}
            data-testid={`soul-editor-${scope}`}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={!canSave || saving || loading}
              onClick={() => void handleSave()}
              data-testid={`soul-save-${scope}`}
            >
              <Save className="size-4" />
              {intl.formatMessage({ id: "settings.soul.save" })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || saving || generating}
              onClick={() => void handleAutoGenerate()}
              data-testid={`soul-auto-generate-${scope}`}
            >
              <Sparkles className="size-4" />
              {intl.formatMessage({
                id: generating ? "settings.soul.generating" : "settings.soul.autoGenerate",
              })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || saving}
              onClick={handleRestoreDefaults}
              data-testid={`soul-restore-defaults-${scope}`}
            >
              <Undo2 className="size-4" />
              {intl.formatMessage({ id: "settings.soul.restoreDefaults" })}
            </Button>
            {dirty ? (
              <span className="text-ui-base text-foreground-subtle">
                {intl.formatMessage({ id: "settings.soul.unsaved" })}
              </span>
            ) : null}
          </div>
        </div>
      </SettingsGroupCard>
    </div>
  );
}
