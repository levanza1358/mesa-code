import { getMesaCodeCopy } from "@mesa-code/i18n";
export function loginRequiredResponse(locale) {
    const copy = getMesaCodeCopy(locale).tui.loginRequired;
    return [copy.message, copy.help].join("\n");
}
/** Registry already applies provider/account availability, including personal providers. */
export function createTuiModelAvailabilityChecker(getApp) {
    return async () => {
        const app = await getApp();
        return ((await app.listModels?.()) ?? []).some((model) => !model.disabledReason);
    };
}
