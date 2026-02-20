"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DiscoveryReportChatProps {
  projectId: string;
}

export function DiscoveryReportChat({ projectId }: DiscoveryReportChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatMessages: Message[] = [...messages, userMessage];
      const res = await fetch("/api/discovery/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          messages: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error en el chat");
      }

      const { content } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-zinc-200 bg-zinc-50/50">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Chat sobre el informe</h2>
        <span className="text-xs text-zinc-500">
          Pregunta, edita o pide búsquedas web
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Haz preguntas sobre el sector, pide modificaciones del informe o
            información adicional. Si lo necesita, el asistente buscará en internet.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-8 flex justify-end"
                : "mr-8 flex justify-start"
            }
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
                  : "max-w-[85%] rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm"
              }
            >
              {m.role === "assistant" ? (
                <div className="prose prose-zinc prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h3: ({ children }) => (
                        <h3 className="text-sm font-semibold mt-3 mb-1">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="mb-2 last:mb-0">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-4 mb-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-4 mb-2">{children}</ol>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mr-8 flex justify-start">
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
              Pensando...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-zinc-200 bg-white p-4"
      >
        <div className="flex gap-2">
          <Textarea
            placeholder="Pregunta sobre el sector, pide editar el informe o información actualizada..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
            rows={1}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
