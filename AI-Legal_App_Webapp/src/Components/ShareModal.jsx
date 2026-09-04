import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X, Copy, Check, MessageCircle, Mail, Send, Share2, Globe, Link as LinkIcon, Loader2, SendHorizontal, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { apis } from '../types';
import { copyText } from '../utils/clipboard';

const ShareModal = ({ isOpen, onClose, shareId, sessionTitle, sessionId }) => {
  const [copied, setCopied] = useState(false);
  const [isEmailFormOpen, setIsEmailFormOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const shareLink = `${window.location.origin}/share/${shareId}`;

  const handleCopy = () => {
    copyText(shareLink).catch(() => {});
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    if (!targetEmail) return toast.error("Please enter an email address");
    if (!targetEmail.includes('@')) return toast.error("Please enter a valid email");

    setIsSendingEmail(true);
    const t = toast.loading("Sending share link...");

    try {
      await axios.post(apis.shareEmail(sessionId), {
        targetEmail,
        shareLink,
        title: sessionTitle
      });
      toast.dismiss(t);
      toast.success("Email sent successfully! ✨", { icon: '📧' });
      setTargetEmail('');
      setIsEmailFormOpen(false);
    } catch (err) {
      toast.dismiss(t);
      console.error("[EMAIL SHARE ERROR]", err);
      toast.error(err.response?.data?.error || "Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.503-2.961-2.617-.087-.114-.708-.941-.708-1.792s.448-1.273.607-1.446c.159-.173.346-.217.462-.217s.231.006.332.009c.109.004.254-.041.399.305.144.347.491 1.197.535 1.284.044.087.073.188.014.305-.058.116-.087.188-.173.289l-.26.307c-.088.102-.18.212-.077.39.103.179.458.753.985 1.222.677.602 1.248.789 1.428.87.18.081.286.069.393-.052.107-.121.456-.53.578-.711.121-.181.243-.151.409-.091.164.06.1.488 1.042.929s1.579.467 1.83.58c.21.094.354.144.436.257.082.113.082.653-.062 1.058z" />
          <path d="M12.031 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 21.844c-1.831 0-3.618-.488-5.187-1.413l-3.708.974 1.002-3.615c-1.016-1.637-1.551-3.524-1.55-5.36 0-5.753 4.681-10.434 10.437-10.434 5.755 0 10.436 4.681 10.436 10.434 0 5.753-4.681 10.434-10.43 10.434z" />
        </svg>
      ),
      color: 'bg-[#25D366]',
      action: () => {
        const text = `Check out this chat on AI LEGAL™: ${sessionTitle}\n\n${shareLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    },
    {
      name: 'Email',
      icon: <Mail className="w-5 h-5" />,
      color: 'bg-blue-500',
      action: () => {
        setIsEmailFormOpen(true);
      }
    },
    {
      name: 'Telegram',
      icon: <Send className="w-5 h-5" />,
      color: 'bg-[#0088cc]',
      action: () => {
        const text = `Check out this chat on AI LEGAL™: ${sessionTitle}`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`, '_blank');
      }
    }
  ];

  const handleModalClose = () => {
    setIsEmailFormOpen(false);
    setTargetEmail('');
    onClose();
  };

  return (
    <Transition grow show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={handleModalClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white dark:bg-[#171717] p-6 text-left shadow-2xl transition-all border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-bold text-slate-900 dark:text-white">
                        {isEmailFormOpen ? 'Share via Email' : 'Share Chat'}
                      </Dialog.Title>
                      <p className="text-xs text-subtext font-medium">
                        {isEmailFormOpen ? 'Send the link directly to an inbox' : 'Anyone with this link can view the chat'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleModalClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-subtext"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Share Link Input */}
                  {!isEmailFormOpen && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1 text-center block">
                        Shareable Link
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <LinkIcon className="h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          className="block w-full pl-10 pr-24 py-3.5 bg-slate-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-maintext focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                        />
                        <button
                          onClick={handleCopy}
                          className={`absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm ${copied
                              ? 'bg-green-500 text-white'
                              : 'bg-primary text-white hover:opacity-90 active:scale-95'
                            }`}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Integrated Email Form */}
                  {isEmailFormOpen ? (
                    <div className="space-y-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-subtext ml-1">
                          Recipient Email
                        </label>
                        <form onSubmit={handleSendEmail} className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
                          </div>
                          <input
                            type="email"
                            autoFocus
                            placeholder="friend@example.com"
                            value={targetEmail}
                            onChange={(e) => setTargetEmail(e.target.value)}
                            className="block w-full pl-10 pr-12 py-3.5 bg-slate-50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm text-maintext focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                          />
                          <button
                            type="submit"
                            disabled={isSendingEmail || !targetEmail}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center ${isSendingEmail || !targetEmail
                                ? 'bg-slate-200 dark:bg-white/10 text-subtext cursor-not-allowed'
                                : 'bg-primary text-white hover:opacity-90 active:scale-95 shadow-md shadow-primary/20'
                              }`}
                          >
                            {isSendingEmail ? <Loader2 size={16} className="animate-spin text-primary" /> : <SendHorizontal size={16} />}
                          </button>
                        </form>
                      </div>
                      <button
                        onClick={() => setIsEmailFormOpen(false)}
                        className="w-full py-2 text-[10px] font-bold text-subtext uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        Back to share options
                      </button>
                    </div>
                  ) : (
                    /* Social Share Options */
                    <div className="space-y-4 pt-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-subtext text-center">
                        Or share via
                      </p>
                      <div className="flex items-center justify-center gap-6">
                        {shareOptions.map((option) => (
                          <button
                            key={option.name}
                            onClick={option.action}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div className={`w-12 h-12 ${option.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-all group-hover:scale-110 group-active:scale-95 group-hover:rotate-3`}>
                              {option.icon}
                            </div>
                            <span className="text-[10px] font-bold text-subtext uppercase tracking-wider group-hover:text-maintext transition-colors text-center">
                              {option.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Note */}
                  <div className="bg-primary/5 rounded-2xl p-4 flex items-start gap-3 border border-primary/10">
                    <Globe className="w-5 h-5 text-primary shrink-0" />
                    <p className="text-xs text-subtext leading-relaxed">
                      All messages in this conversation up to the moment you shared it will be visible to whoever has the link. Your account information is <b>never</b> shared.
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ShareModal;
