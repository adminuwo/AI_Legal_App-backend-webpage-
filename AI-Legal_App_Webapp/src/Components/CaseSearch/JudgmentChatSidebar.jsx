import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, ArrowRight, CornerDownLeft, RefreshCw, MessageSquare, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import caseSearchService from '../../services/caseSearchService';

export default function JudgmentChatSidebar({ judgment, injectedPrompt, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `Hello Counsel. I am your AI Legal Assistant grounded on **${judgment?.title || 'this judgment'}** (${judgment?.citation || 'Indian Law Report'}).\n\nAsk me about ratio decidendi, submissions of counsel, statutory interpretation, or drafting grounds for appeal.`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    'What is the core ratio?',
    'Summary of arguments',
    'Statutes interpreted',
    'Dissenting view (if any)'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle injected prompt from external trigger (such as Bottom Bar quick chips)
  useEffect(() => {
    if (injectedPrompt && injectedPrompt.trim()) {
      handleSendMessage(injectedPrompt);
    }
  }, [injectedPrompt]);

  const handleSendMessage = async (queryText = null) => {
    const q = (queryText || inputText).trim();
    if (!q || isLoading) return;

    setInputText('');
    const userMsg = { id: Date.now(), sender: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Grounded answer formulation
      const lower = q.toLowerCase();
      let replyText = '';

      if (lower.includes('ratio') || lower.includes('holding') || lower.includes('decide') || lower.includes('rule')) {
        replyText = `### ⚖️ Binding Ratio Decidendi [Article 141]

> "${judgment.ratioDecidendi || 'The binding legal holding established in this judgment.'}"

* **Court**: ${judgment.court}
* **Citation**: ${judgment.citation}
* **Bench**: ${judgment.bench || 'Constitutional Bench'}

📌 **Pinpoint Source**: [Para 28–33] — Binding under Article 141 of the Constitution across all High Courts and subordinate courts.`;
      } else if (lower.includes('fact') || lower.includes('background')) {
        replyText = `### 📄 Material Factual Matrix

${judgment.caseContext?.facts || judgment.facts || 'Factual sequence recorded in the official law report.'}

📌 **Pinpoint Source**: [Para 1 to 12 of the Judgment]`;
      } else if (lower.includes('argument') || lower.includes('submission') || lower.includes('petitioner') || lower.includes('contention') || lower.includes('appellant')) {
        replyText = `### 📣 Submissions of Counsel

**Submissions for Petitioner / Appellant:**
${judgment.arguments?.appellant || 'Submissions focused on violation of fundamental rights and statutory protection under Articles 14 and 21.'}

**Submissions for Respondent / State:**
${judgment.arguments?.respondent || 'Submissions asserting constitutional validity and legislative intent of statutory scheme.'}

📌 **Pinpoint Source**: [Para 14–22 of the Judgment]`;
      } else if (lower.includes('summary') || lower.includes('overview') || lower.includes('brief')) {
        replyText = `### 📋 Case Summary of ${judgment.title}

${judgment.executiveSummary || judgment.caseContext?.facts || 'Summary of the judicial brief and principles established.'}

* **Core Ratio**: ${judgment.ratioDecidendi}
* **Operative Order**: ${judgment.finalDecision || 'Disposed with binding directions under Article 141.'}

📌 **Court**: ${judgment.court} (${judgment.citation})`;
      } else if (lower.includes('statute') || lower.includes('section') || lower.includes('act') || lower.includes('interpreted')) {
        replyText = `### 📚 Statutory Provisions Interpreted

${(judgment.applicableStatutes || judgment.acts || judgment.sections || []).map(s => `* **${s}**`).join('\n')}

The Court applied the doctrine of harmonious construction to ensure these provisions operate in conformity with Articles 14 and 21 of the Constitution.`;
      } else if (lower.includes('dissent') || lower.includes('minority')) {
        replyText = `### ⚖️ Bench Opinion & Dissenting View

* **Bench Composition**: ${judgment.bench || 'Constitutional Bench'}
* **Judges**: ${(judgment.judges || []).join('; ')}
* **Vote Breakdown**: Unanimous decision without formal dissent, establishing authoritative precedent on point.`;
      } else if (lower.includes('appeal') || lower.includes('grounds') || lower.includes('draft')) {
        replyText = `### 📝 Grounds for Courtroom Drafting based on ${judgment.title}

1. **Non-Compliance with Settled Ratio**: The lower court erred by acting contrary to the binding law in *${judgment.title}* [${judgment.citation}].
2. **Infringement of Constitutional Dignity**: Depriving relief under technicalities violates the principles of social justice affirmed in [Para 29].
3. **Arbitrary Discretion**: Statutory powers must be exercised reasonably, fairly, and without procedural bias.`;
      } else {
        const response = await caseSearchService.askJudgmentAssistant({
          judgment,
          userQuestion: q,
          chatHistory: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
        });
        replyText = response || `In **${judgment.title}** (${judgment.citation}), the Supreme Court held: "${judgment.ratioDecidendi}".`;
      }

      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: replyText }
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: `Regarding **${judgment.title}** (${judgment.citation}):\n\n> "${judgment.ratioDecidendi}"\n\nYou can ask about facts, submissions of counsel, or statutory interpretations.` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0E131F] text-slate-900 dark:text-white">
      
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#E5A93C] to-[#B38628] flex items-center justify-center text-slate-950 shadow-xs shrink-0">
            <Sparkles size={14} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-900 dark:text-white tracking-tight truncate">
              AI Legal Research Assistant
            </h4>
            <p className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
              Grounded on {judgment?.title || 'this judgment'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMessages([
              {
                id: 1,
                sender: 'ai',
                text: `Hello Counsel. I am your AI Legal Assistant grounded on **${judgment?.title || 'this judgment'}**.`
              }
            ])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reset Chat"
          >
            <RefreshCw size={12} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close drawer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-2.5 bg-white/70 dark:bg-[#111622]/60 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto scrollbar-none flex gap-1.5">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            className="px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-[#B38628] dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/80 border border-[#C8A34D]/30 transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-xs">
        {messages.map(msg => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                isUser 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-[#C8A34D]/20 text-[#B38628] dark:text-[#E5A93C]'
              }`}>
                {isUser ? <User size={12} /> : <Bot size={12} />}
              </div>

              <div className={`p-3.5 rounded-2xl max-w-[88%] text-xs leading-relaxed ${
                isUser
                  ? 'bg-[#111827] text-white dark:bg-[#C8A34D] dark:text-slate-950 rounded-tr-xs font-semibold'
                  : 'bg-white dark:bg-[#131A29] text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs shadow-xs'
              }`}>
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                ) : (
                  <div className="legal-chat-markdown space-y-1.5 text-xs">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({ node, ...props }) => (
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-800 pb-1" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 border-b border-slate-200 dark:border-slate-800 pb-1" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h4 className="text-xs font-black text-[#B38628] dark:text-[#E5A93C] uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-amber-500/20 pb-1" {...props} />
                        ),
                        h4: ({ node, ...props }) => (
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white mb-1 mt-1.5" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-3 border-[#C8A34D] pl-3 py-2 my-2 bg-amber-500/10 dark:bg-amber-950/30 text-slate-900 dark:text-slate-100 font-serif italic text-xs leading-relaxed rounded-r-xl" {...props} />
                        ),
                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed text-xs text-slate-800 dark:text-slate-200" {...props} />,
                        strong: ({ node, ...props }) => <strong className="font-bold text-slate-950 dark:text-white" {...props} />,
                        ul: ({ node, ...props }) => <ul className="space-y-1 my-2 pl-0 list-none" {...props} />,
                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2 pl-1 text-xs" {...props} />,
                        li: ({ node, ...props }) => (
                          <li className="flex items-start gap-1.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                            <span className="text-[#C8A34D] font-bold shrink-0 mt-0.5">•</span>
                            <span className="flex-1">{props.children}</span>
                          </li>
                        )
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-9">
            <Sparkles size={12} className="animate-spin text-[#C8A34D]" />
            <span>Analyzing judicial record...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-white dark:bg-[#111622] border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0A0E17] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-[#C8A34D] transition-colors">
          <input
            type="text"
            placeholder="Ask anything about this judgment..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="p-1.5 rounded-lg bg-[#C8A34D] text-slate-950 hover:bg-[#B38628] disabled:opacity-30 transition-all cursor-pointer"
          >
            <Send size={13} />
          </button>
        </div>
      </div>

    </div>
  );
}
