export const CLI_COMMAND_NAME = "mesa-code";
export const CLI_PROCESS_NAME = "mesa-code-cli";

interface ProcessTitleTarget {
  title: string;
}

export const setCliProcessTitle = (
  target: ProcessTitleTarget = process,
): void => {
  target.title = CLI_PROCESS_NAME;
};
