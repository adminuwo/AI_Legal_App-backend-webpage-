/**
 * IntentSuggestionBanner
 * A non-intrusive suggestion strip that appears above the chat send button
 * when the intent classifier detects a Magic Tool can handle the user's prompt.
 *
 * Design: Compact pill with tool emoji + name + credit cost + Yes/Dismiss actions.
 * Auto-dismisses after 8 seconds if user doesn't interact.
 */

import React, { useEffect, useRef, useState } from 'react';
import { formatCreditCost } from '../services/intentService.js';

// Tool emoji map for visual identity
const TOOL_EMOJI = {
    text_to_image: '🖼️',
    image_edit: '🎨',
    text_to_video: '🎬',
    image_to_video: '🎞️',
    text_to_audio: '🔊',
    web_search: '🔍',
    deep_search: '🔬',
    code_writer: '💻',
    file_analysis: '📄',
    file_conversion: '🔄',
    knowledge_base: '🧠',
    normal_chat: '💬'
};

const TOOL_LABELS = {
    text_to_image: 'Image Generation',
    image_edit: 'Image Editor',
    text_to_video: 'Video Generation',
    image_to_video: 'Image to Video',
    text_to_audio: 'Text to Audio',
    web_search: 'Web Search',
    deep_search: 'Deep Research',
    code_writer: 'Code Writer',
    file_analysis: 'Document Intelligence',
    file_conversion: 'Document Converter',
    knowledge_base: 'Knowledge Base',
    normal_chat: 'Chat'
};

const AUTO_DISMISS_MS = 8000;

/**
 * @param {Object} props
 * @param {Object|null} props.suggestion - The classification result from detectIntent()
 *   { intent, tools, frontend_mode, confidence, estimated_credits, metadata }
 * @param {Function} props.onAccept - Called when user clicks "Switch" — activates the tool
 * @param {Function} props.onDismiss - Called when user dismisses — clears suggestion
 * @param {boolean} props.isDarkMode - For theming
 */
