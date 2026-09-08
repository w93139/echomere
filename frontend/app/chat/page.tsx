"use client";

import { Fragment, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  MessageCircle,
  Menu,
  X,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Home,
  ArrowUp,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  LogOut,
  FileText,
  ChevronDown,
} from "lucide-react";
import { BottomDock, BrandLockup, EchoMark } from "@/components/echomere-chrome";

const RECOMMENDED_QUESTIONS = [
  "今年适合换个方向吗",
  "野心与天性是否同路",
  "怎样找回生活节奏",
  "怎样活得更像自己",
  "如何停止反复内耗",
];

const REPORT_QUESTIONS = [
  "请先概括整份报告",
  "解读五行结构与喜忌",
  "解读当前大运阶段",
  "解读事业与方向",
  "我想重点问：",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: string;
  thinkingSummary?: string;
  routeReason?: string;
}

interface Conversation {
  id: string;
  mode: string;
  title: string;
  updatedAt: string;
}

interface ReportChatContext {
  id: string;
  profileName: string;
  title: string;
  status: string;
  content?: unknown;
}

function renderInlineText(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      : <Fragment key={`${part}-${index}`}>{part}</Fragment>
  );
}

function extractThinkingSummary(content: string): string | undefined {
  return content.match(/\[思考摘要[:：]([^\]]+)\]/)?.[1]?.trim();
}

function getVisibleThinkingSteps(message: Message, isStreaming: boolean): string[] {
  const steps = ["理解问题：识别你关注的主题与时间范围"];
  let toolNames: string[] = [];

  if (message.toolCalls) {
    try {
      toolNames = (JSON.parse(message.toolCalls) as Array<{ name?: string }>)
        .map((call) => call.name || "")
        .filter(Boolean);
    } catch {
      toolNames = [];
    }
  }

  if (toolNames.includes("查询命盘")) steps.push("读取命盘：核对日主、五行与原局结构");
  if (toolNames.includes("查询时间流")) steps.push("对照时间：结合当前大运与流年变化");
  if (toolNames.includes("读取深度报告")) steps.push("读取报告：提取你指定部分的关键结论");
  if (toolNames.includes("起卦服务")) steps.push("校验卦象：对照本卦、变卦与动爻关系");

  steps.push(isStreaming ? "组织回答：正在提炼结论、依据与建议" : "完成整理：以结论、依据和行动建议呈现");
  return steps;
}

