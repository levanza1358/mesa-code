let bootstrapModulePromise;
export const loadBootstrapModule = () => {
    bootstrapModulePromise ??= import("@mesa-code/bootstrap");
    return bootstrapModulePromise;
};
