function tokens(colors: {
  bg: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  ok: string;
  string: string;
  constant: string;
  punctuation: string;
}) {
  return [
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: colors.muted, fontStyle: "italic" },
    },
    {
      scope: [
        "keyword",
        "storage",
        "storage.type",
        "keyword.operator.expression",
        "keyword.control",
      ],
      settings: { foreground: colors.muted },
    },
    {
      scope: ["string", "string.quoted", "punctuation.definition.string"],
      settings: { foreground: colors.string },
    },
    {
      scope: ["constant.numeric", "constant.language", "support.constant"],
      settings: { foreground: colors.constant },
    },
    {
      scope: [
        "entity.name.function",
        "support.function",
        "meta.function-call entity.name.function",
      ],
      settings: { foreground: colors.accent },
    },
    {
      scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"],
      settings: { foreground: colors.fg },
    },
    {
      scope: ["variable", "variable.other", "meta.object-literal.key"],
      settings: { foreground: colors.fg },
    },
    {
      scope: ["punctuation", "keyword.operator", "meta.brace"],
      settings: { foreground: colors.punctuation },
    },
    {
      scope: ["entity.name.tag", "punctuation.definition.tag"],
      settings: { foreground: colors.fg },
    },
    { scope: ["entity.other.attribute-name"], settings: { foreground: colors.muted } },
    { scope: ["markup.heading"], settings: { foreground: colors.fg, fontStyle: "bold" } },
    {
      scope: ["variable.parameter", "variable.other.readwrite"],
      settings: { foreground: colors.fg },
    },
  ];
}

const codeThemeDark = {
  name: "mono-dark",
  type: "dark",
  colors: { "editor.background": "#111111", "editor.foreground": "#ededed" },
  settings: tokens({
    bg: "#111111",
    fg: "#ededed",
    muted: "#8a8a8a",
    line: "#262626",
    accent: "#fe5101",
    ok: "#54f2b3",
    string: "#86e1c0",
    constant: "#f5b544",
    punctuation: "#5f5f5f",
  }),
} as const;

const codeThemeLight = {
  name: "mono-light",
  type: "light",
  colors: { "editor.background": "#ffffff", "editor.foreground": "#0a0a0a" },
  settings: tokens({
    bg: "#ffffff",
    fg: "#0a0a0a",
    muted: "#6b6b6b",
    line: "#d9d9d9",
    accent: "#fe5101",
    ok: "#1fae78",
    string: "#0f7a54",
    constant: "#b7791f",
    punctuation: "#9a9a9a",
  }),
} as const;

export const codeThemes = { light: codeThemeLight, dark: codeThemeDark };
