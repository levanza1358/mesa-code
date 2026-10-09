export const CLI_COMMAND_NAME = "mesa-code";
export const CLI_PROCESS_NAME = "mesa-code-cli";
export const setCliProcessTitle = (target = process) => {
    target.title = CLI_PROCESS_NAME;
};
