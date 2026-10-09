import {
  extractAssistantDirectives,
  findAssistantDirectivePrefixStart,
  findMarkdownCodeRanges,
  findUnclosedAssistantDirectiveStart,
} from "@/lib/assistantDirectiveParser.js";

type MesaCodeFileCitationPreviewKind = "docx" | "xlsx" | "pptx" | "pdf" | "video" | "audio";

interface MesaCodeFileCitation {
  artifactKind?: string;
  end: number;
  path: string;
  purpose?: string;
  raw: string;
  start: number;
}

interface MesaCodeFileCitationDirective {
  artifactKind?: string;
  end: number;
  path?: string;
  purpose?: string;
  raw: string;
  start: number;
}

interface MesaCodeFileCitationProjection {
  visibleText: string;
}

const ARTIFACT_KIND_TO_PREVIEW_KIND: Readonly<
  Record<string, Exclude<MesaCodeFileCitationPreviewKind, "pdf">>
> = {
  audio: "audio",
  document: "docx",
  presentation: "pptx",
  video: "video",
  workbook: "xlsx",
};
const PREVIEW_EXTENSION_TO_KIND: Readonly<Record<string, MesaCodeFileCitationPreviewKind>> = {
  ".docx": "docx",
  ".flac": "audio",
  ".m4a": "audio",
  ".m4v": "video",
  ".mov": "video",
  ".mp3": "audio",
  ".mp4": "video",
  ".ogg": "audio",
  ".opus": "audio",
  ".pdf": "pdf",
  ".pptx": "pptx",
  ".xlsx": "xlsx",
  ".wav": "audio",
  ".webm": "video",
  ".weba": "audio",
};
const MESA_CODE_FILE_CITATION_DIRECTIVE_NAME = "mesa-code-file-citation";
const MESA_CODE_FILE_CITATION_SINGLE_COLON_PREFIX_LENGTH = ":mesa-code".length;
const MESA_CODE_FILE_CITATION_SYNTAX = {
  allowSingleColon: true,
  allowSmartQuotes: true,
  allowTripleColon: true,
} as const;

export function extractMesaCodeFileCitationDirectives(content: string): MesaCodeFileCitationDirective[] {
  return extractAssistantDirectives(
    content,
    MESA_CODE_FILE_CITATION_DIRECTIVE_NAME,
    MESA_CODE_FILE_CITATION_SYNTAX,
  ).map((directive) => ({
    start: directive.start,
    end: directive.end,
    raw: directive.raw,
    ...(directive.parameters?.path?.trim() ? { path: directive.parameters.path.trim() } : {}),
    ...(directive.parameters?.purpose !== undefined
      ? { purpose: directive.parameters.purpose }
      : {}),
    ...(directive.parameters?.artifact_kind !== undefined
      ? { artifactKind: directive.parameters.artifact_kind }
      : {}),
  }));
}

export function extractMesaCodeFileCitations(content: string): MesaCodeFileCitation[] {
  return extractMesaCodeFileCitationDirectives(content).flatMap((directive) =>
    directive.path
      ? [
          {
            ...directive,
            path: directive.path,
          },
        ]
      : [],
  );
}

/**
 * 仅在流式尾部隐藏未闭合 citation。完整 citation 继续交给 remark 插件投影为正文链接，
 * 卡片是否生成仍由终态 row gate 决定。异常模型输出若已换行继续正文，则保留原文，避免
 * 一个缺失 `}` 的指令把后续回答全部吞掉；代码块中的协议样例也不参与隐藏。
 */
export function projectMesaCodeFileCitations(
  content: string,
  options: { streaming: boolean },
): MesaCodeFileCitationProjection {
  if (!options.streaming || !content) return { visibleText: content };

  const protectedRanges = findMarkdownCodeRanges(content);
  const unclosedStart = findUnclosedAssistantDirectiveStart(
    content,
    MESA_CODE_FILE_CITATION_DIRECTIVE_NAME,
    protectedRanges,
    MESA_CODE_FILE_CITATION_SYNTAX,
  );
  if (unclosedStart === null) {
    const prefixStart = findAssistantDirectivePrefixStart(
      content,
      ["code-comment", MESA_CODE_FILE_CITATION_DIRECTIVE_NAME],
      protectedRanges,
      {
        minimumSingleColonPrefixLength: MESA_CODE_FILE_CITATION_SINGLE_COLON_PREFIX_LENGTH,
        singleColonDirectiveNames: [MESA_CODE_FILE_CITATION_DIRECTIVE_NAME],
        tripleColonDirectiveNames: [MESA_CODE_FILE_CITATION_DIRECTIVE_NAME],
      },
    );
    return prefixStart === null
      ? { visibleText: content }
      : { visibleText: content.slice(0, prefixStart) };
  }

  return {
    visibleText: content.slice(0, unclosedStart),
  };
}

function inferPreviewKindFromPath(path: string): MesaCodeFileCitationPreviewKind | null {
  const normalizedPath = path.trim().toLowerCase();
  for (const [extension, kind] of Object.entries(PREVIEW_EXTENSION_TO_KIND)) {
    if (normalizedPath.endsWith(extension)) return kind;
  }
  return null;
}

export function resolveMesaCodeFileCitationPreviewKind(params: {
  artifactKind?: string;
  path: string;
}): MesaCodeFileCitationPreviewKind | null {
  const inferredKind = inferPreviewKindFromPath(params.path);
  if (params.artifactKind === undefined) return inferredKind;

  const artifactKind = ARTIFACT_KIND_TO_PREVIEW_KIND[params.artifactKind.trim().toLowerCase()];
  return artifactKind && artifactKind === inferredKind ? artifactKind : null;
}