const IntentSuggestionBanner = ({ suggestion, onAccept, onDismiss, isDarkMode = false }) => {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(AUTO_DISMISS_MS / 1000);
    const dismissTimer = useRef(null);
    const countdownTimer = useRef(null);

    // Show banner when a new valid suggestion arrives
    useEffect(() => {
        if (suggestion && suggestion.intent && suggestion.intent !== 'normal_chat' && suggestion.intent !== 'uncertain') {
            setVisible(true);
            setExiting(false);
            setTimeLeft(AUTO_DISMISS_MS / 1000);

            // Auto-dismiss after timeout
            clearTimeout(dismissTimer.current);
            clearInterval(countdownTimer.current);

            dismissTimer.current = setTimeout(() => {
                handleDismiss();
            }, AUTO_DISMISS_MS);

            // Countdown ticker
            countdownTimer.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownTimer.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setVisible(false);
        }

        return () => {
            clearTimeout(dismissTimer.current);
            clearInterval(countdownTimer.current);
        };
    }, [suggestion]);

    const handleDismiss = () => {
        setExiting(true);
        clearTimeout(dismissTimer.current);
        clearInterval(countdownTimer.current);
        setTimeout(() => {
            setVisible(false);
            setExiting(false);
            onDismiss?.();
        }, 300);
    };

    const handleAccept = () => {
        clearTimeout(dismissTimer.current);
        clearInterval(countdownTimer.current);
        setExiting(true);
        setTimeout(() => {
            setVisible(false);
            setExiting(false);
            onAccept?.(suggestion);
        }, 200);
    };

    if (!visible || !suggestion) return null;

    const primaryTool = suggestion.tools?.[0] || suggestion.intent || 'normal_chat';
    const isMultiTool = suggestion.tools?.length > 1;
    const emoji = TOOL_EMOJI[primaryTool] || '🔧';
    const toolLabel = TOOL_LABELS[primaryTool] || primaryTool;
    const creditCost = suggestion.estimated_credits || 0;
    const isPipeline = isMultiTool;

    // Pipeline label e.g. "Video + Audio"
    const pipelineLabel = isMultiTool
        ? suggestion.tools.slice(0, 2).map(t => TOOL_LABELS[t] || t).join(' + ')
        : toolLabel;

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                marginBottom: '6px',
                animation: exiting
                    ? 'intentBannerSlideOut 0.3s ease-in forwards'
                    : 'intentBannerSlideIn 0.35s cubic-bezier(0.34, 1.2, 0.64, 1) forwards',
                zIndex: 10
            }}
        >
            <style>{`
                @keyframes intentBannerSlideIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes intentBannerSlideOut {
                    from { opacity: 1; transform: translateY(0) scale(1); }
                    to   { opacity: 0; transform: translateY(6px) scale(0.96); }
                }
                .intent-banner-accept:hover {
                    filter: brightness(1.15) !important;
                    transform: scale(1.03) !important;
                }
                .intent-banner-dismiss:hover {
                    opacity: 0.7 !important;
                }
            `}</style>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    borderRadius: '24px',
                    background: isDarkMode
                        ? 'rgba(139, 92, 246, 0.12)'
                        : 'rgba(124, 58, 237, 0.07)',
                    border: `1px solid ${isDarkMode ? 'rgba(139,92,246,0.35)' : 'rgba(124,58,237,0.22)'}`,
                    backdropFilter: 'blur(8px)',
                    boxShadow: isDarkMode
                        ? '0 2px 16px rgba(139,92,246,0.15)'
                        : '0 2px 12px rgba(124,58,237,0.10)',
                    fontSize: '13px',
                    flexWrap: 'wrap'
                }}
            >
                {/* Magic wand icon */}
                <span style={{ fontSize: '15px', flexShrink: 0 }}>🪄</span>

                {/* Tool suggestion text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                        color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        fontWeight: 400
                    }}>
                        Looks like you want to use{' '}
                    </span>
                    <span style={{
                        color: isDarkMode ? '#c4b5fd' : '#7c3aed',
                        fontWeight: 600
                    }}>
                        {emoji} {pipelineLabel}
                    </span>
                    {isPipeline && (
                        <span style={{
                            marginLeft: '6px',
                            fontSize: '11px',
                            background: isDarkMode ? 'rgba(139,92,246,0.25)' : 'rgba(124,58,237,0.15)',
                            color: isDarkMode ? '#c4b5fd' : '#7c3aed',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontWeight: 500
                        }}>
                            Pipeline
                        </span>
                    )}
                    {creditCost > 0 && (
                        <span style={{
                            marginLeft: '6px',
                            fontSize: '11px',
                            color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                        }}>
                            · {formatCreditCost(creditCost)}
                        </span>
                    )}
                </div>

                {/* Auto-dismiss countdown ring (subtle) */}
                <span style={{
                    fontSize: '11px',
                    color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    flexShrink: 0,
                    minWidth: '16px',
                    textAlign: 'center'
                }}>
                    {timeLeft}s
                </span>

                {/* Accept button */}
                <button
                    className="intent-banner-accept"
                    onClick={handleAccept}
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '5px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'filter 0.15s, transform 0.15s',
                        boxShadow: '0 1px 6px rgba(124,58,237,0.3)'
                    }}
                >
                    Switch ✓
                </button>

                {/* Dismiss button */}
                <button
                    className="intent-banner-dismiss"
                    onClick={handleDismiss}
                    title="Keep chat mode"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
                        fontSize: '16px',
                        lineHeight: 1,
                        padding: '2px 4px',
                        transition: 'opacity 0.15s',
                        flexShrink: 0
                    }}
                >
                    ×
                </button>
            </div>

            {/* Clarification variant */}
            {suggestion.requiresClarification && suggestion.clarification_question && (
                <div style={{
                    marginTop: '6px',
                    padding: '8px 14px',
                    borderRadius: '16px',
                    background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    fontSize: '13px',
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)'
                }}>
                    💡 {suggestion.clarification_question}
                </div>
            )}
        </div>
    );
};

export default IntentSuggestionBanner;
