import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Send, X, RotateCcw, Star } from "lucide-react";
import nurse from "@/assets/medi-ai-nurse.png";
import { chatHistory, chatRate, chatStart } from "@/lib/medi-ai.functions";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "medi-ai-conv";
const GREETING: Msg = { role: "assistant", content: "Merhaba, ben **Medi AI** 👋 Medicare Hastanesi'nin sanal asistanıyım. Randevu alabilir, randevunuzu sorgulayabilir veya hastanemiz hakkında sorularınızı yanıtlayabilirim." };
function parse(content: string): { text: string; chips: string[] } {
  const re = /\[\[\s*öneri\s*:([^\]]*)\]\]/gi;
  const chips: string[] = [];
  const text = content.replace(re, (_, list: string) => {
    list.split("|").map((s) => s.trim()).filter(Boolean).forEach((s) => chips.push(s));
    return "";
  }).replace(/\[\[[^\]]*$/, "").trim();
  return { text, chips: chips.slice(0, 8) };
}
const SUGGESTIONS = ["Randevu almak istiyorum", "Randevumu sorgula", "Hangi bölüme gitmeliyim?", "Hastaneniz hakkında bilgi"];

export function MediAIWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [rated, setRated] = useState(false);

  async function submitRating() {
    if (!conv.current || !rating) return;
    try { await chatRate({ data: { ...conv.current, rating, feedback: feedback.trim() || undefined } }); setRated(true); setRateOpen(false); }
    catch { /* keep form open */ }
  }
  const conv = useRef<{ id: string; token: string } | null>(null);
  const loaded = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setBubble(!sessionStorage.getItem("medi-bubble")), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open]);
  useEffect(() => { if (open && !busy) inputRef.current?.focus(); }, [open, busy]);

  async function ensureConv() {
    if (conv.current) return conv.current;
    const c = await chatStart();
    conv.current = c;
    localStorage.setItem(KEY, JSON.stringify(c));
    return c;
  }

  async function openChat() {
    setOpen(true); setBubble(false); sessionStorage.setItem("medi-bubble", "1");
    if (loaded.current) return;
    loaded.current = true;
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved?.id && saved?.token) {
        const h = await chatHistory({ data: saved });
        if (h.ok) { conv.current = saved; setMsgs(h.messages); return; }
        localStorage.removeItem(KEY);
      }
    } catch { localStorage.removeItem(KEY); }
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: t }]);
    setBusy(true);
    try {
      const c = await ensureConv();
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...c, message: t }) });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const snapshot = acc;
        if (!started) { started = true; setStreaming(true); setMsgs((m) => [...m, { role: "assistant", content: snapshot }]); }
        else setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: snapshot }]);
      }
      if (!started) setMsgs((m) => [...m, { role: "assistant", content: "Üzgünüm, şu an yanıt veremedim." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Bir sorun oluştu, lütfen tekrar deneyin. Acil durumlarda 112'yi, diğer konularda 0216 000 00 00'ı arayabilirsiniz." }]);
    } finally { setBusy(false); setStreaming(false); }
  }

  function reset() {
    localStorage.removeItem(KEY); conv.current = null; setMsgs([]); setRated(false); setRating(0); setFeedback(""); setRateOpen(false);
  }

  if (pathname.startsWith("/panel") || pathname.startsWith("/auth")) return null;
  const shown = [GREETING, ...msgs];

  return (
    <>
      {!open && (
        <div className="fixed bottom-4 right-4 z-50 flex items-end gap-2">
          {bubble && (
            <button onClick={openChat} className="mb-16 max-w-[220px] animate-in fade-in slide-in-from-bottom-2 rounded-2xl rounded-br-sm border bg-card px-4 py-3 text-left text-sm shadow-soft">
              <span className="font-semibold text-primary">Medi AI</span><br />Merhaba! Size nasıl yardımcı olabilirim?
            </button>
          )}
          <button onClick={openChat} aria-label="Medi AI asistanını aç" className="medi-bob group relative h-24 w-24 rounded-full bg-primary-soft shadow-soft ring-4 ring-background transition hover:scale-105">
            <img src={nurse} alt="Medi AI hemşire asistan" width={256} height={256} className="medi-wave absolute inset-0 h-full w-full rounded-full object-cover object-top" />
            <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
          </button>
        </div>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[620px] sm:max-h-[calc(100vh-2rem)] sm:w-[400px] sm:rounded-3xl sm:border sm:shadow-2xl">
          <header className="flex items-center gap-3 rounded-t-3xl bg-primary px-4 py-3 text-primary-foreground">
            <img src={nurse} alt="" width={44} height={44} className="h-11 w-11 rounded-full bg-primary-foreground/20 object-cover object-top" />
            <div className="flex-1">
              <p className="font-display font-semibold leading-tight">Medi AI</p>
              <p className="text-xs opacity-80">Medicare Hastanesi sanal asistanı</p>
            </div>
            {msgs.length >= 2 && !rated && <button onClick={() => setRateOpen((v) => !v)} title="Sohbeti puanla" aria-label="Sohbeti puanla" className="rounded-full p-2 hover:bg-primary-foreground/15"><Star className="h-4 w-4" /></button>}
            <button onClick={reset} title="Yeni sohbet" aria-label="Yeni sohbet" className="rounded-full p-2 hover:bg-primary-foreground/15"><RotateCcw className="h-4 w-4" /></button>
            <button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-full p-2 hover:bg-primary-foreground/15"><X className="h-5 w-5" /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {shown.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                {m.role === "assistant" && <img src={nurse} alt="" width={28} height={28} className="mt-1 h-7 w-7 shrink-0 rounded-full bg-primary-soft object-cover object-top" />}
                <div className={m.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                  : "medi-md max-w-[85%] text-sm leading-relaxed"}>
                  {m.role === "user" ? m.content : <ReactMarkdown>{parse(m.content).text}</ReactMarkdown>}
                </div>
              </div>
            ))}
            {!busy && msgs.at(-1)?.role === "assistant" && (() => {
              const chips = parse(msgs.at(-1)?.content ?? "").chips;
              return chips.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {chips.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground">{s}</button>)}
                </div>
              );
            })()}
            {busy && !streaming && (
              <div className="flex items-center gap-2">
                <img src={nurse} alt="" width={28} height={28} className="h-7 w-7 rounded-full bg-primary-soft object-cover object-top" />
                <span className="flex gap-1 rounded-2xl bg-muted px-3 py-2.5">
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 150}ms` }} />)}
                </span>
              </div>
            )}
            {msgs.length === 0 && !busy && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary">{s}</button>)}
              </div>
            )}
            {!busy && msgs.length >= 4 && !rated && !rateOpen && (
              <button onClick={() => setRateOpen(true)} className="mx-auto block text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline">Bu sohbet faydalı oldu mu? Puanlayın</button>
            )}
            {rateOpen && !rated && (
              <div className="rounded-2xl border bg-card p-3">
                <p className="text-sm font-medium">Medi AI ile sohbetinizi puanlayın</p>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button key={i} onClick={() => setRating(i)} aria-label={`${i} yıldız`}>
                      <Star className={`h-7 w-7 transition ${i <= rating ? "fill-primary text-primary" : "text-muted-foreground/40 hover:text-primary"}`} />
                    </button>
                  ))}
                </div>
                <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} rows={2} placeholder="Yorumunuz (isteğe bağlı)" className="mt-2 w-full resize-none rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus:border-primary" />
                <div className="mt-2 flex justify-end gap-2">
                  <button onClick={() => setRateOpen(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Vazgeç</button>
                  <button onClick={submitRating} disabled={!rating} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40">Gönder</button>
                </div>
              </div>
            )}
            {rated && <p className="text-center text-xs text-primary">Değerlendirmeniz için teşekkürler 🌸</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t p-3">
            <div className="flex items-end gap-2 rounded-2xl border bg-card p-2 focus-within:border-primary">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={2000}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Mesajınızı yazın…" className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Gönder" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">Medi AI tıbbi teşhis koymaz. Acil durumlarda 112'yi arayın.</p>
          </form>
        </div>
      )}
    </>
  );
}