function ThinkingDisclosure({ message, isStreaming }: { message: Message; isStreaming: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const steps = getVisibleThinkingSteps(message, isStreaming);
  const contentId = `thinking-${message.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  return (
    <section className={`chat-thinking${isStreaming ? " is-active" : ""}`}>
      <button
        type="button"
        className="chat-thinking__toggle"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="chat-thinking__pulse" aria-hidden="true" />
        <span>{isStreaming ? "深度思考中" : "已完成思考"}</span>
        <ChevronDown className={expanded ? "is-expanded" : ""} aria-hidden="true" />
      </button>

      <div id={contentId} className="chat-thinking__body" hidden={!expanded} aria-live="polite">
        <p className="chat-thinking__summary">{message.thinkingSummary}</p>
        <ul className="chat-thinking__steps">
          {steps.map((step, index) => (
            <li key={step} className={index === steps.length - 1 && isStreaming ? "is-current" : ""}>
              <span aria-hidden="true" />
              <p>{step}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ChatMessageContent({ content }: { content: string }) {
  const normalizedContent = content
    .replace(/```(?:markdown)?/gi, "")
    .replace(/\[(?:命盘卡片|思考摘要|工具卡片)[:：][^\]]+\]\s*/g, "")
    .replace(/\s*([一二三四五六七八九十]+、[^：\n]{1,18})[:：]\s*/g, "\n\n## $1\n\n")
    .replace(/\s*依据[:：]\s*/g, "\n\n> 依据：")
    .replace(/\s+(?=命理分析因人而异)/g, "\n\n> ")
    .trim();
  const lines = normalizedContent.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Tag = `h${heading[1].length}` as "h1" | "h2" | "h3";
      blocks.push(<Tag key={`heading-${index}`}>{renderInlineText(heading[2])}</Tag>);
      index += 1;
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      blocks.push(<hr key={`rule-${index}`} />);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quote.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{renderInlineText(quote.join(" "))}</blockquote>);
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}</ul>);
      continue;
    }

    if (/^\d+[.、]\s*/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.、]\s*/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.、]\s*/, ""));
        index += 1;
      }
      blocks.push(<ol key={`ordered-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineText(item)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length && lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index].trim()) &&
      !/^([-*]\s+|\d+[.、]\s*|>\s+|[-*_]{3,}$)/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{renderInlineText(paragraph.join(" "))}</p>);
  }

  return <div className="chat-message-content">{blocks}</div>;
}

function ChatContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("suiyuan");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeProfileName, setActiveProfileName] = useState("");
  const [reportContext, setReportContext] = useState<ReportChatContext | null>(null);
  const [reportContextLoading, setReportContextLoading] = useState(false);
  const [reportContextError, setReportContextError] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchActiveProfileName();
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!pendingDelete) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deletingConversationId) {
        setPendingDelete(null);
        setDeleteError(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingDelete, deletingConversationId]);

  useEffect(() => {
    const q = searchParams.get("question");
    if (!q) {
      sessionStorage.removeItem("_ms_autosend_lock");
      return;
    }
    if (!user) return;
    if (sessionStorage.getItem("_ms_autosend_lock")) return;
    sessionStorage.setItem("_ms_autosend_lock", "1");
    const decoded = decodeURIComponent(q);
    // 清除 URL query，避免刷新重复发送
    router.replace("/chat");
    // 使用 setTimeout 确保 input 已更新且组件已渲染
    setTimeout(() => sendMessage(decoded), 0);
  // `sendMessage` intentionally reads the latest conversation state after the
  // query has been consumed; including it would retrigger the one-shot send.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, router]);

  useEffect(() => {
    const reportId = searchParams.get("reportId");
    if (!reportId || !user) return;

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setReportContextLoading(true);
        setReportContextError("");
        return apiFetch(`/reports/${encodeURIComponent(reportId)}`);
      })
      .then(async (res) => {
        if (!res) return null;
        if (!res.ok) throw new Error("报告读取失败");
        return res.json();
      })
      .then((data: ReportChatContext) => {
        if (cancelled || !data) return;
        setReportContext(data);
        setMode("kanyun");
      })
      .catch(() => {
        if (!cancelled) setReportContextError("这份报告暂时无法读取，请返回报告页重试。");
      })
      .finally(() => {
        if (!cancelled) setReportContextLoading(false);
      });

    return () => { cancelled = true; };
  }, [searchParams, user]);

  async function fetchConversations() {
    const res = await apiFetch("/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data);
    }
  }

  async function fetchActiveProfileName() {
    try {
      const res = await apiFetch("/profile");
      if (!res.ok) return;

      const data = await res.json();
      setActiveProfileName(data.primaryProfile?.name?.trim() || "");
    } catch {
      setActiveProfileName("");
    }
  }

  const loadConversation = async (id: string) => {
    const res = await apiFetch(`/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setCurrentConversationId(data.id);
    setMode(data.mode);
    setMessages(
      data.messages.map((m: Message) => ({
        ...m,
        thinkingSummary: extractThinkingSummary(m.content) || m.thinkingSummary,
        routeReason: m.toolCalls ? extractRouteReason(m.toolCalls) : undefined,
      }))
    );
    setSidebarOpen(false);
  };

  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setMode("suiyuan");
    setReportContext(null);
    setReportContextError("");
    router.replace("/chat");
  };

  const fillRecommendedQuestion = (question: string) => {
    setInput(question);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(question.length, question.length);
    });
  };

  const handleLogout = () => {
    logout();
    window.location.replace("/login");
  };

  const deleteConversation = async () => {
    if (!pendingDelete) return;

    const { id } = pendingDelete;
    setDeletingConversationId(id);
    setDeleteError(null);
    try {
      const res = await apiFetch(`/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json().catch(() => null);
        setDeleteError(result?.error || "删除失败，请稍后重试。");
        return;
      }

      setConversations((current) => current.filter((conversation) => conversation.id !== id));
      if (currentConversationId === id) startNewChat();
      setPendingDelete(null);
    } catch {
      setDeleteError("网络异常，暂时无法删除，请重试。");
    } finally {
      setDeletingConversationId(null);
    }
  };

  const extractRouteReason = (): string | undefined => {
    try {
      return undefined;
    } catch {
      return undefined;
    }
  };

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    setInput("");

    const requestStartedAt = Date.now();
    const userMessage: Message = {
      id: `tmp-${requestStartedAt}`,
      role: "user",
      content: text,
    };
    const assistantMessage: Message = {
      id: `assistant-${requestStartedAt}`,
      role: "assistant",
      content: "",
      thinkingSummary: "正在理解你的问题，并确认需要关注的重点。",
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setStreamingMessageId(assistantMessage.id);

    try {
      const res = await apiFetch("/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          mode,
          message: text,
          conversationId: currentConversationId,
          reportId: reportContext?.id || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        setMessages((prev) => prev.map((message) =>
          message.id === assistantMessage.id
            ? {
                ...message,
                thinkingSummary: undefined,
                content:
                  err.error === "NO_PROFILE"
                    ? "看运需要先建立命盘档案，请先去设置页创建。"
                    : `请求失败：${err.error || "未知错误"}`,
              }
            : message
        ));
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        setMessages((prev) => prev.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, thinkingSummary: undefined, content: "暂时没有收到回答，请重试。" }
            : message
        ));
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const eventLine = block.split("\n").find((l) => l.startsWith("event:"));
          const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5));

          if (event === "meta") {
            setCurrentConversationId(data.conversationId);
            assistantMessage.toolCalls = JSON.stringify(data.toolCalls);
            assistantMessage.routeReason = data.routeReason;
            assistantMessage.thinkingSummary = reportContext
              ? "正在读取这份报告，并提取与你的问题最相关的内容。"
              : "已经理解问题，正在读取相关信息并整理回答结构。";
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...assistantMessage } : m))
            );
            fetchConversations();
          }

          if (event === "chunk") {
            assistantMessage.content += data.content || "";
            const summary = extractThinkingSummary(assistantMessage.content);
            assistantMessage.thinkingSummary = summary || "信息已整理完成，正在生成简洁、清晰的回答。";
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessage.id ? { ...assistantMessage } : m))
            );
          }
        }
      }
    } catch {
      setMessages((prev) => prev.map((message) =>
        message.id === assistantMessage.id
          ? { ...message, thinkingSummary: undefined, content: "网络异常，请重试。" }
          : message
      ));
    } finally {
      setStreamingMessageId(null);
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="chat-page h-screen flex bg-white">
      {/* Sidebar */}
      <aside
        className={`chat-sidebar${sidebarCollapsed ? " is-collapsed" : ""} fixed inset-y-0 left-0 z-40 w-72 bg-stone-50 border-r border-stone-100 transform transition-transform duration-200 md:translate-x-0 md:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="chat-sidebar__brand border-b border-stone-100">
          <BrandLockup />
          <button
            type="button"
            className="chat-sidebar__collapse hidden md:grid"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? "展开左侧导航" : "收起左侧导航"}
            title={sidebarCollapsed ? "展开导航" : "收起导航"}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="chat-sidebar__actions">
          <Button variant="outline" className="chat-sidebar__button w-full justify-start" onClick={() => router.push("/")}>
            <Home className="w-4 h-4" /> <span className="chat-sidebar__label">返回首页</span>
          </Button>
          <Button variant="outline" className="chat-sidebar__button chat-sidebar__logout w-full justify-start" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> <span className="chat-sidebar__label">退出登录</span>
          </Button>
          <Button variant="outline" className="chat-sidebar__button w-full justify-start" onClick={startNewChat}>
            <MessageCircle className="w-4 h-4" /> <span className="chat-sidebar__label">新对话</span>
          </Button>
        </div>

        <div className="chat-sidebar__section-title text-xs font-medium text-stone-400">对话记录</div>
        <div className="chat-sidebar__history overflow-y-auto flex-1 pb-4 space-y-1">
          {conversations.map((c) => (
            <div key={c.id} className="chat-history-item">
              <button
                onClick={() => loadConversation(c.id)}
                className={`chat-history-main text-left px-3 py-2 text-sm transition-colors ${
                  currentConversationId === c.id ? "is-active" : ""
                }`}
              >
                <div className="truncate">{c.title}</div>
              </button>
              <button
                type="button"
                className="chat-history-delete"
                aria-label={`删除对话：${c.title}`}
                title="删除对话"
                disabled={deletingConversationId === c.id}
                onClick={() => {
                  setDeleteError(null);
                  setPendingDelete(c);
                }}
              >
                {deletingConversationId === c.id
                  ? <Loader2 className="animate-spin" />
                  : <Trash2 />}
              </button>
            </div>
          ))}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {pendingDelete && (
        <div
          className="chat-delete-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingConversationId) {
              setPendingDelete(null);
              setDeleteError(null);
            }
          }}
        >
          <section
            className="chat-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-delete-dialog-title"
            aria-describedby="chat-delete-dialog-description"
          >
            <div className="chat-delete-dialog__icon" aria-hidden="true"><Trash2 /></div>
            <h2 id="chat-delete-dialog-title">是否确定删除？</h2>
            <p id="chat-delete-dialog-description">
              对话“{pendingDelete.title}”及其中的全部消息将被永久删除，无法恢复。
            </p>
            {deleteError && <p className="chat-delete-dialog__error" role="alert">{deleteError}</p>}
            <div className="chat-delete-dialog__actions">
              <button
                type="button"
                className="chat-delete-dialog__cancel"
                disabled={Boolean(deletingConversationId)}
                onClick={() => {
                  setPendingDelete(null);
                  setDeleteError(null);
                }}
              >
                取消
              </button>
              <button
                type="button"
                className="chat-delete-dialog__confirm"
                disabled={Boolean(deletingConversationId)}
                onClick={deleteConversation}
              >
                {deletingConversationId ? <><Loader2 className="animate-spin" /> 正在删除</> : "确定删除"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Main */}
      <main className="chat-main flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-stone-100 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs text-emerald-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              聊天服务正常，随时为你解惑
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-600 hidden md:inline">{activeProfileName || "当前档案"}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            reportContextLoading ? (
              <div className="chat-report-loading" role="status">
                <Loader2 className="animate-spin" />
                <span>正在读取深度报告…</span>
              </div>
            ) : reportContext ? (
              <div className="chat-report-handoff">
                <div className="chat-report-handoff__icon" aria-hidden="true"><FileText /></div>
                <p className="chat-report-handoff__eyebrow">REPORT READY</p>
                <h1>报告已读取</h1>
                <p className="chat-report-handoff__source">
                  《{reportContext.title || "八字深度报告"}》 · {reportContext.profileName || "当前档案"}
                </p>
                <p className="chat-report-handoff__question">
                  你想先解读哪一部分？我会在你确认后，只分析你关心的内容。
                </p>

                <div className="chat-report-options" aria-label="可选的报告解读方向">
                  {REPORT_QUESTIONS.map((question) => (
                    <button key={question} type="button" onClick={() => fillRecommendedQuestion(question)}>
                      {question}
                    </button>
                  ))}
                </div>

                <div className="chat-report-composer">
                  <div className="relative chat-composer">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="选择一个方向，或输入你想问的具体问题…"
                      className="h-12 pr-14 rounded-full chat-composer-input"
                      onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                      disabled={loading}
                    />
                    <Button
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 chat-composer-send"
                      onClick={() => sendMessage(input)}
                      disabled={loading || !input.trim()}
                      aria-label="确认并开始解读"
                    >
                      <ArrowUp className="w-[17px] h-[17px]" strokeWidth={1.45} />
                    </Button>
                  </div>
                  <p>选择后仍可修改，发送即代表确认开始解读。</p>
                </div>
              </div>
            ) : reportContextError ? (
              <div className="chat-report-loading" role="alert">
                <FileText />
                <span>{reportContextError}</span>
              </div>
            ) : (
            <div className="chat-empty-state h-full flex flex-col items-center justify-center px-4 text-center">
              <h1 className="text-3xl md:text-5xl font-light">
                {activeProfileName || "你好"}
              </h1>
              <p className="chat-empty-copy text-stone-500">
                以八字与星盘为双重映照，<br />
                于时间的回响中，辨认此刻的自己。
              </p>

              <div className="chat-empty-composer w-full max-w-2xl">
                <div className="relative chat-composer">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="心有所问，洄映为答…"
                    className="h-12 pr-14 rounded-full border-stone-200 bg-stone-50 chat-composer-input"
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                    disabled={loading}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 chat-composer-send"
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                  >
                    <ArrowUp className="w-[17px] h-[17px]" strokeWidth={1.45} />
                  </Button>
                </div>
              </div>

              <div className="chat-empty-suggestions flex flex-wrap justify-center gap-2 max-w-xl">
                {RECOMMENDED_QUESTIONS.map((q, index) => (
                  <button
                    key={`${q}-${index}`}
                    onClick={() => fillRecommendedQuestion(q)}
                    className="px-4 py-2 rounded-full bg-stone-50 border border-stone-100 text-sm text-stone-600 hover:bg-stone-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            )
          ) : (
            <div className="chat-thread">
              {messages.map((msg) => (
                <article key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                  <div className="chat-message__surface">
                    {msg.role === "assistant" && (
                      <div className="chat-answer-brand">
                        <EchoMark />
                        <span>洄映</span>
                      </div>
                    )}

                    {msg.role === "assistant" && msg.thinkingSummary && (
                      <ThinkingDisclosure
                        message={msg}
                        isStreaming={streamingMessageId === msg.id}
                      />
                    )}

                    {msg.role === "assistant"
                      ? <ChatMessageContent content={msg.content} />
                      : <div className="chat-user-copy">{msg.content}</div>}

                    {msg.role === "assistant" && msg.content && (
                      <div className="chat-message-actions">
                        <button type="button" aria-label="回答有帮助">
                          <ThumbsUp />
                        </button>
                        <button type="button" aria-label="回答需要改进">
                          <ThumbsDown />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
              {loading && !streamingMessageId && (
                <div className="chat-awaiting" role="status">
                  <span aria-hidden="true" />
                  <span>洄映正在思考</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <>
            <Separator />

            <div className="p-4 bg-white">
              <div className="max-w-3xl mx-auto">
                <div className="relative chat-composer">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="心有所问，洄映为答…"
                    className="h-12 pr-14 rounded-full border-stone-200 bg-stone-50 chat-composer-input"
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                    disabled={loading}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 chat-composer-send"
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim()}
                  >
                    <ArrowUp className="w-[17px] h-[17px]" strokeWidth={1.45} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        <BottomDock />

      </main>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>}>
      <ChatContent />
    </Suspense>
  );
}
