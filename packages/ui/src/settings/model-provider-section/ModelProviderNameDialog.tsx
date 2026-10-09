import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Input } from "@/components/ui/input.js";
import { useMesaCodeIntl } from "@/i18n/IntlProvider.js";

/**
 * Collects a provider name before creating a custom provider.
 *
 * Add provider used to create the provider immediately with a placeholder name.
 * The name is the first thing the user has to edit anyway, so ask for it up
 * front and only create once a non-empty name is submitted.
 */
export function ModelProviderNameDialog({
  open,
  submitting = false,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  submitting?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (providerName: string) => void;
}) {
  const { intl } = useMesaCodeIntl();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      // 对话框内容挂载后聚焦输入框，让键盘用户可以立即输入名称。
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const trimmed = name.trim();
  const submit = () => {
    if (trimmed.length === 0 || submitting) return;
    onSubmit(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-model-provider-name-dialog="true">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: "settings.modelProvider.addProviderAction" })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage({ id: "settings.modelProvider.providerNameDescription" })}
          </DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={name}
          disabled={submitting}
          placeholder={intl.formatMessage({ id: "settings.modelProvider.newProviderName" })}
          aria-label={intl.formatMessage({ id: "settings.modelProvider.providerNameLabel" })}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>
            {intl.formatMessage({ id: "settings.modelProvider.cancel" })}
          </Button>
          <Button
            type="button"
            disabled={trimmed.length === 0 || submitting}
            onClick={submit}
            data-model-provider-name-submit="true"
          >
            {intl.formatMessage({ id: "settings.modelProvider.createCustomProvider" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
