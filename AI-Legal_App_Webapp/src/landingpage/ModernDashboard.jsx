import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  FileText,
  Library,
  MessageSquare,
  Paperclip,
  Mic,
  Send,
  Sparkles
} from 'lucide-react';

const ModernDashboard = ({
  inputValue,
  setInputValue,
  handleSendMessage,
  activateTool,
  uploadInputRef,
  handleVoiceInput,
  isListening
}) => {
  const navigate = useNavigate();

  // Suggested prompts/chips
  const chips = [
    { label: "Draft Notice", text: "Draft a legal notice for..." },
    { label: "Research Law", text: "Research the law regarding..." },
    { label: "Analyze Contract", text: "Analyze this contract for..." },
    { label: "Find Case Law", text: "Find landmark Supreme Court precedents on..." },
    { label: "Summarize Documents", text: "Summarize the uploaded legal document..." }
  ];



  return (
    <div className="w-full bg-[#FFFFFF] min-h-full text-[#111827] flex flex-col font-sans select-text justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-3xl flex flex-col items-center space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight flex items-center justify-center gap-2">
            <span>⚖️ AI Legal Assistant</span>
          </h1>
          <p className="text-sm text-[#6B7280] font-medium max-w-md mx-auto leading-relaxed">
            Your AI-powered legal assistant for research, drafting, evidence analysis, and case intelligence.
          </p>
        </div>

        {/* AI Command Input Card */}
        <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:border-[#6D5DFC]/30 focus-within:border-[#6D5DFC] focus-within:shadow-md transition-all duration-300">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(e);
            }}
            className="flex flex-col"
          >
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Ask anything about your legal matter..."
              className="w-full min-h-[220px] outline-none text-[#111827] placeholder-[#9CA3AF] bg-transparent resize-none text-base border-0 focus:ring-0 p-0"
            />
            
            <div className="flex items-center justify-between pt-3 border-t border-[#F3F4F6] mt-3">
              {/* Attachment & Voice Group */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => uploadInputRef?.current?.click()}
                  className="p-2.5 hover:bg-[#F3F4F6] rounded-xl text-[#6B7280] hover:text-[#6D5DFC] transition-colors border border-transparent hover:border-[#E5E7EB]"
                  title="Attach File"
                >
                  <Paperclip className="w-4.5 h-4.5" />
                </button>

                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`p-2.5 rounded-xl transition-all border border-transparent ${
                    isListening
                      ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                      : 'hover:bg-[#F3F4F6] text-[#6B7280] hover:text-[#6D5DFC] hover:border-[#E5E7EB]'
                  }`}
                  title="Voice Input"
                >
                  <Mic className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Submit Group */}
              <button
                type="submit"
                disabled={!inputValue?.trim()}
                className="px-5 py-2.5 bg-[#6D5DFC] hover:bg-[#5b4edb] disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Suggested Prompts / Chips */}
        <div className="flex flex-wrap justify-center gap-2 w-full max-w-2xl">
          {chips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputValue(chip.text)}
              className="px-3.5 py-1.5 bg-[#F9FAFB] hover:bg-[#F3F4F6] text-xs font-semibold text-[#374151] rounded-lg border border-[#E5E7EB] transition-all cursor-pointer hover:border-[#6D5DFC]/30"
            >
              {chip.label}
            </button>
          ))}
        </div>



      </div>
    </div>
  );
};

export default ModernDashboard;
