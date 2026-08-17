import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const SESSION_KEY = "serenity_session_id";
const USER_KEY = "serenity_user_id";
const MESSAGE_KEY_PREFIX = "serenity_messages_";

const moods = [
  {
    label: "Low",
    face: "⌢",
    response:
      "Thank you for checking in. We can take this one gentle step at a time.",
  },
  {
    label: "Uneasy",
    face: "≈",
    response:
      "I’m here with you. Let’s slow things down and notice what feels heaviest.",
  },
  {
    label: "Okay",
    face: "—",
    response:
      "It’s okay to arrive exactly as you are. What would make today feel lighter?",
  },
  {
    label: "Calm",
    face: "⌣",
    response:
      "I’m glad there is some calm here. We can use it to understand what is helping.",
  },
  {
    label: "Bright",
    face: "✦",
    response:
      "That brightness matters. Let’s notice what helped create it so you can return to it.",
  },
];

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createUserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function readLocalMessages(sessionId: string): ChatMessage[] {
  try {
    const stored = localStorage.getItem(`${MESSAGE_KEY_PREFIX}${sessionId}`);

    if (!stored) return [];

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    );
  } catch {
    return [];
  }
}

export default function App() {
  const [selectedMood, setSelectedMood] = useState(3);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /*
   * ---------------------------------------------------------
   * INITIALISE USER + SESSION
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const existingUser = localStorage.getItem(USER_KEY);
    const existingSession = localStorage.getItem(SESSION_KEY);

    // Preserve the old n8n-era session as the stable user ID
    // when migrating to the Vercel backend.
    const activeUser =
      existingUser || existingSession || createUserId();

    const activeSession =
      existingSession || createSessionId();

    localStorage.setItem(USER_KEY, activeUser);
    localStorage.setItem(SESSION_KEY, activeSession);

    setUserId(activeUser);
    setSessionId(activeSession);

    const localMessages = readLocalMessages(activeSession);
    setMessages(localMessages);

    let cancelled = false;

    async function loadStoredHistory() {
      try {
        const response = await fetch(
          `/api/history?userId=${encodeURIComponent(
            activeUser,
          )}&sessionId=${encodeURIComponent(activeSession)}`,
        );

        if (!response.ok) return;

        const data = await response.json();

        const storedMessages = Array.isArray(data.messages)
          ? data.messages
              .filter(
                (item: { role?: string; content?: string }) =>
                  (item.role === "user" ||
                    item.role === "assistant") &&
                  typeof item.content === "string",
              )
              .map(
                (
                  item: {
                    role: "user" | "assistant";
                    content: string;
                    created_at?: string;
                    createdAt?: string;
                  },
                  index: number,
                ): ChatMessage => ({
                  id: `stored-${
                    item.created_at ||
                    item.createdAt ||
                    index
                  }`,
                  role: item.role,
                  content: item.content,
                  createdAt:
                    item.created_at ||
                    item.createdAt ||
                    new Date().toISOString(),
                }),
              )
          : [];

        if (!cancelled && storedMessages.length > 0) {
          setMessages(storedMessages);
        }
      } catch {
        // Local history remains available if the history API is unavailable.
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadStoredHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * SAVE LOCAL HISTORY
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (!sessionId || isLoadingHistory) return;

    localStorage.setItem(
      `${MESSAGE_KEY_PREFIX}${sessionId}`,
      JSON.stringify(messages),
    );
  }, [messages, sessionId, isLoadingHistory]);

  /*
   * ---------------------------------------------------------
   * AUTO-SCROLL TO NEWEST MESSAGE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior:
          messages.length > 1 ? "smooth" : "auto",
        block: "end",
      });
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [messages, isSending]);

  /*
   * ---------------------------------------------------------
   * START CHECK-IN
   * ---------------------------------------------------------
   */

  function beginCheckIn() {
    document
      .getElementById("chat")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
  }

  /*
   * ---------------------------------------------------------
   * NEW CONVERSATION
   * ---------------------------------------------------------
   */

  function startNewConversation() {
    const newSessionId = createSessionId();

    localStorage.setItem(
      SESSION_KEY,
      newSessionId,
    );

    localStorage.setItem(
      `${MESSAGE_KEY_PREFIX}${newSessionId}`,
      "[]",
    );

    setSessionId(newSessionId);
    setMessages([]);
    setMessage("");
    setError("");
    setIsLoadingHistory(false);
    setSelectedMood(2);

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  /*
   * ---------------------------------------------------------
   * SEND MESSAGE
   * ---------------------------------------------------------
   */

  async function sendMessage(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (
      !cleanMessage ||
      isSending ||
      !userId ||
      !sessionId
    ) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ]);

    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          sessionId,
          chatInput: cleanMessage,
          mood: moods[selectedMood].label.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Serenity could not respond.",
        );
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          data.output ||
          "I’m here with you. Could you tell me a little more?",
        createdAt: new Date().toISOString(),
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        assistantMessage,
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The live assistant is unavailable right now.",
      );
    } finally {
      setIsSending(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="site-shell">
      <div
        className="aurora aurora-one"
        aria-hidden="true"
      />

      <div
        className="aurora aurora-two"
        aria-hidden="true"
      />

      <div
        className="star-field"
        aria-hidden="true"
      >
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="site-header">
        <a
          className="brand"
          href="#home"
          aria-label="Serenity home"
        >
          <span
            className="brand-mark"
            aria-hidden="true"
          >
            <span className="brand-crescent" />
            <span className="brand-ripple brand-ripple-one" />
            <span className="brand-ripple brand-ripple-two" />
          </span>

          <span>Serenity</span>
        </a>

        <nav aria-label="Primary navigation">
          <a className="active" href="#chat">
            Chat
          </a>

          <a href="#journey">
            Journey
          </a>

          <a href="#memories">
            Memories
          </a>

          <a href="#safety">
            Safety
          </a>
        </nav>
      </header>

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow">
            <span aria-hidden="true" />
            Private support, shaped around you
          </div>

          <h1>
            A calmer mind,
            <br />
            one conversation
            <br />
            at a time.
          </h1>

          <p className="hero-description">
            Private, personalized emotional support
            that remembers what matters—and knows
            when human help matters more.
          </p>

          <div className="hero-actions">
            <button
              className="primary-button"
              onClick={beginCheckIn}
              type="button"
            >
              Start a check-in
              <span aria-hidden="true">
                ↗
              </span>
            </button>

            <a
              className="secondary-button"
              href="#journey"
            >
              View my journey
            </a>
          </div>

          <div
            className="trust-row"
            aria-label="Serenity principles"
          >
            <span>
              <i
                className="status-dot"
                aria-hidden="true"
              />
              Memory you control
            </span>

            <span>
              <i
                className="status-dot"
                aria-hidden="true"
              />
              Human help when needed
            </span>
          </div>
        </div>

        {/* =================================================
            CHECK-IN CARD
            ================================================= */}

        <div
          className="check-in-wrap"
          id="chat"
        >
          <div
            className="orbit orbit-one"
            aria-hidden="true"
          />

          <div
            className="orbit orbit-two"
            aria-hidden="true"
          />

          <article className="check-in-card">
            {/* TOP BAR */}

            <div className="card-topbar">
              <div className="card-title">
                <span
                  className="serenity-dot"
                  aria-hidden="true"
                />

                <div>
                  <strong>
                    Evening check-in
                  </strong>

                  <small>
                    Serenity is here with you
                  </small>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="new-chat-button"
                  onClick={
                    startNewConversation
                  }
                  type="button"
                >
                  New conversation
                </button>

                <span className="privacy-pill">
                  <span
                    className="lock-icon"
                    aria-hidden="true"
                  />
                  Private
                </span>
              </div>
            </div>

            {/* CARD BODY */}

            <div className="card-body">
              <p className="question">
                How are you feeling right now?
              </p>

              {/* MOODS */}

              <div
                className="mood-grid"
                aria-label="Choose your current mood"
              >
                {moods.map(
                  (mood, index) => (
                    <button
                      className={`mood-option ${
                        selectedMood === index
                          ? "selected"
                          : ""
                      }`}
                      key={mood.label}
                      onClick={() =>
                        setSelectedMood(
                          index,
                        )
                      }
                      aria-pressed={
                        selectedMood === index
                      }
                      type="button"
                    >
                      <span
                        className="mood-face"
                        aria-hidden="true"
                      >
                        {mood.face}
                      </span>

                      <span>
                        {mood.label}
                      </span>
                    </button>
                  ),
                )}
              </div>

              {/* =================================================
                  CONVERSATION
                  ================================================= */}

              <div
                className="conversation-list"
                aria-label="Conversation history"
                aria-live="polite"
              >
                {isLoadingHistory && (
                  <p className="history-status">
                    Loading earlier messages…
                  </p>
                )}

                {!isLoadingHistory &&
                  messages.length === 0 && (
                    <div className="assistant-message">
                      <div
                        className="response-mark"
                        aria-hidden="true"
                      >
                        <span>☾</span>
                      </div>

                      <p>
                        {
                          moods[
                            selectedMood
                          ].response
                        }
                      </p>
                    </div>
                  )}

                {/* USER + ASSISTANT MESSAGES */}

                {messages.map(
                  (chatMessage) => {
                    if (
                      chatMessage.role ===
                      "user"
                    ) {
                      return (
                        <div
                          className="chat-user-row"
                          key={
                            chatMessage.id
                          }
                        >
                          <span>
                            You
                          </span>

                          <div className="chat-user-bubble">
                            {chatMessage.content}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        className="chat-assistant-row"
                        key={
                          chatMessage.id
                        }
                      >
                        <div
                          className="response-mark"
                          aria-hidden="true"
                        >
                          <span>☾</span>
                        </div>

                        <div className="chat-assistant-bubble">
                          <p>
                            {
                              chatMessage.content
                            }
                          </p>
                        </div>
                      </div>
                    );
                  },
                )}

                {/* TYPING INDICATOR */}

                {isSending && (
                  <div className="chat-assistant-row typing-message">
                    <div
                      className="response-mark"
                      aria-hidden="true"
                    >
                      <span>☾</span>
                    </div>

                    <div className="chat-assistant-bubble">
                      <div className="typing-indicator">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </div>
                )}

                {/* SCROLL TARGET */}

                <div
                  ref={messagesEndRef}
                  className="messages-end"
                  aria-hidden="true"
                />
              </div>

              {/* =================================================
                  INPUT
                  ================================================= */}

              <form
                className="message-form"
                onSubmit={sendMessage}
              >
                <label
                  className="sr-only"
                  htmlFor="check-in-message"
                >
                  Share what is on your mind
                </label>

                <input
                  id="check-in-message"
                  ref={inputRef}
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value,
                    )
                  }
                  placeholder="Share what’s on your mind…"
                  autoComplete="off"
                  disabled={
                    !userId ||
                    !sessionId ||
                    isLoadingHistory
                  }
                />

                <button
                  type="submit"
                  aria-label="Send check-in message"
                  disabled={
                    isSending ||
                    isLoadingHistory ||
                    !userId ||
                    !sessionId ||
                    !message.trim()
                  }
                >
                  <span aria-hidden="true">
                    ➤
                  </span>
                </button>
              </form>

              {error && (
                <p
                  className="form-error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <p className="support-note">
                Serenity offers emotional
                support, not medical diagnosis
                or emergency care.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* =====================================================
          JOURNEY
          ===================================================== */}

      <section
        className="journey-preview"
        id="journey"
      >
        <p className="section-kicker">
          Your journey, made visible
        </p>

        <h2>
          Small check-ins become meaningful
          patterns.
        </h2>

        <div className="preview-grid">
          <article>
            <span className="preview-number">
              07
            </span>

            <strong>
              days of reflection
            </strong>
          </article>

          <article id="memories">
            <span className="preview-number">
              12
            </span>

            <strong>
              memories you control
            </strong>
          </article>

          <article id="safety">
            <span className="preview-number">
              24/7
            </span>

            <strong>
              crisis resources available
            </strong>
          </article>
        </div>
      </section>
    </main>
  );
}
