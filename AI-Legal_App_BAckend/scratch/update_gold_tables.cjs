const fs = require('fs');
const path = require('path');

const files = [
  'd:/AI Legal/AI_Legal_App-backend-webpage-/AI-Legal_App_Webapp/src/pages/Workspace/LegalWorkspace.jsx',
  'd:/AI Legal/AI_Legal_App-backend-webpage-/AI-Legal_App_Webapp/src/pages/Chat.jsx',
  'd:/AI Legal/AI_Legal_App-backend-webpage-/AI-Legal_App_Webapp/src/pages/SharedChat.jsx'
];

const targetPattern = /thead:\s*\(\{\s*children\s*\}\)\s*=>\s*<thead className="bg-primary\/10 border-b border-border\/50">\{children\}<\/thead>,\s*tbody:\s*\(\{\s*children\s*\}\)\s*=>\s*<tbody className="divide-y divide-border\/30">\{children\}<\/tbody>,\s*tr:\s*\(\{\s*children\s*\}\)\s*=>\s*<tr className="transition-colors hover:bg-white\/3">\{children\}<\/tr>,\s*th:\s*\(\{\s*children\s*\}\)\s*=>\s*<th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-primary">\{children\}<\/th>,\s*td:\s*\(\{\s*children\s*\}\)\s*=>\s*<td className="px-4 py-3 text-sm text-maintext leading-relaxed">\{children\}<\/td>,\s*mark:\s*\(\{\s*children\s*\}\)\s*=>\s*<mark className="bg-\[#5555ff\] text-white px-1 py-0\.5 rounded-sm">\{children\}<\/mark>/g;

const replacement = `thead: ({ children }) => <thead className="bg-[#C8A34D]/15 dark:bg-[#C8A34D]/20 border-b border-[#C8A34D]/30">{children}</thead>,
                                                    tbody: ({ children }) => <tbody className="divide-y divide-[#C8A34D]/15 dark:divide-[#C8A34D]/10">{children}</tbody>,
                                                    tr: ({ children }) => <tr className="transition-colors hover:bg-[#C8A34D]/[0.04]">{children}</tr>,
                                                    th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-[#B88B2A] dark:text-[#E2C275]">{children}</th>,
                                                    td: ({ children }) => <td className="px-4 py-3 text-sm text-maintext leading-relaxed">{children}</td>,
                                                    mark: ({ children }) => <mark className="bg-[#C8A34D]/25 text-[#B88B2A] dark:text-[#E2C275] px-1 py-0.5 rounded-sm">{children}</mark>`;

for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    const matched = targetPattern.test(content);
    console.log(`${f} matched pattern: ${matched}`);
    if (matched) {
      content = content.replace(targetPattern, replacement);
      // Also update table container border to gold
      content = content.replace(
        'border-border/50 shadow-sm bg-surface/30',
        'border-[#C8A34D]/30 dark:border-[#C8A34D]/20 shadow-sm bg-[#C8A34D]/[0.02] dark:bg-[#C8A34D]/[0.03]'
      );
      content = content.replace(
        'border-border/50 shadow-lg bg-surface/30 backdrop-blur-sm',
        'border-[#C8A34D]/30 dark:border-[#C8A34D]/20 shadow-lg bg-[#C8A34D]/[0.02] dark:bg-[#C8A34D]/[0.03] backdrop-blur-sm'
      );
      fs.writeFileSync(f, content, 'utf8');
      console.log(`Updated ${f}`);
    }
  }
}
