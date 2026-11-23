const { compile } = require("@tailwindcss/node");
const { Scanner } = require("@tailwindcss/oxide");
const fs = require("fs");
const path = require("path");

async function buildCSS() {
  try {
    const rootDir = path.resolve(__dirname, "..");
    const appDir = path.join(rootDir, "app");
    const componentsDir = path.join(rootDir, "components");
    const contextDir = path.join(rootDir, "context");

    const sources = [
      { base: appDir, pattern: "**/*.{ts,tsx,js,jsx,html}", negated: false },
      { base: componentsDir, pattern: "**/*.{ts,tsx,js,jsx,html}", negated: false },
      { base: contextDir, pattern: "**/*.{ts,tsx,js,jsx,html}", negated: false },
    ];

    const scanner = new Scanner({ sources });
    const candidates = new Set(scanner.scan());

    // Explicitly add any dynamic/safelist classes needed
    const extraCandidates = [
      "dark",
      "h-full",
      "h-screen",
      "w-full",
      "overflow-hidden",
      "overflow-y-auto",
      "bg-zinc-950",
      "bg-zinc-900",
      "bg-zinc-800",
      "text-zinc-100",
      "text-zinc-200",
      "text-zinc-300",
      "text-zinc-400",
      "text-zinc-500",
      "border-zinc-800",
      "border-zinc-700",
      "animate-pulse",
      "animate-ping"
    ];

    extraCandidates.forEach((c) => candidates.add(c));

    const baseTailwind = `@import "tailwindcss";`;
    const compiler = await compile(baseTailwind, {
      base: rootDir,
      onDependency: () => {},
    });

    const compiledTailwind = compiler.build(Array.from(candidates));

    const customStyles = `
/* Custom Scrollbars */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(113, 113, 122, 0.3);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(113, 113, 122, 0.6);
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

    const finalCSS = `${compiledTailwind}\n\n${customStyles}`;
    const targetFile = path.join(appDir, "globals.css");
    fs.writeFileSync(targetFile, finalCSS, "utf-8");

    console.log(`[build:css] Successfully generated ${targetFile} (${finalCSS.length} bytes, ${candidates.size} candidates).`);
  } catch (err) {
    console.error("[build:css] Error:", err);
    process.exit(1);
  }
}

buildCSS();

