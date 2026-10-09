import { loadBootstrapModule } from "./bootstrap-loader.js";
export async function listCustomCommandsForTui(deps) {
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd)();
    if (deps.listCustomCommands) {
        return await deps.listCustomCommands({ env, logger: deps.logger, workingDirectory });
    }
    const bootstrap = await loadBootstrapModule();
    return await bootstrap.listMesaCodeCustomCommands({ env, logger: deps.logger, workingDirectory });
}
export async function loadCustomCommandForTui(deps, name) {
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd)();
    if (deps.loadCustomCommand) {
        return await deps.loadCustomCommand({ env, logger: deps.logger, name, workingDirectory });
    }
    const bootstrap = await loadBootstrapModule();
    return await bootstrap.loadMesaCodeCustomCommand({
        env,
        logger: deps.logger,
        name,
        workingDirectory,
    });
}
export async function listSkillsForTui(deps) {
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd)();
    const listMesaCodeSkillsForTui = deps.listSkills ?? (await loadBootstrapModule()).listMesaCodeSkills;
    return await listMesaCodeSkillsForTui({
        env,
        logger: deps.logger,
        workingDirectory,
    });
}
export async function listSessionsForTui(deps) {
    const env = deps.env ?? process.env;
    const workingDirectory = (deps.cwd ?? process.cwd)();
    const listMesaCodeSessionsForTui = deps.listSessions ?? (await loadBootstrapModule()).listMesaCodeSessions;
    const sessions = await listMesaCodeSessionsForTui({
        directory: workingDirectory,
        env,
        limit: 50,
    });
    return sessions.map((session) => ({
        directory: session.directory,
        id: session.id,
        parentId: session.parentID,
        title: session.title,
        updatedAt: session.time.updated,
    }));
}
export async function loadInitialTuiSessionMetadata(promptHandler) {
    try {
        return (await promptHandler.getSessionMetadata?.()) ?? {};
    }
    catch (error) {
        if (isStartupGateError(error)) {
            throw error;
        }
        return {};
    }
}
function isStartupGateError(error) {
    if (!(error instanceof Error))
        return false;
    return error.name === "SqliteSessionMigrationError";
}
