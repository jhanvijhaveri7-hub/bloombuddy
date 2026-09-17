import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  UserButton,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import {
  Home,
  MessageCircle,
  BookOpen,
  Sparkles,
  Archive,
  Target,
  Clock3,
  Settings,
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Wind,
  Moon,
  Footprints,
  X,
  Mic,
  Image,
  Send,
  Trash2,
  Check,
  Sun,
  Menu,
  Waves,
  CloudRain,
  Trees,
  Flame,
  Play,
  Pause,
  TimerReset,
  Heart,
  Flower2,
  Orbit,
  CircleDot,
  Gamepad2,
  ShieldCheck,
  Eye,
  Ear,
  Hand,
  Coffee,
  Trophy,
  LogIn,
  Camera,
  Palette,
  Maximize2,
} from "lucide-react";
import "./styles.css";
import "./auth.css";
import "./mobile.css";
import cosmicEarthPanorama from "./assets/space/cosmic-earth-panorama-v2.png";

type View =
  | "Today"
  | "Buddy"
  | "Bloom"
  | "Journal"
  | "Mood Music"
  | "Music Studio"
  | "Memories"
  | "Goals"
  | "Timeline"
  | "Sounds"
  | "Meditation"
  | "Mindful Breaks"
  | "Breathe"
  | "Space"
  | "Zen Place"
  | "Grounding"
  | "Gratitude"
  | "Settings";
type Memory = { id: number; title?: string; text: string; tag: string; mood?: string; mediaUrl?: string; mediaType?: string; favorite?: boolean; occurredAt?: string; createdAt?: string; date: string };
type GratitudeItem = { id: number; text: string };
type BloomProfile = { userId?: string; name: string; preferences: string; avoid?: string };
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080/api/v1" : "");
let activeBloomUserId = "";
let activeBloomProfile: BloomProfile | null = null;
const userStorageKey = (key: string) => `${key}:${activeBloomUserId || "guest"}`;
const localCollection = (name: string) => `bloom-local-${name}:${activeBloomUserId || "guest"}`;
const readLocal = <T,>(name: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(localCollection(name)) || "") as T; } catch { return fallback; }
};
const writeLocal = (name: string, value: unknown) => localStorage.setItem(localCollection(name), JSON.stringify(value));
async function localApi<T>(path: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  const body = options?.body && typeof options.body === "string" ? JSON.parse(options.body) : {};
  if (path === "/profile") {
    if (method === "GET") {
      const profile = readLocal<BloomProfile | null>("profile", null);
      if (!profile) throw new Error("Profile not created");
      return profile as T;
    }
    const profile = { ...body, userId: activeBloomUserId } as BloomProfile;
    writeLocal("profile", profile);
    return profile as T;
  }
  if (path === "/buddy/status") return { aiConnected: false, mode: "limited-fallback" } as T;
  if (path === "/space/video/status") return { configured: false, provider: "none" } as T;
  if (path === "/account" && method === "DELETE") {
    ["profile", "journal", "memories", "goals", "gratitude"].forEach((name) => localStorage.removeItem(localCollection(name)));
    return undefined as T;
  }
  if (path === "/account/restore" && method === "POST") {
    const restored = typeof body === "object" && body ? body : {};
    if (restored.profile) writeLocal("profile", restored.profile);
    for (const name of ["journal", "memories", "goals", "gratitude"] as const) if (Array.isArray(restored[name])) writeLocal(name, restored[name]);
    return { journal: restored.journal?.length || 0, memories: restored.memories?.length || 0, goals: restored.goals?.length || 0, notes: restored.gratitude?.length || 0 } as T;
  }
  const match = path.match(/^\/(journal|memories|goals|gratitude)(?:\/(\d+))?$/);
  if (!match) throw new Error("This feature needs the Bloom cloud service");
  const [, name, idText] = match;
  const items = readLocal<Array<Record<string, unknown>>>(name, []);
  if (method === "GET") return items as T;
  if (method === "POST") {
    const item = { ...body, id: Date.now(), createdAt: new Date().toISOString() };
    writeLocal(name, [item, ...items]);
    return item as T;
  }
  const id = Number(idText);
  if (method === "PUT") {
    const item = { ...items.find((entry) => entry.id === id), ...body, id };
    writeLocal(name, items.map((entry) => entry.id === id ? item : entry));
    return item as T;
  }
  if (method === "DELETE") {
    writeLocal(name, items.filter((entry) => entry.id !== id));
    return undefined as T;
  }
  throw new Error("Unsupported local request");
}
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API) return localApi<T>(path, options);
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Bloom-User-Id": activeBloomUserId, ...(options?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Bloom API error: ${response.status}`);
  return response.status === 204 ? (undefined as T) : response.json();
}
const memoriesSeed: Memory[] = [
  {
    id: 1,
    text: "Rainy evenings make you feel calm and focused.",
    tag: "Preference",
    date: "May 14",
  },
  {
    id: 2,
    text: "Your grandmother is one of the people who grounds you.",
    tag: "Relationship",
    date: "Apr 28",
  },
  {
    id: 3,
    text: "You want to learn enough guitar to play for friends.",
    tag: "Dream",
    date: "Apr 03",
  },
  {
    id: 4,
    text: "Reading fiction helps you slow down after difficult days.",
    tag: "What helps",
    date: "Mar 21",
  },
];
const nav = [
  ["Today", Home],
  ["Buddy", MessageCircle],
  ["Journal", BookOpen],
  ["Mood Music", Heart],
  ["Memories", Archive],
  ["Goals", Target],
  ["Timeline", Clock3],
  ["Sounds", Waves],
  ["Meditation", Moon],
  ["Mindful Breaks", CircleDot],
  ["Space", Orbit],
  ["Zen Place", Flower2],
  ["Grounding", Hand],
] as const;

function Logo() {
  return (
    <div className="logo">
      <img src="/bloom-logo.png" alt="Bloom — Reconnect with life" />
    </div>
  );
}
function Sidebar({
  view,
  setView,
  open,
  setOpen,
  profileName,
}: {
  view: View;
  setView: (v: View) => void;
  open: boolean;
  setOpen: (x: boolean) => void;
  profileName: string;
}) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenu = useRef<HTMLDivElement | null>(null);
  const accountName = profileName || user?.firstName || user?.fullName || "Bloom user";
  const accountInitials = user?.firstName && user?.lastName ? `${user.firstName[0]}${user.lastName[0]}` : accountName.slice(0, 2).toUpperCase();
  useEffect(() => {
    const closeAccountMenu = (event: MouseEvent) => {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeAccountMenu); document.removeEventListener("keydown", closeOnEscape); };
  }, []);
  return (
    <aside className={open ? "side open" : "side"}>
      <div className="sideTop">
        <Logo />
        <button className="mobileClose" onClick={() => setOpen(false)}>
          <X />
        </button>
      </div>
      <nav>
        {nav.map(([n, I]) => (
          <button
            key={n}
            className={view === n ? "active" : ""}
            onClick={() => {
              setView(n);
              setOpen(false);
            }}
          >
            <I />
            <span>{n}</span>
            {n === "Buddy" && <i />}
          </button>
        ))}
      </nav>
      <div className="sideBottom">
        <button onClick={() => setView("Settings")}>
          <Settings />
          <span>Settings</span>
        </button>
        <div className="accountMenuWrap" ref={accountMenu}>
          {accountOpen && <div className="accountPopover" role="menu">
            <div className="accountSummary"><div className="avatar">{accountInitials}</div><span><b>{accountName}</b><small>{user?.primaryEmailAddress?.emailAddress || "Private Bloom account"}</small></span></div>
            <button role="menuitem" onClick={() => { setView("Settings"); setAccountOpen(false); setOpen(false); }}><Settings /><span><b>Account settings</b><small>Appearance, memory, and privacy</small></span></button>
            <button role="menuitem" onClick={() => { setView("Settings"); setAccountOpen(false); setOpen(false); window.setTimeout(() => document.querySelector(".privacySettings")?.scrollIntoView({ behavior: "smooth" }), 50); }}><ShieldCheck /><span><b>Privacy controls</b><small>Data and active sessions</small></span></button>
            <button className="accountSignOut" role="menuitem" onClick={() => void signOut()}><LogIn /><span><b>Sign out</b><small>Return to the secure sign-in screen</small></span></button>
          </div>}
          <button className="person" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((value) => !value)}>
            <div className="avatar">{accountInitials}</div>
            <div>
              <b>{accountName}</b>
              <small>Account and privacy</small>
            </div>
            <ChevronRight className={accountOpen ? "open" : ""} />
          </button>
        </div>
      </div>
    </aside>
  );
}
function Header({
  view,
  onMenu,
  setView,
  name,
}: {
  view: View;
  onMenu: () => void;
  setView: (v: View) => void;
  name: string;
}) {
  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
        ? "Good afternoon"
        : "Good night";
  const search = () => {
    const q = window
      .prompt(
        "Where would you like to go? Try journal, sounds, space, goals, or grounding.",
      )
      ?.toLowerCase();
    const match = nav.find(([name]) => q && name.toLowerCase().includes(q));
    if (match) setView(match[0]);
    else if (q) window.alert("No matching Bloom feature was found.");
  };
  return (
    <header>
      <button className="menu" aria-label="Open navigation" onClick={onMenu}>
        <Menu />
      </button>
      <div>
        <small>
          {now
            .toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </small>
        <h1>{view === "Today" ? `${greeting}, ${name}.` : view}</h1>
      </div>
      <div className="headerActions">
        <button aria-label="Search features" onClick={search}>
          <Search />
        </button>
        <button
          aria-label="Notifications"
          onClick={() =>
            window.alert(
              "You are all caught up. Bloom will only show gentle reminders you choose.",
            )
          }
        >
          <Bell />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
function ProgressRing() {
  return (
    <div className="ring">
      <div>
        <b>62%</b>
        <span>this week</span>
      </div>
    </div>
  );
}
function Today({ setView }: { setView: (v: View) => void }) {
  const [plan, setPlan] = useState<"idle" | "yes" | "no">("idle");
  const [quick, setQuick] = useState("");
  const [saved, setSaved] = useState(false);
  const saveQuick = async () => {
    if (!quick.trim()) {
      setView("Journal");
      return;
    }
    try {
      await api("/journal", {
        method: "POST",
        body: JSON.stringify({ content: quick.trim() }),
      });
      setQuick("");
      setSaved(true);
    } catch {
      window.alert(
        "The Java backend is not reachable. Start it with npm run backend, then try again.",
      );
    }
  };
  return (
    <div className="page today">
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles /> A thought for today
          </span>
          <h2>You don't need to fix the whole week tonight.</h2>
          <p>
            A quiet evening may be more useful than pushing through another
            task.
          </p>
          <button className="primary" onClick={() => setView("Buddy")}>
            Talk it through <ArrowUpRight />
          </button>
        </div>
        <div className="orb heroOrb" aria-hidden="true">
          <div className="orbAtmosphere" />
          <div className="orbCore">
            <div className="orbCoreLight" />
            <div className="orbCoreGrid" />
          </div>
          <div className="orbitalPlane orbitOne">
            <i className="orbSatellite satelliteGold" />
          </div>
          <div className="orbitalPlane orbitTwo">
            <i className="orbSatellite satellitePearl" />
          </div>
          <div className="orbitalPlane orbitThree">
            <i className="orbSatellite satelliteMint" />
          </div>
          <i className="orbParticle particleOne" />
          <i className="orbParticle particleTwo" />
          <i className="orbParticle particleThree" />
        </div>
      </section>
      <div className="grid mainGrid">
        <section className="card focus">
          <div className="cardTitle">
            <span>Today's focus</span>
            <button aria-label="Open goals" onClick={() => setView("Goals")}>
              •••
            </button>
          </div>
          <div className="focusRow">
            <div className="iconBox purple">
              <Target />
            </div>
            <div>
              <small>CURRENT GOAL</small>
              <h3>Finish your portfolio case study</h3>
              <p>One clear section is enough for today.</p>
            </div>
          </div>
          <div className="bar">
            <span style={{ width: "68%" }} />
          </div>
          <footer>
            <span>3 of 5 steps complete</span>
            <button onClick={() => setView("Goals")}>
              Continue <ChevronRight />
            </button>
          </footer>
        </section>
        <section className="card energy">
          <div className="cardTitle">
            <span>Your rhythm</span>
            <small>LAST 7 DAYS</small>
          </div>
          <div className="rhythm">
            <ProgressRing />
            <div>
              <div>
                <Sun /> Focus <b>Morning</b>
              </div>
              <div>
                <Moon /> Sleep <b>7h 12m</b>
              </div>
              <div>
                <Footprints /> Outside <b>4 days</b>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="grid lower">
        <section className="card action">
          <span className="eyebrow">
            <Wind /> Suggested for you
          </span>
          <h3>
            {plan === "yes" ? "Added to today" : "Take the long way home."}
          </h3>
          <p>
            {plan === "yes"
              ? "A gentle reminder is waiting here—there is no streak or penalty."
              : plan === "no"
                ? "That is completely okay. Bloom will suggest something else tomorrow."
                : "A quiet ten-minute walk may help you switch off."}
          </p>
          <div>
            <button className="primary" onClick={() => setPlan("yes")}>
              {plan === "yes" ? (
                <>
                  <Check /> Added
                </>
              ) : (
                <>
                  I'll do this <Check />
                </>
              )}
            </button>
            <button className="textBtn" onClick={() => setPlan("no")}>
              Not today
            </button>
          </div>
        </section>
        <section className="card journalPrompt">
          <div className="cardTitle">
            <span>Quick journal</span>
            <BookOpen />
          </div>
          <h3>
            {saved ? "Saved privately." : "What stayed on your mind today?"}
          </h3>
          <textarea
            value={quick}
            onChange={(e) => {
              setQuick(e.target.value);
              setSaved(false);
            }}
            placeholder="A few honest words are enough..."
          />
          <footer>
            <div />
            <button
              aria-label="Save quick journal"
              className="round"
              onClick={saveQuick}
            >
              {saved ? <Check /> : <ArrowUpRight />}
            </button>
          </footer>
        </section>
        <section className="card insight">
          <div className="cardTitle">
            <span>Latest insight</span>
            <Sparkles />
          </div>
          <div className="miniChart">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <h3>Your patterns grow from saved activity.</h3>
          <p>
            Insights clearly show what is live data and what still needs more
            evidence.
          </p>
          <button onClick={() => setView("Mood Music")}>
            Find music for me <ChevronRight />
          </button>
        </section>
      </div>
      <section className="closing">
        <div>
          <span>Before you go</span>
          <h3>Take one calm moment away from the screen.</h3>
          <p>Your progress is saved. You can return whenever you want.</p>
        </div>
        <button
          onClick={() => document.body.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Finish for now <ArrowUpRight />
        </button>
      </section>
    </div>
  );
}

function BloomChat({ setView }: { setView: (v: View) => void }) {
  const { user } = useUser();
  const buddyName = activeBloomProfile?.name || user?.firstName || "there";
  type Msg = { me: boolean; text: string; image?: string; audio?: string; createdAt?: string };
  const welcomeMessage: Msg = {
    me: false,
    text: `Hey ${buddyName}, I’m Buddy. I’m here to listen like a steady friend. What would feel most helpful right now?`,
    createdAt: new Date().toISOString(),
  };
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(userStorageKey("bloom-buddy-chat")) || "[]");
      return Array.isArray(saved) && saved.length ? saved : [welcomeMessage];
    } catch { return [welcomeMessage]; }
  });
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [image, setImage] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  useEffect(() => {
    try {
      const persistentMessages = msgs.slice(-120).map(({ me, text, image, createdAt }) => ({
        me,
        text,
        createdAt: createdAt || new Date().toISOString(),
        ...(image && image.length < 350_000 ? { image } : {}),
      }));
      localStorage.setItem(userStorageKey("bloom-buddy-chat"), JSON.stringify(persistentMessages));
    } catch {
      try {
        localStorage.setItem(userStorageKey("bloom-buddy-chat"), JSON.stringify(msgs.slice(-120).map(({ me, text, createdAt }) => ({ me, text, createdAt }))));
      } catch { /* Storage may be disabled; the current session still works. */ }
    }
  }, [msgs]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const area = messagesRef.current;
      if (area) area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [msgs, typing]);
  const send = async (
    textOverride?: string,
    imageOverride?: string,
    audio?: string,
  ) => {
    const text = (textOverride ?? input).trim();
    const sentImage = imageOverride ?? image;
    if ((!text && !sentImage) || typing) return;
    const lower = text.toLowerCase();
    const detectedMood = /happy|great|excited|proud|amazing|good news|won/.test(lower)
      ? "happy"
      : /angry|annoyed|irritated|frustrated|mad|hate/.test(lower)
        ? "annoyed"
        : /sad|lonely|low|cry|empty|depressed|hopeless/.test(lower)
          ? "sad"
          : /anxious|worried|panic|stress|overthink|nervous/.test(lower)
            ? "anxious"
            : /tired|sleepy|exhausted|drained/.test(lower)
              ? "tired"
              : null;
    if (detectedMood) {
      localStorage.setItem(userStorageKey("bloom-mood"), detectedMood);
      window.dispatchEvent(new CustomEvent("bloom-mood", { detail: detectedMood }));
    }
    const placePreference = text.match(/(?:my\s+)?favou?rite\s+(?:place|view|scene)\s+(?:is|would be)\s+(.+)/i);
    if (placePreference?.[1]) {
      const preference = placePreference[1].trim().replace(/[.!?]+$/, "");
      localStorage.setItem(userStorageKey("bloom-favorite-place"), preference);
      void api<Memory>("/memories", {
        method: "POST",
        body: JSON.stringify({ title: "Favorite place", text: preference, tag: "Preference", mood: "Calm", occurredAt: new Date().toISOString() }),
      }).catch(() => undefined);
      window.dispatchEvent(new CustomEvent("bloom-place-preference", { detail: preference }));
    }
    setMsgs((current) => [
      ...current,
      {
        me: true,
        text: text || "Shared a photo",
        image: sentImage || undefined,
        audio,
        createdAt: new Date().toISOString(),
      },
    ]);
    setInput("");
    setImage("");
    setMediaError("");
    setTyping(true);
    try {
      const result = await api<{ reply: string }>("/buddy/reply", {
        method: "POST",
        body: JSON.stringify({
          message: text || "Please respond naturally to this photo.",
          image: sentImage,
          preferences: activeBloomProfile?.preferences || "",
          avoid: activeBloomProfile?.avoid || "",
        }),
      });
      setMsgs((current) => [...current, { me: false, text: result.reply, createdAt: new Date().toISOString() }]);
    } catch {
      setMsgs((current) => [
        ...current,
        {
          me: false,
          text: "I’m having trouble reaching the Bloom server. Please check that the Java backend is running, then send that again.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };
  const chooseImage = (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setMediaError("Please choose a photo smaller than 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setMediaError("");
    };
    reader.readAsDataURL(file);
  };
  const toggleVoice = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunks.current = [];
      const next = new MediaRecorder(stream);
      recorder.current = next;
      next.ondataavailable = (e) => {
        if (e.data.size) voiceChunks.current.push(e.data);
      };
      next.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(voiceChunks.current, {
          type: next.mimeType || "audio/webm",
        });
        const audioUrl = URL.createObjectURL(blob);
        const form = new FormData();
        form.append("audio", blob, "buddy-voice.webm");
        setTyping(true);
        try {
          const response = await fetch(`${API}/buddy/transcribe`, {
            method: "POST",
            body: form,
          });
          const result = await response.json();
          if (!response.ok || !result.text) throw new Error();
          setTyping(false);
          await send(result.text, undefined, audioUrl);
        } catch {
          setTyping(false);
          setMediaError(
            "I could not understand that recording. Please try again or type your message.",
          );
        }
      };
      next.start();
      setRecording(true);
      setMediaError("");
    } catch {
      setMediaError(
        "Microphone access was not allowed. Enable it for Bloom and try again.",
      );
    }
  };
  return (
    <div className="page chatPage">
      <div className="chatHead">
        <div className="bloomAvatar">
          <Sparkles />
        </div>
        <div>
          <h2>Buddy</h2>
          <span>
            <i /> {typing ? "Thinking with you…" : "Here with you"}
          </span>
        </div>
        <button onClick={() => setView("Memories")}>
          What Buddy remembers
        </button>
      </div>
      <div className="messages" ref={messagesRef}>
        <div className="dayLine">Today</div>
        {msgs.map((m, i) => (
          <div key={i} className={m.me ? "msg me" : "msg"}>
            {m.image && (
              <img
                className="chatImage"
                src={m.image}
                alt="Shared with Buddy"
              />
            )}
            {m.audio && <audio className="chatAudio" src={m.audio} controls />}
            {m.text && <div>{m.text}</div>}
          </div>
        ))}
        {typing && (
          <div className="msg typing" aria-label="Buddy is typing">
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <div className="suggestions">
        <button
          onClick={() => setInput("I feel anxious and keep overthinking")}
        >
          I’m anxious
        </button>
        <button onClick={() => setInput("I just want to talk about my day")}>
          Talk about my day
        </button>
        <button onClick={() => setInput("Tell me something light or a joke")}>
          Cheer me up
        </button>
      </div>
      {image && (
        <div className="chatMediaPreview">
          <img src={image} alt="Ready to send" />
          <button onClick={() => setImage("")} aria-label="Remove photo">
            <X />
          </button>
        </div>
      )}
      {mediaError && <div className="chatMediaError">{mediaError}</div>}
      <input
        className="mediaInput"
        ref={imageInput}
        type="file"
        accept="image/*"
        onChange={(e) => {
          chooseImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="composer">
        <button
          aria-label="Add photo"
          onClick={() => imageInput.current?.click()}
        >
          <Image />
        </button>
        <button
          className={recording ? "voiceRecording" : ""}
          aria-label={recording ? "Stop recording" : "Record voice message"}
          onClick={toggleVoice}
        >
          <Mic />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            recording ? "Recording voice message…" : "Talk to Buddy honestly..."
          }
        />
        <button
          className="send"
          disabled={typing || (!input.trim() && !image)}
          aria-label="Send message"
          onClick={() => send()}
        >
          <Send />
        </button>
      </div>
      <small className="disclaimer">
        Buddy adapts to what you share, but it is not a therapist or emergency
        service.
      </small>
    </div>
  );
}
function Journal() {
  type Attachment = { name: string; type: string; data: string };
  type Entry = {
    id: number;
    content: string;
    createdAt: string;
    attachmentsJson?: string;
  };
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const mediaInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  useEffect(() => {
    api<Entry[]>("/journal")
      .then(setEntries)
      .catch(() =>
        setError("Start the Java backend to load and save entries."),
      );
  }, []);
  const toData = (file: File) =>
    new Promise<Attachment>((resolve, reject) => {
      if (file.size > 20 * 1024 * 1024) {
        reject(new Error("Each attachment must be smaller than 20 MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          type: file.type,
          data: String(reader.result),
        });
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.readAsDataURL(file);
    });
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    try {
      const added = await Promise.all(Array.from(files).map(toData));
      setAttachments((x) => [...x, ...added].slice(0, 6));
      setError("");
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach that file.");
    }
  };
  const toggleRecording = async () => {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const next = new MediaRecorder(stream);
      recorder.current = next;
      next.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      next.onstop = async () => {
        const blob = new Blob(chunks.current, {
          type: next.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((t) => t.stop());
        const file = new File(
          [blob],
          `Voice note ${new Date().toLocaleTimeString().replace(/:/g, "-")}.webm`,
          { type: blob.type },
        );
        try {
          const item = await toData(file);
          setAttachments((x) => [...x, item].slice(0, 6));
        } catch (e) {
          setError(
            e instanceof Error ? e.message : "Could not save voice note.",
          );
        }
        setRecording(false);
      };
      next.start();
      setRecording(true);
      setError("");
    } catch {
      setError(
        "Microphone access was not allowed. Please enable it for Bloom and try again.",
      );
    }
  };
  const save = async () => {
    if (!content.trim() && attachments.length === 0) {
      setError(
        "Write something or add a photo, video, or voice note before saving.",
      );
      return;
    }
    try {
      const entry = await api<Entry>("/journal", {
        method: "POST",
        body: JSON.stringify({
          content: content.trim(),
          attachmentsJson: JSON.stringify(attachments),
        }),
      });
      setEntries((current) => [entry, ...current]);
      setContent("");
      setAttachments([]);
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError(
        "Could not save. Large videos may exceed storage; try a shorter clip.",
      );
    }
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete this journal entry permanently?")) return;
    try {
      await api(`/journal/${id}`, { method: "DELETE" });
      setEntries((current) => current.filter((e) => e.id !== id));
    } catch {
      setError(
        "Could not delete this entry. Check that the backend is running.",
      );
    }
  };
  const media = (entry: Entry): Attachment[] => {
    try {
      return JSON.parse(entry.attachmentsJson || "[]");
    } catch {
      return [];
    }
  };
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <BookOpen /> Journal
          </span>
          <h2>Make sense of the day.</h2>
          <p>
            Write it, photograph it, record it, or keep a small video of the
            moment.
          </p>
        </div>
      </div>
      <section className="card editor">
        <span>
          {new Date()
            .toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
            .toUpperCase()}
        </span>
        <h3>What stayed on your mind today?</h3>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaved(false);
            setError("");
          }}
          placeholder="Write freely, or save a moment with media."
        />
        <input
          ref={mediaInput}
          className="mediaInput"
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="journalTools">
          <button onClick={() => mediaInput.current?.click()}>
            <Image /> Add photos or videos
          </button>
          <button
            className={recording ? "recording" : ""}
            onClick={toggleRecording}
          >
            <Mic /> {recording ? "Stop recording" : "Record voice note"}
          </button>
          <small>Up to 6 files, 20 MB each</small>
        </div>
        {attachments.length > 0 && (
          <div className="pendingMedia">
            {attachments.map((a, i) => (
              <div key={`${a.name}-${i}`}>
                {a.type.startsWith("image/") ? (
                  <img src={a.data} alt={a.name} />
                ) : a.type.startsWith("video/") ? (
                  <video src={a.data} controls />
                ) : (
                  <audio src={a.data} controls />
                )}
                <span title={a.name}>{a.name}</span>
                <button
                  aria-label={`Remove ${a.name}`}
                  onClick={() =>
                    setAttachments((x) => x.filter((_, n) => n !== i))
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}
        {error && <p className="formError">{error}</p>}
        <footer>
          <small>
            Your entry and attachments are stored privately by your Bloom
            backend.
          </small>
          <button className="primary" onClick={save}>
            {saved ? (
              <>
                <Check /> Saved privately
              </>
            ) : (
              <>
                Save entry <ArrowUpRight />
              </>
            )}
          </button>
        </footer>
      </section>
      <h3 className="sectionTitle">Recent entries</h3>
      <div className="entries">
        {entries.length === 0 && !error ? (
          <p>No entries yet. Your first saved reflection will appear here.</p>
        ) : (
          entries.map((e) => (
            <article key={e.id}>
              <div className="entryTop">
                <small>{new Date(e.createdAt).toLocaleString()}</small>
                <button
                  aria-label="Delete journal entry"
                  onClick={() => remove(e.id)}
                >
                  <Trash2 />
                </button>
              </div>
              <h3>A moment you kept</h3>
              {e.content && <p>{e.content}</p>}
              {media(e).length > 0 && (
                <div className="savedMedia">
                  {media(e).map((a, i) =>
                    a.type.startsWith("image/") ? (
                      <img key={i} src={a.data} alt={a.name} />
                    ) : a.type.startsWith("video/") ? (
                      <video key={i} src={a.data} controls />
                    ) : (
                      <audio key={i} src={a.data} controls />
                    ),
                  )}
                </div>
              )}
              <span>Private journal entry</span>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
function Memories() {
  const [mems, setMems] = useState<Memory[]>([]);
  const [filter, setFilter] = useState("All memories");
  const [editing, setEditing] = useState<Memory | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState({ title: "", text: "", tag: "Preference", mood: "Calm", occurredAt: new Date().toISOString().slice(0, 10), mediaUrl: "", mediaType: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    api<Memory[]>("/memories")
      .then((rows) =>
        setMems(
          rows.map((m) => ({
            ...m,
            date: new Date(m.occurredAt || m.createdAt || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
          })),
        ),
      )
      .catch(() => {});
  }, []);
  const openNew = () => {
    setEditing(null); setError("");
    setForm({ title: "", text: "", tag: "Preference", mood: "Calm", occurredAt: new Date().toISOString().slice(0, 10), mediaUrl: "", mediaType: "" });
    setEditorOpen(true);
  };
  const openEdit = (memory: Memory) => {
    setEditing(memory); setError("");
    setForm({ title: memory.title || "", text: memory.text, tag: memory.tag, mood: memory.mood || "Calm", occurredAt: (memory.occurredAt || memory.createdAt || new Date().toISOString()).slice(0, 10), mediaUrl: memory.mediaUrl || "", mediaType: memory.mediaType || "" });
    setEditorOpen(true);
  };
  const attach = (file?: File) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Please choose a photo, video, or voice note under 8 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((value) => ({ ...value, mediaUrl: String(reader.result || ""), mediaType: file.type }));
    reader.readAsDataURL(file);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.text.trim()) { setError("Write a short memory before saving."); return; }
    setSaving(true); setError("");
    const payload = { ...form, title: form.title.trim(), text: form.text.trim(), occurredAt: new Date(`${form.occurredAt}T12:00:00`).toISOString(), favorite: editing?.favorite || false };
    try {
      const saved = await api<Memory>(editing ? `/memories/${editing.id}` : "/memories", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      const normalized = { ...saved, date: new Date(saved.occurredAt || saved.createdAt || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) };
      setMems((items) => editing ? items.map((item) => item.id === saved.id ? normalized : item) : [normalized, ...items]);
      setEditorOpen(false);
    } catch { setError("Bloom could not save this memory. Make sure the Java backend is running."); }
    finally { setSaving(false); }
  };
  const toggleFavorite = async (memory: Memory) => {
    const update = { ...memory, favorite: !memory.favorite, occurredAt: memory.occurredAt || memory.createdAt };
    try { const saved = await api<Memory>(`/memories/${memory.id}`, { method: "PUT", body: JSON.stringify(update) }); setMems((items) => items.map((item) => item.id === memory.id ? { ...item, ...saved } : item)); } catch {}
  };
  const remove = async (id: number) => {
    if (!window.confirm("Delete this memory permanently?")) return;
    try {
      await api<void>(`/memories/${id}`, { method: "DELETE" });
      setMems((items) => items.filter((x) => x.id !== id));
    } catch {}
  };
  const isPeopleMemory = (memory: Memory) => {
    if (memory.tag === "Relationship") return true;
    const words = `${memory.title || ""} ${memory.text}`.toLowerCase();
    return /\b(friend|friends|frnd|frnds|bestie|boyfriend|girlfriend|partner|husband|wife|mother|mom|mum|father|dad|brother|sister|sibling|grandmother|grandma|grandfather|grandpa|cousin|aunt|uncle|teacher|mentor|classmate|colleague)\b/.test(words);
  };
  const categories: Record<string, (memory: Memory) => boolean> = { "All memories": () => true, Favourites: (m) => !!m.favorite, People: isPeopleMemory, Goals: (m) => m.tag === "Dream", Preferences: (m) => m.tag === "Preference", "What helps": (m) => m.tag === "What helps" };
  const visible = mems.filter(categories[filter] || categories["All memories"]);
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Archive /> Your Life Model
          </span>
          <h2>Memory Vault</h2>
          <p>
            What Bloom understands about you. Nothing is hidden, and everything
            is yours to change.
          </p>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus /> Add a memory
        </button>
      </div>
      {editorOpen && <form className="memoryEditor card" onSubmit={save}>
        <div className="memoryEditorHead"><div><span className="eyebrow"><Archive /> {editing ? "Update this moment" : "Keep a moment"}</span><h3>{editing ? "Edit memory" : "What would you like to remember?"}</h3></div><button type="button" aria-label="Close memory editor" onClick={() => setEditorOpen(false)}><X /></button></div>
        <div className="memoryFields"><label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A short name for this moment" /></label><label>Date<input type="date" value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} /></label><label>Type<select value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}><option>Preference</option><option>Relationship</option><option>Dream</option><option>What helps</option><option>Milestone</option><option>Personal story</option></select></label><label>Mood<select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}><option>Calm</option><option>Happy</option><option>Proud</option><option>Hopeful</option><option>Emotional</option><option>Grateful</option></select></label></div>
        <label className="memoryText">Your memory<textarea required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Write what happened, why it matters, or what you want future-you to remember…" /></label>
        <div className="memoryAttachment"><label><Image /> Add photo, video, or voice note<input type="file" accept="image/*,video/*,audio/*" onChange={(e) => attach(e.target.files?.[0])} /></label>{form.mediaUrl && <div className="attachmentPreview">{form.mediaType.startsWith("image/") ? <img src={form.mediaUrl} alt="Memory attachment preview" /> : form.mediaType.startsWith("video/") ? <video src={form.mediaUrl} controls /> : <audio src={form.mediaUrl} controls />}<button type="button" onClick={() => setForm({ ...form, mediaUrl: "", mediaType: "" })}><X /> Remove</button></div>}</div>
        {error && <p className="memoryError">{error}</p>}
        <div className="memoryEditorActions"><button type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Save memory"}</button></div>
      </form>}
      <div className="memoryMeta">
        <div>
          <b>{mems.length}</b>
          <span>things remembered</span>
        </div>
        <div>
          <b>{mems.filter(isPeopleMemory).length}</b>
          <span>people & relationships</span>
        </div>
        <div>
          <b>100%</b>
          <span>under your control</span>
        </div>
      </div>
      <div className="filter">{Object.keys(categories).map((name) => <button key={name} className={filter === name ? "selected" : ""} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <div className="memoryList">
        {visible.length === 0 && <div className="memoryEmpty"><Archive /><h3>No memories here yet</h3><p>Add a moment or choose another filter.</p></div>}
        {visible.map((m) => (
          <article key={m.id}>
            <div className="memoryIcon">
              <Sparkles />
            </div>
            <div>
              <span>{m.tag}{m.mood ? ` · ${m.mood}` : ""}</span>
              <h3>{m.title || m.text}</h3>
              {m.title && <p>{m.text}</p>}
              {m.mediaUrl && (m.mediaType?.startsWith("image/") ? <img className="memoryMedia" src={m.mediaUrl} alt={m.title || "Saved memory"} /> : m.mediaType?.startsWith("video/") ? <video className="memoryMedia" src={m.mediaUrl} controls /> : <audio className="memoryAudio" src={m.mediaUrl} controls />)}
              <small>
                Remembered {m.date} · Used only for personalizing your
                experience
              </small>
            </div>
            <div className="memoryActions"><button className={m.favorite ? "favourite" : ""} aria-label={m.favorite ? "Remove from favourites" : "Add to favourites"} onClick={() => toggleFavorite(m)}><Heart /></button><button aria-label="Edit memory" onClick={() => openEdit(m)}><Settings /></button><button aria-label="Delete memory" onClick={() => remove(m.id)}><Trash2 /></button></div>
          </article>
        ))}
      </div>
    </div>
  );
}
function InstrumentStudio({ albumMode = false }: { albumMode?: boolean }) {
  type Instrument = "guitar" | "piano" | "harp" | "drums" | "xylophone" | "synth";
  type SamplePoint = { note: string; frequency: number };
  const defaultBindings: Record<Instrument, Record<string, string>> = {
    guitar: { "chord-C": "1", "chord-G": "2", "chord-Am": "3", "chord-F": "4", "chord-Dm": "5", "chord-Em": "6", "string-0": "A", "string-1": "S", "string-2": "D", "string-3": "F", "string-4": "G", "string-5": "H" },
    piano: Object.fromEntries(["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J", "K", "O", "L", "P", ";", "'", "Z", "X", "C", "V", "B", "N"].map((key, index) => [`key-${index}`, key])),
    harp: Object.fromEntries(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"].map((key, index) => [`harp-${index}`, key])),
    drums: { kick: "A", snare: "S", hihat: "D", tom1: "J", tom2: "K", tom3: "L" },
    xylophone: Object.fromEntries(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]"].map((key, index) => [`xylophone-${index}`, key])),
    synth: Object.fromEntries(["A", "W", "S", "E", "D", "F", "T", "G", "Y", "H", "U", "J"].map((key, index) => [`synth-${index}`, key])),
  };
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [active, setActive] = useState<Set<string>>(() => new Set());
  const [soundStatus, setSoundStatus] = useState("Real instrument recordings load on first play.");
  const [strumDirection, setStrumDirection] = useState<"up" | "down" | null>(null);
  const [heldGuitarId, setHeldGuitarId] = useState<string | null>(null);
  const [bindingMode, setBindingMode] = useState(false);
  const [bindingTarget, setBindingTarget] = useState<string | null>(null);
  const [bindings, setBindings] = useState<Record<Instrument, Record<string, string>>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(userStorageKey("bloom-instrument-bindings")) || "null");
      return saved ? Object.fromEntries(Object.entries(defaultBindings).map(([name, values]) => [name, { ...values, ...(saved[name] || {}) }])) as Record<Instrument, Record<string, string>> : defaultBindings;
    } catch { return defaultBindings; }
  });
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingDataUrl, setRecordingDataUrl] = useState("");
  const [trackName, setTrackName] = useState("");
  const [album, setAlbum] = useState<{ id: string; title: string; instrument: string; audio: string; createdAt: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem(userStorageKey("bloom-music-album")) || "[]"); } catch { return []; }
  });
  const audioContext = useRef<AudioContext | null>(null);
  const recordingDestination = useRef<MediaStreamAudioDestinationNode | null>(null);
  const studioRecorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<number | null>(null);
  const sampleCache = useRef(new Map<string, Promise<AudioBuffer>>());
  const heldGuitar = useRef<{ id: string; frequencies: number[]; label: string } | null>(null);
  const strummedWhileHeld = useRef(false);
  const activeTimers = useRef(new Map<string, number>());
  const flashActive = (id: string, milliseconds = 210) => {
    setActive((current) => new Set(current).add(id));
    const previous = activeTimers.current.get(id);
    if (previous) window.clearTimeout(previous);
    activeTimers.current.set(id, window.setTimeout(() => {
      setActive((current) => { const next = new Set(current); next.delete(id); return next; });
      activeTimers.current.delete(id);
    }, milliseconds));
  };
  const context = () => {
    if (!audioContext.current) audioContext.current = new AudioContext();
    if (audioContext.current.state === "suspended") audioContext.current.resume();
    return audioContext.current;
  };
  const routeOutput = (node: AudioNode) => {
    const ctx = context();
    node.connect(ctx.destination);
    if (recordingDestination.current) node.connect(recordingDestination.current);
  };
  const tone = (frequency: number, shape: OscillatorType = "sine", duration = 1, volume = 0.18) => {
    const ctx = context();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = shape;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    routeOutput(gain);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };
  const sampleBase = "https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples";
  const samples: Record<Exclude<Instrument, "synth" | "drums">, SamplePoint[]> = {
    guitar: [{ note: "C3", frequency: 130.81 }, { note: "C4", frequency: 261.63 }, { note: "C5", frequency: 523.25 }],
    piano: [{ note: "C3", frequency: 130.81 }, { note: "C4", frequency: 261.63 }, { note: "C5", frequency: 523.25 }, { note: "C6", frequency: 1046.5 }],
    harp: [{ note: "A2", frequency: 110 }, { note: "A4", frequency: 440 }, { note: "A6", frequency: 1760 }],
    xylophone: [{ note: "C5", frequency: 523.25 }, { note: "C6", frequency: 1046.5 }, { note: "C7", frequency: 2093 }],
  };
  const sampleFolder: Record<Exclude<Instrument, "synth" | "drums">, string> = {
    guitar: "guitar-acoustic", piano: "piano", harp: "harp", xylophone: "xylophone",
  };
  const loadSample = (url: string) => {
    const existing = sampleCache.current.get(url);
    if (existing) return existing;
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Audio file returned ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context().decodeAudioData(data));
    sampleCache.current.set(url, request);
    return request;
  };
  const recordedTone = async (target: number, selected: Exclude<Instrument, "synth" | "drums">, volume = .28, delay = 0) => {
    const point = samples[selected].reduce((best, candidate) =>
      Math.abs(Math.log2(target / candidate.frequency)) < Math.abs(Math.log2(target / best.frequency)) ? candidate : best
    );
    const url = `${sampleBase}/${sampleFolder[selected]}/${point.note}.mp3`;
    try {
      setSoundStatus(`Loading real ${selected} recording…`);
      const buffer = await loadSample(url);
      const ctx = context();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = target / point.frequency;
      gain.gain.value = volume;
      source.connect(gain);
      routeOutput(gain);
      source.start(ctx.currentTime + delay);
      setSoundStatus(`Playing a real ${selected} recording.`);
    } catch {
      setSoundStatus("That recording could not load. Check your internet connection and try again.");
    }
  };
  const drumBase = "https://cdn.jsdelivr.net/gh/cwilso/web-audio-samples@master/samples/audio/sounds/drum-samples/acoustic-kit";
  const drumLabels: Record<string, string> = { kick: "Kick", snare: "Snare", hihat: "Hi-hat", tom1: "High tom", tom2: "Mid tom", tom3: "Floor tom" };
  const preloadDrums = () => {
    setSoundStatus("Preparing the acoustic drum kit for low-latency playing…");
    void Promise.all(Object.keys(drumLabels).map((id) => loadSample(`${drumBase}/${id}.wav`)))
      .then(() => setSoundStatus("Acoustic drum kit ready — play with the pads or keyboard."))
      .catch(() => setSoundStatus("The drum kit could not preload. Check your internet connection."));
  };
  const recordedDrum = async (id: string) => {
    try {
      setSoundStatus(`Loading real ${drumLabels[id].toLowerCase()} recording…`);
      const buffer = await loadSample(`${drumBase}/${id}.wav`);
      const ctx = context();
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;
      gain.gain.value = id === "kick" ? .75 : id === "hihat" ? .45 : .58;
      source.connect(gain);
      routeOutput(gain);
      source.start();
      setSoundStatus(`Playing a real acoustic ${drumLabels[id].toLowerCase()}.`);
    } catch {
      setSoundStatus("That drum recording could not load. Check your internet connection and try again.");
    }
  };
  const stopStudioRecording = () => {
    if (studioRecorder.current?.state === "recording") studioRecorder.current.stop();
  };
  const startStudioRecording = () => {
    if (typeof MediaRecorder === "undefined") { setSoundStatus("Recording is not supported in this browser."); return; }
    const ctx = context();
    const destination = ctx.createMediaStreamDestination();
    recordingDestination.current = destination;
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
    recordingChunks.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) recordingChunks.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(recordingChunks.current, { type: recorder.mimeType || "audio/webm" });
      setRecordingUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob); });
      const reader = new FileReader();
      reader.onload = () => setRecordingDataUrl(String(reader.result));
      reader.readAsDataURL(blob);
      recordingDestination.current = null;
      studioRecorder.current = null;
      setRecording(false);
      if (recordingTimer.current) window.clearInterval(recordingTimer.current);
      recordingTimer.current = null;
      setSoundStatus("Recording saved — replay it or download your creation.");
    };
    studioRecorder.current = recorder;
    recorder.start(100);
    setRecording(true);
    setRecordingSeconds(0);
    recordingTimer.current = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    setSoundStatus("Recording your instrument creation…");
  };
  useEffect(() => () => {
    if (studioRecorder.current?.state === "recording") studioRecorder.current.stop();
    if (recordingTimer.current) window.clearInterval(recordingTimer.current);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(userStorageKey("bloom-music-album"), JSON.stringify(album)); }
    catch { setSoundStatus("Your browser album is full. Download a track, then remove older recordings before saving more."); }
  }, [album]);
  const saveToAlbum = () => {
    if (!recordingDataUrl) return;
    const title = trackName.trim() || `${instrument[0].toUpperCase() + instrument.slice(1)} idea`;
    try {
      setAlbum((current) => [{ id: crypto.randomUUID(), title, instrument, audio: recordingDataUrl, createdAt: new Date().toISOString() }, ...current]);
      setTrackName("");
      setSoundStatus(`“${title}” was added to My Album.`);
    } catch { setSoundStatus("This recording is too large to save in the browser. Download it instead."); }
  };
  const play = async (id: string, frequency: number, shape: OscillatorType = "sine", duration = 1) => {
    flashActive(id);
    if (instrument === "synth") {
      tone(frequency, shape, duration, .15);
      setSoundStatus("Synthesizer generated live on this device.");
    } else if (instrument === "drums") await recordedDrum(id);
    else await recordedTone(frequency, instrument);
  };
  const playChord = (id: string, frequencies: number[], direction: "up" | "down" = "down") => {
    const ordered = direction === "up" ? [...frequencies].sort((a, b) => b - a) : [...frequencies].sort((a, b) => a - b);
    flashActive(id, 420);
    ordered.forEach((frequency, index) => void recordedTone(frequency, "guitar", .13 + index * .008, index * .052));
    setSoundStatus(`Playing a ${direction === "up" ? "bottom-to-top upstroke" : "top-to-bottom downstroke"}.`);
  };
  const guitar = [
    ["E", 82.41], ["A", 110], ["D", 146.83], ["G", 196], ["B", 246.94], ["e", 329.63],
  ] as const;
  const piano = [
    { name: "C4", frequency: 261.63, black: false }, { name: "C♯4", frequency: 277.18, black: true }, { name: "D4", frequency: 293.66, black: false }, { name: "D♯4", frequency: 311.13, black: true }, { name: "E4", frequency: 329.63, black: false }, { name: "F4", frequency: 349.23, black: false }, { name: "F♯4", frequency: 369.99, black: true }, { name: "G4", frequency: 392, black: false }, { name: "G♯4", frequency: 415.3, black: true }, { name: "A4", frequency: 440, black: false }, { name: "A♯4", frequency: 466.16, black: true }, { name: "B4", frequency: 493.88, black: false },
    { name: "C5", frequency: 523.25, black: false }, { name: "C♯5", frequency: 554.37, black: true }, { name: "D5", frequency: 587.33, black: false }, { name: "D♯5", frequency: 622.25, black: true }, { name: "E5", frequency: 659.25, black: false }, { name: "F5", frequency: 698.46, black: false }, { name: "F♯5", frequency: 739.99, black: true }, { name: "G5", frequency: 783.99, black: false }, { name: "G♯5", frequency: 830.61, black: true }, { name: "A5", frequency: 880, black: false }, { name: "A♯5", frequency: 932.33, black: true }, { name: "B5", frequency: 987.77, black: false },
  ] as const;
  const melodicNotes = [["C4", 261.63], ["D4", 293.66], ["E4", 329.63], ["F4", 349.23], ["G4", 392], ["A4", 440], ["B4", 493.88], ["C5", 523.25], ["D5", 587.33], ["E5", 659.25], ["G5", 783.99], ["A5", 880]] as const;
  const brightNotes = [["C5", 523.25], ["D5", 587.33], ["E5", 659.25], ["F5", 698.46], ["G5", 783.99], ["A5", 880], ["B5", 987.77], ["C6", 1046.5], ["D6", 1174.66], ["E6", 1318.51], ["G6", 1567.98], ["A6", 1760]] as const;
  const chords = [
    ["C", [130.81, 164.81, 196]], ["G", [98, 123.47, 146.83, 196]], ["Am", [110, 130.81, 164.81]], ["F", [87.31, 110, 130.81, 174.61]], ["Dm", [146.83, 174.61, 220]], ["Em", [82.41, 98, 123.47, 164.81]],
    ["A", [110, 138.59, 164.81, 220]], ["D", [146.83, 185, 220, 293.66]], ["E", [82.41, 103.83, 123.47, 164.81]], ["Bm", [123.47, 146.83, 185]], ["B", [123.47, 155.56, 185]], ["F#", [92.5, 116.54, 138.59, 185]], ["G#m", [103.83, 123.47, 155.56]], ["C#m", [138.59, 164.81, 207.65]], ["Bb", [116.54, 146.83, 174.61]], ["Eb", [155.56, 196, 233.08]], ["Cm", [130.81, 155.56, 196]], ["Gm", [98, 116.54, 146.83, 196]],
  ] as const;
  const playGuitarString = (id: string, frequency: number) => {
    void play(id, frequency);
  };
  const playOpenStrum = (direction: "up" | "down") => {
    const strings = direction === "up" ? [...guitar].reverse() : [...guitar];
    strings.forEach(([, stringFrequency], index) => {
      window.setTimeout(() => flashActive(`string-${direction === "up" ? guitar.length - 1 - index : index}`, 250), index * 45);
      void recordedTone(stringFrequency, "guitar", .14, index * .052);
    });
    setSoundStatus(`Open-string ${direction === "up" ? "bottom-to-top upstroke" : "top-to-bottom downstroke"}.`);
  };
  const holdGuitar = (id: string, frequencies: number[], label: string) => {
    heldGuitar.current = { id, frequencies, label };
    strummedWhileHeld.current = false;
    setHeldGuitarId(id);
    setSoundStatus(`${label} held — tap ↑ for an upstroke or ↓ for a downstroke.`);
  };
  const releaseGuitar = (id?: string) => {
    if (!id || heldGuitar.current?.id === id) {
      const held = heldGuitar.current;
      const shouldPreview = held && !strummedWhileHeld.current;
      heldGuitar.current = null;
      setHeldGuitarId(null);
      if (shouldPreview) {
        if (held.id.startsWith("chord-")) playChord(held.id, held.frequencies, "down");
        else {
          const index = Number(held.id.split("-")[1]);
          playGuitarString(held.id, guitar[index][1]);
          setSoundStatus(`Playing the ${guitar[index][0]} string. Hold it and tap an arrow to strum all strings.`);
        }
      } else setSoundStatus("Tap to play, or hold a chord/string and use ↑ or ↓ to strum.");
      strummedWhileHeld.current = false;
    }
  };
  const strumHeldGuitar = (direction: "up" | "down") => {
    const held = heldGuitar.current;
    if (!held) {
      setSoundStatus("Hold a chord or string first, then tap ↑ or ↓ to strum.");
      return;
    }
    strummedWhileHeld.current = true;
    if (held.id.startsWith("chord-")) playChord(held.id, held.frequencies, direction);
    else playOpenStrum(direction);
  };
  const keyLabel = (id: string) => bindings[instrument][id] || "—";
  const activate = (id: string, action: () => void) => {
    if (bindingMode) {
      setBindingTarget(id);
      setSoundStatus(`Press the keyboard key you want for ${id.replace(/-/g, " ")}.`);
    } else action();
  };
  const triggerById = (id: string) => {
    if (instrument === "guitar") {
      if (id.startsWith("string-")) { const index = Number(id.split("-")[1]); playGuitarString(id, guitar[index][1]); }
      else { const chord = chords.find(([name]) => `chord-${name}` === id); if (chord) playChord(id, [...chord[1]]); }
    } else if (instrument === "piano") {
      const index = Number(id.split("-")[1]); void play(id, piano[index].frequency);
    } else if (instrument === "harp") {
      const index = Number(id.split("-")[1]); void play(id, melodicNotes[index][1]);
    } else if (instrument === "drums") void play(id, 0);
    else if (instrument === "xylophone") {
      const index = Number(id.split("-")[1]); void play(id, brightNotes[index][1]);
    } else {
      const index = Number(id.split("-")[1]); void play(id, melodicNotes[index][1] / 2, index % 2 ? "square" : "sawtooth", 1.8);
    }
  };
  useEffect(() => {
    localStorage.setItem(userStorageKey("bloom-instrument-bindings"), JSON.stringify(bindings));
  }, [bindings]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.code === "Space" ? "SPACE" : event.key.toUpperCase();
      if (bindingTarget) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          setSoundStatus("Arrow keys are reserved for guitar strumming direction. Choose another key.");
          return;
        }
        event.preventDefault();
        if (event.key === "Escape") { setBindingTarget(null); return; }
        setBindings((current) => {
          const nextInstrument = { ...current[instrument] };
          Object.keys(nextInstrument).forEach((id) => { if (nextInstrument[id] === key) nextInstrument[id] = ""; });
          nextInstrument[bindingTarget] = key;
          return { ...current, [instrument]: nextInstrument };
        });
        setSoundStatus(`${key} is now bound to ${bindingTarget.replace(/-/g, " ")}.`);
        setBindingTarget(null);
        return;
      }
      if ((event.target as HTMLElement)?.matches("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const direction = event.key === "ArrowUp" ? "up" : "down";
        setStrumDirection(direction);
        if (instrument === "guitar") strumHeldGuitar(direction);
        return;
      }
      const match = Object.entries(bindings[instrument]).find(([, assigned]) => assigned === key)?.[0];
      if (match) {
        event.preventDefault();
        if (instrument === "guitar") {
          if (match.startsWith("chord-")) {
            const chord = chords.find(([name]) => `chord-${name}` === match);
            if (chord) holdGuitar(match, [...chord[1]], `${chord[0]} chord`);
          } else holdGuitar(match, guitar.map(([, frequency]) => frequency), "Open strings");
        } else triggerById(match);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const releasedDirection = event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : null;
      if (releasedDirection) {
        setStrumDirection(null);
        return;
      }
      if (instrument === "guitar") {
        const key = event.code === "Space" ? "SPACE" : event.key.toUpperCase();
        const releasedControl = Object.entries(bindings.guitar).find(([, assigned]) => assigned === key)?.[0];
        if (releasedControl) releaseGuitar(releasedControl);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  });
  return <section className="instrumentStudio">
    <div className="studioHead"><div><span className="eyebrow"><Waves /> Composition workspace</span><h3>Instrument studio</h3><p>{instrument === "guitar" ? "Explore chords and strings. Hold a control while tapping ↑ or ↓ for directed strumming." : "Compose with the pointer or keyboard. Every key binding can be adjusted."}</p></div><small>{soundStatus}</small></div>
    <div className="studioControls"><div className="instrumentTabs">{(["guitar", "piano", "harp", "drums", "xylophone", "synth"] as Instrument[]).map(x => <button key={x} className={instrument === x ? "selected" : ""} onClick={() => { setInstrument(x); setBindingTarget(null); if (x === "drums") preloadDrums(); }}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div><button className={`bindingToggle ${bindingMode ? "selected" : ""}`} onClick={() => { setBindingMode((value) => !value); setBindingTarget(null); }}>{bindingMode ? "Finish key binding" : "Customize keyboard"}</button></div>
    {albumMode && <div className="studioInstrumentWall">{(["guitar", "piano", "harp", "drums", "xylophone", "synth"] as Instrument[]).map((name) => { const InstrumentIcon = ({ guitar: Waves, piano: CircleDot, harp: Orbit, drums: Target, xylophone: Palette, synth: Gamepad2 } as Record<Instrument, typeof Waves>)[name]; return <button key={name} className={instrument === name ? "active" : ""} onClick={() => { setInstrument(name); setBindingTarget(null); if (name === "drums") preloadDrums(); }}><span><InstrumentIcon /></span><b>{name[0].toUpperCase() + name.slice(1)}</b><small>Open instrument</small></button>; })}</div>}
    {bindingMode && <div className="bindingHelp">{bindingTarget ? <><strong>Now press a keyboard key</strong><span>Press Escape to cancel. Assigning a used key moves it to this control.</span></> : <><strong>Select a note, string, chord, or drum pad</strong><span>Then press the key you want to assign.</span></>}</div>}
    {instrument === "guitar" && <><div className="strumDirection"><span className={strumDirection === "up" ? "held" : ""}><kbd>↑</kbd> Tap for bottom → top</span><span className={strumDirection === "down" ? "held" : ""}><kbd>↓</kbd> Tap for top → bottom</span><em>{heldGuitarId ? `${heldGuitar.current?.label} ready` : "Hold a chord or string first"}</em></div><div className="guitarChords">{chords.map(([name, frequencies]) => { const id = `chord-${name}`; return <button key={name} className={`${active.has(id) ? "playing" : ""} ${heldGuitarId === id ? "guitarHeld" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => holdGuitar(id, [...frequencies], `${name} chord`))} onPointerUp={() => !bindingMode && releaseGuitar(id)} onPointerLeave={() => !bindingMode && releaseGuitar(id)}><span>{name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div><div className="guitarBody">{guitar.map(([name], i) => { const id = `string-${i}`; return <button key={name + i} className={`${active.has(id) ? "playing" : ""} ${heldGuitarId === id ? "guitarHeld" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => holdGuitar(id, guitar.map(([, frequency]) => frequency), "Open strings"))} onPointerUp={() => !bindingMode && releaseGuitar(id)} onPointerLeave={() => !bindingMode && releaseGuitar(id)}><span>{name}</span><i style={{ height: `${1 + i * .35}px` }} /><kbd>{keyLabel(id)}</kbd></button>; })}</div></>}
    {instrument === "piano" && <div className="pianoKeyboard"><div className="pianoWhiteKeys">{piano.map((note, i) => { if (note.black) return null; const id = `key-${i}`; return <button key={note.name} className={`${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, note.frequency))}><span>{note.name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div><div className="pianoBlackKeys">{piano.map((note, i) => { if (!note.black) return null; const id = `key-${i}`; const whiteBefore = piano.slice(0, i).filter((item) => !item.black).length; return <button key={note.name} style={{ left: `${whiteBefore / 14 * 100}%` }} className={`${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, note.frequency))}><span>{note.name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div></div>}
    {instrument === "harp" && <div className="noteBoard kalimbaBoard">{melodicNotes.map(([name, frequency], i) => { const id = `harp-${i}`; return <button key={name} style={{ height: `${115 + Math.abs(5.5 - i) * 10}px` }} className={`${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, frequency))}><span>{name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div>}
    {instrument === "drums" && <div className="drumKit"><div className="drumKitTop">{["tom1", "tom2", "tom3"].map((id) => <button key={id} className={`drumPad tom ${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, 0))}><span>{drumLabels[id]}</span><kbd>{keyLabel(id)}</kbd></button>)}</div><div className="drumKitBottom">{["hihat", "kick", "snare"].map((id) => <button key={id} className={`drumPad ${id} ${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, 0))}><span>{drumLabels[id]}</span><kbd>{keyLabel(id)}</kbd></button>)}</div></div>}
    {instrument === "xylophone" && <div className="noteBoard kalimbaBoard">{brightNotes.map(([name, frequency], i) => { const id = `xylophone-${i}`; return <button key={name} style={{ height: `${115 + Math.abs(5.5 - i) * 10}px` }} className={`${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, frequency))}><span>{name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div>}
    {instrument === "synth" && <div className="noteBoard synthBoard">{melodicNotes.map(([name, frequency], i) => { const id = `synth-${i}`; return <button key={name} className={`${active.has(id) ? "playing" : ""} ${bindingTarget === id ? "binding" : ""}`} onPointerDown={() => activate(id, () => void play(id, frequency / 2, i % 2 ? "square" : "sawtooth", 1.8))}><span>{name}</span><kbd>{keyLabel(id)}</kbd></button>; })}</div>}
    <div className="studioExtras recorderOnly">
      <section className="creationRecorder">
        <div><span className="eyebrow"><Mic /> Creation recorder</span><h4>Capture what you play</h4><p>Records only the sounds made inside this studio—never your microphone.</p></div>
        <div className="recorderActions"><button className={recording ? "recording" : ""} onClick={recording ? stopStudioRecording : startStudioRecording}>{recording ? <><Pause /> Stop · {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}</> : <><CircleDot /> Start recording</>}</button>{recordingUrl && <><audio src={recordingUrl} controls /><a href={recordingUrl} download={`bloom-${instrument}-creation.webm`}>Download</a></>}</div>
        {albumMode && recordingDataUrl && <div className="saveTrackRow"><input value={trackName} onChange={(event) => setTrackName(event.target.value)} placeholder="Name your tune, for example: Sunday Sky" /><button onClick={saveToAlbum}><Plus /> Add to My Album</button></div>}
      </section>
    </div>
    {albumMode && <section className="myAlbum"><div className="albumHead"><div><span className="eyebrow"><Archive /> My Album</span><h4>Your original music</h4></div><b>{album.length} {album.length === 1 ? "track" : "tracks"}</b></div>{album.length === 0 ? <div className="albumEmpty"><Mic /><p>Record a tune above, name it, and add it to your album.</p></div> : <div className="albumTracks">{album.map((track, index) => <article key={track.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{track.title}</b><small>{track.instrument} · {new Date(track.createdAt).toLocaleDateString()}</small></div><audio src={track.audio} controls /><a href={track.audio} download={`${track.title}.webm`}>Download</a><button aria-label={`Delete ${track.title}`} onClick={() => setAlbum((current) => current.filter((item) => item.id !== track.id))}><Trash2 /></button></article>)}</div>}</section>}
    <p className="sampleCredit">Melodic recordings: tonejs-instruments contributors and original sample authors · CC BY 3.0. Acoustic drum recordings: Web Audio Samples. Internet is required the first time each recording loads.</p>
  </section>;
}
function MoodMusic({ setView }: { setView: (v: View) => void }) {
  type Mode = "soothing" | "romantic" | "party" | "sleep" | "peaceful" | "focus";
  const modes: Record<Mode, { label: string; title: string; reason: string; playlist: string; color: string; examples: string[] }> = {
    soothing: { label: "Soothing songs", title: "Soft songs, familiar voices", reason: "Gentle vocal tracks for company when you want comfort, not silence.", playlist: "37i9dQZF1DX4WYpdgoIcn6", color: "#dce9df", examples: ["Soft pop and acoustic songs", "Easy-listening vocals", "Gentle current favourites"] },
    romantic: { label: "Romantic", title: "Romantic songs for a softer mood", reason: "Love songs and slow favourites for a warm, dreamy listen.", playlist: "0fACn1Axw1sBcozazZFbsJ", color: "#f2dce2", examples: ["Die With A Smile — Lady Gaga & Bruno Mars", "BIRDS OF A FEATHER — Billie Eilish", "Young And Beautiful — Lana Del Rey"] },
    party: { label: "Party & cheer up", title: "Turn the energy back up", reason: "Recognisable pop and dance songs when you want to move, sing, or reset the room.", playlist: "37i9dQZF1DX9EM98aZosoy", color: "#f5e1a9", examples: ["Uptown Funk — Mark Ronson & Bruno Mars", "Don't Stop The Music — Rihanna", "Shut Up and Dance — WALK THE MOON"] },
    sleep: { label: "Sleep", title: "Music for switching off", reason: "A low-stimulation playlist for winding down and helping the night feel quieter.", playlist: "37i9dQZF1DWZd79rJ6a7lp", color: "#dcdced", examples: ["Slow ambient sleep tracks", "Quiet nighttime soundscapes", "Low-stimulation instrumentals"] },
    peaceful: { label: "Peaceful instrumental", title: "No lyrics, no pressure", reason: "Peaceful piano when words feel like too much.", playlist: "37i9dQZF1DX4sWSpwq3LiO", color: "#dfeadf", examples: ["Ryos — Xaverius Love", "New Light — Dalby", "Silent Bloom — Aquilegia"] },
    focus: { label: "Focus", title: "Settle into one thing", reason: "Steady background music that can make starting feel less noisy.", playlist: "37i9dQZF1DX8NTLI2TtZa6", color: "#e3e8d8", examples: ["Low-distraction focus tracks", "Steady electronic background music", "Instrumental concentration music"] },
  };
  const modeForMood = (value: string | null): Mode => value === "happy" ? "party" : value === "tired" ? "sleep" : value === "sad" ? "soothing" : value === "anxious" || value === "annoyed" ? "peaceful" : "soothing";
  const [mode, setMode] = useState<Mode>(() => modeForMood(localStorage.getItem(userStorageKey("bloom-mood"))));
  const library: Record<Mode, { title: string; artist: string; url: string }[]> = {
    soothing: [1, 3, 5].map((n, i) => ({ title: ["Soft Landing", "A Little Lighter", "Stay Awhile"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
    romantic: [2, 8, 10].map((n, i) => ({ title: ["Warm Evening", "Close to You", "Slow Dancing Lights"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
    party: [4, 7, 9].map((n, i) => ({ title: ["Good Energy", "Move Again", "Bright Night"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
    sleep: [11, 13, 15].map((n, i) => ({ title: ["Lights Down", "Night Drift", "Quiet Hours"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
    peaceful: [6, 12, 16].map((n, i) => ({ title: ["Still Water", "Open Window", "Breathe Slowly"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
    focus: [14, 17, 1].map((n, i) => ({ title: ["Clear Path", "One Thing", "Steady Mind"][i], artist: "SoundHelix", url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3` })),
  };
  const [trackIndex, setTrackIndex] = useState(0);
  useEffect(() => {
    const update = (event: Event) => {
      setMode(modeForMood((event as CustomEvent<string>).detail));
    };
    window.addEventListener("bloom-mood", update);
    return () => window.removeEventListener("bloom-mood", update);
  }, []);
  const current = modes[mode];
  const tracks = library[mode];
  const track = tracks[trackIndex] || tracks[0];
  const selectMode = (next: Mode) => { setMode(next); setTrackIndex(0); };
  return (
    <div className="page innerPage moodMusicPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow"><Heart /> Music that meets you here</span>
          <h2>What do you want to hear right now?</h2>
          <p>Choose actual songs, party music, romantic music, sleep sounds, peaceful instrumentals, or focus music. Buddy simply suggests where to begin.</p>
        </div>
        <button className="textBtn" onClick={() => setView("Buddy")}>Talk to Buddy first <ChevronRight /></button>
      </div>
      <section className="makeMusicBanner"><div><span className="eyebrow"><Waves /> Original composition</span><h3>Create your own music</h3><p>Use a focused collection of instruments, record your compositions, and curate a personal album.</p></div><button className="primary" onClick={() => setView("Music Studio")}><Play /> Open studio <ChevronRight /></button></section>
      <section className="moodPicker" aria-label="Choose a music style">
        {(Object.keys(modes) as Mode[]).map((key) => <button key={key} className={mode === key ? "selected" : ""} onClick={() => selectMode(key)}>{modes[key].label}</button>)}
      </section>
      <section className="moodRecommendation" style={{ background: `linear-gradient(125deg, ${current.color}, #f7f4ed)` }}>
        <div>
          <span className="eyebrow"><Waves /> Recommended listening: {current.label}</span>
          <h3>{current.title}</h3>
          <p>{current.reason}</p>
          <small>Press Play when you are ready. Bloom never starts sound unexpectedly.</small>
        </div>
        <div className="bloomPlayer">
          <div className="nowPlaying"><span>NOW PLAYING IN BLOOM</span><h4>{track.title}</h4><p>{track.artist} · {current.label}</p></div>
          <audio key={track.url} controls preload="metadata" src={track.url} onEnded={() => setTrackIndex((trackIndex + 1) % tracks.length)}>Your browser does not support audio playback.</audio>
          <div className="playerNav"><button aria-label="Previous track" onClick={() => setTrackIndex((trackIndex - 1 + tracks.length) % tracks.length)}><ChevronRight /></button><span>{trackIndex + 1} / {tracks.length}</span><button aria-label="Next track" onClick={() => setTrackIndex((trackIndex + 1) % tracks.length)}><ChevronRight /></button></div>
          <div className="bloomTrackList">{tracks.map((item, i) => <button key={item.url} className={i === trackIndex ? "active" : ""} onClick={() => setTrackIndex(i)}><span><Play /></span><div><b>{item.title}</b><small>{item.artist}</small></div><em>{i === trackIndex ? "Selected" : "Play"}</em></button>)}</div>
          <p className="musicCredit">Music: SoundHelix, licensed CC BY. Track titles are Bloom listening labels.</p>
        </div>
      </section>
      <section className="musicPrivacy"><ShieldCheck /><div><b>Music now plays inside Bloom</b><p>Buddy uses a broad mood only to select the first category. These are reusable licensed tracks—not copied Spotify songs—and your private Buddy message is never sent to another music service.</p></div></section>
    </div>
  );
}
function MusicStudioPage({ setView }: { setView: (v: View) => void }) {
  return <div className="page innerPage musicStudioPage"><div className="pageIntro"><div><span className="eyebrow"><Waves /> Bloom Music Studio</span><h2>Compose at your own pace.</h2><p>Instruments, recording tools, and original work in one considered workspace.</p></div><button className="textBtn" onClick={() => setView("Mood Music")}>Back to Mood Music <ChevronRight /></button></div><InstrumentStudio albumMode /></div>;
}
function LegacyInsights({ setView }: { setView: (v: View) => void }) {
  type Entry = { id: number; content: string; createdAt: string };
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    api<Entry[]>("/journal")
      .then(setEntries)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);
  const now = Date.now();
  const recent = entries.filter(
    (e) => now - new Date(e.createdAt).getTime() < 7 * 86400000,
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
      count: recent.filter((e) => {
        const x = new Date(e.createdAt);
        return x.toDateString() === d.toDateString();
      }).length,
    };
  });
  const text = recent.map((e) => e.content.toLowerCase()).join(" ");
  const groups = [
    {
      name: "Pressure & responsibilities",
      words: [
        "work",
        "study",
        "exam",
        "deadline",
        "meeting",
        "pressure",
        "busy",
        "task",
      ],
    },
    {
      name: "Rest & energy",
      words: ["sleep", "tired", "rest", "energy", "exhausted", "calm"],
    },
    {
      name: "Relationships",
      words: [
        "friend",
        "family",
        "partner",
        "people",
        "alone",
        "lonely",
        "talked",
      ],
    },
    {
      name: "Worry & uncertainty",
      words: [
        "anxious",
        "anxiety",
        "worry",
        "worried",
        "overthink",
        "nervous",
        "uncertain",
      ],
    },
  ]
    .map((g) => ({
      ...g,
      count: g.words.reduce(
        (n, w) => n + (text.match(new RegExp(`\\b${w}\\w*`, "g"))?.length || 0),
        0,
      ),
    }))
    .sort((a, b) => b.count - a.count);
  const top = groups[0];
  const actions = [
    { name: "Going outside", words: ["walk", "outside", "park", "fresh air"] },
    {
      name: "Connecting with someone",
      words: ["called", "talked", "friend", "family"],
    },
    { name: "Resting", words: ["rest", "slept", "nap", "break"] },
    {
      name: "Music or calming sound",
      words: ["music", "song", "rain", "sound"],
    },
  ]
    .map((a) => ({
      ...a,
      count: a.words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.count - a.count);
  const helpful = actions[0];
  const evidence = (words: string[]) =>
    recent
      .filter((e) => words.some((w) => e.content.toLowerCase().includes(w)))
      .slice(0, 3);
  const enough = recent.filter((e) => e.content.trim()).length >= 2;
  const nextAction =
    top?.name === "Pressure & responsibilities"
      ? "Choose one task that can be “good enough” today, then stop."
      : top?.name === "Rest & energy"
        ? "Protect a short, screen-free rest window today."
        : top?.name === "Relationships"
          ? "Send one honest message to someone who feels safe."
          : top?.name === "Worry & uncertainty"
            ? "Write the worry down, then separate what you can control from what you cannot."
            : "Add a short journal note tonight so Bloom can notice what repeats.";
  if (loading)
    return (
      <div className="page innerPage">
        <div className="insightsEmpty card">
          Reading your recent reflections…
        </div>
      </div>
    );
  return (
    <div className="page innerPage">
      <div className="pageIntro insightIntro">
        <div>
          <span className="eyebrow">
            <Sparkles /> Useful, not diagnostic
          </span>
          <h2>Your week, made clearer.</h2>
          <p>
            Insights are based only on your saved journal entries and never
            label your mental health.
          </p>
        </div>
        <button className="primary" onClick={() => setView("Journal")}>
          <Plus /> Add reflection
        </button>
      </div>
      <section className="insightsExplain">
        <div>
          <span className="eyebrow">
            <Eye /> What this feature does
          </span>
          <h3>Insights turns your journal into useful self-awareness.</h3>
          <p>
            You write naturally in Journal. Bloom privately notices repeated
            topics and the small actions that may be helping, then suggests one
            realistic thing to try. It never diagnoses you or scores your
            emotions.
          </p>
        </div>
        <div className="insightSteps">
          <div>
            <b>1</b>
            <span><strong>You reflect</strong><small>Save short notes about your days.</small></span>
          </div>
          <ChevronRight />
          <div>
            <b>2</b>
            <span><strong>Bloom notices</strong><small>Repeated themes become visible.</small></span>
          </div>
          <ChevronRight />
          <div>
            <b>3</b>
            <span><strong>You choose</strong><small>Try one gentle next action.</small></span>
          </div>
        </div>
      </section>
      {error ? (
        <section className="card insightsEmpty">
          <h3>Insights cannot reach your journal.</h3>
          <p>Start the Java backend, then return here.</p>
        </section>
      ) : !enough ? (
        <section className="card insightsEmpty">
          <Sparkles />
          <span className="insightBadge">FOR A NEW USER</span>
          <h3>Start with two honest, short reflections.</h3>
          <p>
            For example, if you mention deadlines several times and later write
            that a walk helped, Insights may show “pressure is taking space” and
            suggest protecting a short outdoor break. It only uses what you
            actually save—never invented assumptions.
          </p>
          <div className="starterPrompts">
            <button onClick={() => setView("Journal")}>What took most of my energy today?</button>
            <button onClick={() => setView("Journal")}>What made today slightly easier?</button>
          </div>
          <button className="primary" onClick={() => setView("Journal")}> 
            Write a reflection <ArrowUpRight />
          </button>
        </section>
      ) : (
        <>
          <section className="insightSummary">
            <div>
              <small>LAST 7 DAYS</small>
              <strong>{recent.length}</strong>
              <span>reflections saved</span>
            </div>
            <div className="weekBars">
              {days.map((d, i) => (
                <div key={i}>
                  <i
                    style={{
                      height: `${Math.max(8, Math.min(52, d.count * 18))}px`,
                    }}
                    className={d.count ? "hasData" : ""}
                  />
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
            <div>
              <small>CLEAREST THEME</small>
              <strong className="themeName">
                {top.count ? top.name : "Still forming"}
              </strong>
              <span>
                {top.count
                  ? `${top.count} related mentions`
                  : "Keep reflecting naturally"}
              </span>
            </div>
          </section>
          <div className="usefulInsights">
            <article className="card">
              <span className="insightBadge">01 · NOTICE</span>
              <h3>
                {top.count
                  ? `${top.name} has been taking space.`
                  : "Your themes are still varied."}
              </h3>
              <p>
                {top.count
                  ? "This appeared most often in your recent writing. It is a topic to notice, not a diagnosis."
                  : "No one subject dominates your recent entries, which is useful information too."}
              </p>
              <button
                onClick={() => setOpen(open === "theme" ? null : "theme")}
              >
                See the evidence <ChevronRight />
              </button>
              {open === "theme" && (
                <div className="evidenceList">
                  {evidence(top.words).map((e) => (
                    <blockquote key={e.id}>
                      “{e.content.slice(0, 150)}
                      {e.content.length > 150 ? "…" : ""}”
                      <small>
                        {new Date(e.createdAt).toLocaleDateString()}
                      </small>
                    </blockquote>
                  ))}
                </div>
              )}
            </article>
            <article className="card">
              <span className="insightBadge">02 · WHAT MAY HELP</span>
              <h3>
                {helpful.count
                  ? `${helpful.name} appears in your week.`
                  : "Bloom cannot tell what helped yet."}
              </h3>
              <p>
                {helpful.count
                  ? "You mentioned this alongside your recent experiences. Notice whether it genuinely changes how you feel next time."
                  : "In your next entry, add one sentence about what made the moment easier—even slightly."}
              </p>
              <button onClick={() => setView("Journal")}>
                {helpful.count ? "Track it next time" : "Add what helped"}{" "}
                <ChevronRight />
              </button>
            </article>
            <article className="card nextStep">
              <span className="insightBadge">03 · TRY TODAY</span>
              <h3>One gentle experiment</h3>
              <p>{nextAction}</p>
              <button className="primary" onClick={() => setView("Buddy")}>
                Talk it through with Buddy <ArrowUpRight />
              </button>
            </article>
          </div>
          <p className="insightNote">
            These are possible patterns from your own words. They can be
            incomplete and are not medical advice.
          </p>
        </>
      )}
    </div>
  );
}
function Goals() {
  type Goal = { id: number; title: string; description: string; category: string; deadline?: string; dailyStep: string; completedSteps: number; totalSteps: number; points: number; completed: boolean; dailyDoneDate?: string };
  const blank = { title: "", description: "", category: "Personal", deadline: "", dailyStep: "", totalSteps: 4, points: 10 };
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  useEffect(() => { api<Goal[]>("/goals").then(setGoals).catch(() => setError("Goals could not connect to the Bloom backend.")); }, []);
  const openNew = () => { setEditing(null); setForm(blank); setError(""); setEditorOpen(true); };
  const openEdit = (goal: Goal) => { setEditing(goal); setForm({ title: goal.title, description: goal.description || "", category: goal.category || "Personal", deadline: goal.deadline || "", dailyStep: goal.dailyStep || "", totalSteps: goal.totalSteps, points: goal.points }); setEditorOpen(true); };
  const saveGoal = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    const payload = { ...form, deadline: form.deadline || null, completedSteps: editing?.completedSteps || 0, completed: editing?.completed || false, dailyDoneDate: editing?.dailyDoneDate || null };
    try { const saved = await api<Goal>(editing ? `/goals/${editing.id}` : "/goals", { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) }); setGoals((items) => editing ? items.map((item) => item.id === saved.id ? saved : item) : [saved, ...items]); setEditorOpen(false); }
    catch { setError("Bloom could not save this goal. Check that the Java backend is running."); }
  };
  const updateGoal = async (goal: Goal, changes: Partial<Goal>) => {
    const payload = { ...goal, ...changes };
    try { const saved = await api<Goal>(`/goals/${goal.id}`, { method: "PUT", body: JSON.stringify(payload) }); setGoals((items) => items.map((item) => item.id === goal.id ? saved : item)); } catch { setError("Could not update this goal."); }
  };
  const completeDaily = (goal: Goal) => { if (goal.dailyDoneDate === today || goal.completed) return; const steps = Math.min(goal.completedSteps + 1, goal.totalSteps); void updateGoal(goal, { completedSteps: steps, dailyDoneDate: today, completed: steps >= goal.totalSteps }); };
  const removeGoal = async (goal: Goal) => { if (!window.confirm(`Delete “${goal.title}”?`)) return; try { await api<void>(`/goals/${goal.id}`, { method: "DELETE" }); setGoals((items) => items.filter((item) => item.id !== goal.id)); if (selected === goal.id) setSelected(null); } catch { setError("Could not delete this goal."); } };
  const active = goals.filter((goal) => !goal.completed);
  const daily = active.find((goal) => goal.dailyStep?.trim());
  const points = goals.reduce((sum, goal) => sum + goal.completedSteps * goal.points, 0);
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Target /> Meaningful progress
          </span>
          <h2>Goals that belong to you.</h2>
          <p>
            Long-term direction and one small daily action—without streak
            pressure.
          </p>
        </div>
        <button className="primary" onClick={openNew}>
          <Plus /> New goal
        </button>
      </div>
      {editorOpen && <form className="goalEditor card" onSubmit={saveGoal}><div className="goalEditorHead"><div><span className="eyebrow"><Target /> {editing ? "Adjust your direction" : "Choose your direction"}</span><h3>{editing ? "Edit goal" : "Create a meaningful goal"}</h3></div><button type="button" onClick={() => setEditorOpen(false)} aria-label="Close goal editor"><X /></button></div><div className="goalFields"><label>Goal title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Example: Build my portfolio" /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Personal</option><option>Learning</option><option>Health</option><option>Creative</option><option>Career</option><option>Relationships</option></select></label><label>Target date<input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></label><label>Meaningful steps<input type="number" min="1" max="50" value={form.totalSteps} onChange={(e) => setForm({ ...form, totalSteps: Number(e.target.value) })} /></label></div><label className="goalWide">Why does this matter?<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A gentle reminder of why you chose this…" /></label><label className="goalWide">Small daily action<input required value={form.dailyStep} onChange={(e) => setForm({ ...form, dailyStep: e.target.value })} placeholder="Example: Work on it for 10 minutes" /></label><div className="goalEditorActions"><span>Each completed step earns <b>{form.points} calm points</b>.</span><button className="primary">{editing ? "Save changes" : "Create goal"}</button></div></form>}
      {error && <p className="goalError">{error}</p>}
      {daily ? <div className="dailyGoal card">
        <div>
          <span className="eyebrow">
            <Sun /> Today’s small step
          </span>
          <h3>{daily.dailyStep}</h3>
          <p>
            A small step toward “{daily.title}”. Complete it for {daily.points} gentle points.
          </p>
        </div>
        <button
          className={daily.dailyDoneDate === today ? "primary completed" : "primary"}
          onClick={() => completeDaily(daily)}
        >
          {daily.dailyDoneDate === today ? (
            <>
              <Check /> Completed
            </>
          ) : (
            <>
              Complete today <Trophy />
            </>
          )}
        </button>
      </div> : <div className="dailyGoal card emptyDaily"><div><span className="eyebrow"><Sun /> Today’s small step</span><h3>Add a goal to choose today’s gentle action.</h3><p>Progress can begin with something very small.</p></div><button className="primary" onClick={openNew}><Plus /> Create goal</button></div>}
      <div className="pointsBar">
        <span>
          <Trophy /> {points} calm points
        </span>
        <div>
          <i style={{ width: `${Math.min((points / 50) * 100, 100)}%` }} />
        </div>
        <small>
          {points < 50 ? `${50 - points} points until your first activity unlocks` : `${Math.floor(points / 50)} calming ${Math.floor(points / 50) === 1 ? "activity" : "activities"} unlocked`}
        </small>
      </div>
      <h3 className="sectionTitle">Long-term goals</h3>
      <div className="goalList">
        {goals.length === 0 && <div className="goalEmpty card"><Target /><h3>No goals yet</h3><p>Create one direction and give it one small action for today.</p><button className="primary" onClick={openNew}><Plus /> New goal</button></div>}
        {goals.map((goal) => { const progress = Math.round(goal.completedSteps / Math.max(goal.totalSteps, 1) * 100); const open = selected === goal.id; return <article className={`card ${goal.completed ? "goalComplete" : ""}`} key={goal.id}><div className="goalTop"><div className="iconBox purple">{goal.completed ? <Check /> : <Target />}</div><span>{goal.completed ? "COMPLETED" : "ACTIVE"} · {goal.category} · {goal.deadline ? `BY ${new Date(`${goal.deadline}T12:00:00`).toLocaleDateString()}` : "NO DEADLINE"}</span></div><h3>{goal.title}</h3><p>{goal.description || "A goal you chose for yourself."}</p><div className="bar"><span style={{ width: `${progress}%` }} /></div><footer><b>{goal.completedSteps} of {goal.totalSteps} meaningful steps · {progress}%</b><button onClick={() => setSelected(open ? null : goal.id)}>{open ? "Close" : "Open goal"} <ChevronRight /></button></footer>{open && <div className="goalDetails"><div><span>Today’s action</span><b>{goal.dailyStep}</b></div><div className="goalStepControls"><button disabled={goal.completedSteps === 0} onClick={() => updateGoal(goal, { completedSteps: Math.max(0, goal.completedSteps - 1), completed: false })}>− Step</button><button disabled={goal.completed} onClick={() => updateGoal(goal, { completedSteps: Math.min(goal.totalSteps, goal.completedSteps + 1), completed: goal.completedSteps + 1 >= goal.totalSteps })}>+ Step</button><button onClick={() => openEdit(goal)}>Edit</button><button className="danger" onClick={() => removeGoal(goal)}>Delete</button></div></div>}</article>; })}
      </div>
    </div>
  );
}
function Timeline() {
  type TimelineEvent = { id: string; date: string; title: string; detail: string; kind: "Memory" | "Journal" | "Goal"; label: string; mediaUrl?: string; mediaType?: string };
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.allSettled([
      api<Array<{ id: number; title?: string; text: string; tag: string; mood?: string; occurredAt?: string; createdAt: string; mediaUrl?: string; mediaType?: string }>>("/memories"),
      api<Array<{ id: number; content: string; createdAt: string }>>("/journal"),
      api<Array<{ id: number; title: string; description?: string; category?: string; completed: boolean; completedSteps: number; totalSteps: number; dailyDoneDate?: string; createdAt: string }>>("/goals"),
    ]).then(([memoriesResult, journalResult, goalsResult]) => {
      const collected: TimelineEvent[] = [];
      if (memoriesResult.status === "fulfilled") memoriesResult.value.forEach((memory) => collected.push({ id: `memory-${memory.id}`, date: memory.occurredAt || memory.createdAt, title: memory.title || memory.text.slice(0, 72), detail: memory.title ? memory.text : `${memory.tag}${memory.mood ? ` · ${memory.mood}` : ""}`, kind: "Memory", label: memory.tag, mediaUrl: memory.mediaUrl, mediaType: memory.mediaType }));
      if (journalResult.status === "fulfilled") journalResult.value.filter((entry) => entry.content.trim()).forEach((entry) => collected.push({ id: `journal-${entry.id}`, date: entry.createdAt, title: entry.content.trim().split(/\n/)[0].slice(0, 72), detail: entry.content.trim().slice(0, 240), kind: "Journal", label: "Private reflection" }));
      if (goalsResult.status === "fulfilled") goalsResult.value.forEach((goal) => collected.push({ id: `goal-${goal.id}`, date: goal.completed && goal.dailyDoneDate ? `${goal.dailyDoneDate}T12:00:00` : goal.createdAt, title: goal.completed ? `Completed: ${goal.title}` : `Started: ${goal.title}`, detail: goal.description || `${goal.completedSteps} of ${goal.totalSteps} meaningful steps completed.`, kind: "Goal", label: goal.completed ? "Achievement" : goal.category || "Goal" }));
      setEvents(collected.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); setLoading(false);
    });
  }, []);
  const visible = events.filter((event) => (filter === "All" || event.kind === filter) && `${event.title} ${event.detail} ${event.label}`.toLowerCase().includes(query.toLowerCase()));
  const groups = visible.reduce<Record<string, TimelineEvent[]>>((result, event) => { const date = new Date(event.date); const key = `${date.getFullYear()}|${date.toLocaleDateString(undefined, { month: "long" })}`; (result[key] ||= []).push(event); return result; }, {});
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Clock3 /> Your story
          </span>
          <h2>Life Timeline</h2>
          <p>A private record of the moments that became part of you.</p>
        </div>
        <div className="timelineSearch"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your story" aria-label="Search timeline" /></div>
      </div>
      <div className="timelineSummary"><div><b>{events.length}</b><span>moments collected</span></div><div><b>{events.filter((event) => event.kind === "Memory").length}</b><span>memories</span></div><div><b>{events.filter((event) => event.kind === "Journal").length}</b><span>reflections</span></div><div><b>{events.filter((event) => event.kind === "Goal" && event.title.startsWith("Completed:")).length}</b><span>goals achieved</span></div></div>
      <div className="filter timelineFilters">{[["All", "Everything"], ["Memory", "Memories"], ["Journal", "Journals"], ["Goal", "Goals"]].map(([value, label]) => <button key={value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
      <div className="timeline">
        {loading && <div className="timelineEmpty card"><Clock3 /><h3>Collecting your story…</h3></div>}
        {!loading && visible.length === 0 && <div className="timelineEmpty card"><Clock3 /><h3>{events.length ? "No moments match this view" : "Your timeline begins with you"}</h3><p>{events.length ? "Try another filter or search phrase." : "Add a memory, write in your journal, or create a goal. It will appear here automatically."}</p></div>}
        {Object.entries(groups).map(([group, items]) => { const [year, month] = group.split("|"); return <React.Fragment key={group}><div className="year"><b>{year}</b><span>{month}</span></div>{items.map((event) => <article key={event.id} className={`timeline${event.kind}`}><div className="dot" /><time>{new Date(event.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}<span>{new Date(event.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></time><div className="card"><div className="timelineCardTop"><small>{event.kind} · {event.label}</small><span>{event.kind === "Memory" ? <Archive /> : event.kind === "Journal" ? <BookOpen /> : <Target />}</span></div><h3>{event.title}</h3><p>{event.detail}</p>{event.mediaUrl && (event.mediaType?.startsWith("image/") ? <img className="timelineMedia" src={event.mediaUrl} alt={event.title} /> : event.mediaType?.startsWith("video/") ? <video className="timelineMedia" src={event.mediaUrl} controls /> : <audio className="timelineAudio" src={event.mediaUrl} controls />)}</div></article>)}</React.Fragment>; })}
      </div>
    </div>
  );
}

const soundChoices = [
  {
    name: "Gentle rain",
    detail: "Soft, steady rainfall",
    icon: CloudRain,
    color: "#dbe9ee",
    tone: "rain",
  },
  {
    name: "Ocean tide",
    detail: "Slow waves on the shore",
    icon: Waves,
    color: "#d9e9e5",
    tone: "ocean",
  },
  {
    name: "Forest breeze",
    detail: "Leaves moving in the wind",
    icon: Trees,
    color: "#e0ebdc",
    tone: "forest",
  },
  {
    name: "Quiet fire",
    detail: "A warm evening crackle",
    icon: Flame,
    color: "#f2e3d6",
    tone: "fire",
  },
  { name: "Thunderstorm", detail: "Rain with distant rolling thunder", icon: CloudRain, color: "#d9dce7", tone: "thunder" },
  { name: "Night crickets", detail: "A calm summer night", icon: Moon, color: "#e4e0ed", tone: "night" },
  { name: "Flowing river", detail: "Clear water over smooth stones", icon: Waves, color: "#d8ebe9", tone: "river" },
  { name: "Soft wind", detail: "Air moving through an open space", icon: Wind, color: "#e7ece9", tone: "wind" },
  { name: "Deep brown noise", detail: "Low, warm sound for sleep", icon: Coffee, color: "#e8dfd7", tone: "brown" },
] as const;
function Sounds() {
  const [active, setActive] = useState<string[]>([]);
  const [volume, setVolume] = useState(42);
  const [minutes, setMinutes] = useState(15);
  const [remaining, setRemaining] = useState(0);
  const audio = useRef(new Map<string, {
    ctx: AudioContext;
    source: AudioBufferSourceNode;
    gain: GainNode;
  }>());
  const stop = (tone?: string) => {
    const targets = tone ? [[tone, audio.current.get(tone)] as const] : [...audio.current.entries()];
    targets.forEach(([name, track]) => { try { track?.source.stop(); void track?.ctx.close(); } catch {} audio.current.delete(name); });
    setActive((items) => tone ? items.filter((item) => item !== tone) : []);
    if (!tone) setRemaining(0);
  };
  const play = (tone: string) => {
    if (active.includes(tone)) {
      stop(tone);
      return;
    }
    const ctx = new AudioContext();
    const duration = 16;
    const length = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      let dropLife = 0;
      let dropPhase = 0;
      let dropFrequency = 2400;
      let crackle = 0;
      for (let i = 0; i < length; i++) {
        const time = i / ctx.sampleRate;
        const white = Math.random() * 2 - 1;
        smooth = smooth * 0.985 + white * 0.015;
        let sample = 0;
        if (tone === "rain") {
          if (dropLife <= 0 && Math.random() < 0.000055) { dropLife = Math.floor(ctx.sampleRate * (0.07 + Math.random() * 0.08)); dropPhase = 0; dropFrequency = 620 + Math.random() * 720; }
          const hiss = white * 0.13 + smooth * 0.36;
          let drop = 0;
          if (dropLife > 0) { const envelope = dropLife / (ctx.sampleRate * 0.15); drop = Math.sin(dropPhase) * Math.min(1, envelope) * 0.1; dropPhase += 2 * Math.PI * dropFrequency / ctx.sampleRate; dropFrequency *= 0.99988; dropLife--; }
          sample = hiss + drop;
        } else if (tone === "ocean") {
          const swell = 0.12 + 0.34 * Math.pow((1 + Math.sin((2 * Math.PI * time / 7.5) + channel * 0.6)) / 2, 1.7);
          const foam = white * (0.018 + swell * 0.12);
          sample = smooth * 2.7 * swell + foam;
        } else if (tone === "forest") {
          const breeze = (smooth * 1.9 + white * 0.018) * (0.14 + 0.12 * Math.sin(2 * Math.PI * time / 6.7 + channel));
          const leafWave = Math.max(0, Math.sin(2 * Math.PI * time / 2.9 + channel * 0.8));
          const leaves = white * 0.055 * leafWave * leafWave + Math.sin(2 * Math.PI * (240 + 35 * Math.sin(time * 1.4)) * time) * 0.006 * leafWave;
          let birds = 0;
          for (const start of [3.6, 11.8]) { const dt = time - start - channel * 0.04; if (dt >= 0 && dt < 0.58) { const envelope = Math.sin(Math.PI * dt / 0.58); const frequency = 980 + 360 * Math.sin(Math.PI * dt / 0.58); birds += Math.sin(2 * Math.PI * frequency * dt) * envelope * 0.045; } }
          sample = breeze + leaves + birds;
        } else if (tone === "fire") {
          if (Math.random() < 0.0018) crackle = 0.18 + Math.random() * 0.7;
          crackle *= 0.972;
          const smallCrackle = Math.random() < 0.012 ? white * (0.08 + Math.random() * 0.16) : 0;
          const pop = white * crackle;
          const flameMovement = 0.65 + 0.35 * Math.sin(2 * Math.PI * time / 1.9 + channel * 0.5);
          const ember = smooth * 0.68 * flameMovement + Math.sin(2 * Math.PI * 64 * time) * 0.011;
          sample = ember + pop * 0.34 + smallCrackle + white * 0.012;
        } else if (tone === "thunder") {
          const rain = white * 0.09 + smooth * 0.2;
          const thunderTimes = [3.2, 9.6, 13.9];
          let rumble = 0;
          for (const start of thunderTimes) { const dt = time - start; if (dt >= 0 && dt < 3.2) { const envelope = Math.exp(-dt * 1.15) * Math.min(1, dt * 5); rumble += (Math.sin(2 * Math.PI * 43 * dt) + smooth * 8) * envelope * 0.12; } }
          sample = rain + rumble;
        } else if (tone === "night") {
          const ambience = smooth * 0.42;
          const cycle = time % (channel ? 1.37 : 1.09);
          const chirpEnvelope = cycle < 0.16 ? Math.sin(Math.PI * cycle / 0.16) : 0;
          const cricket = Math.sin(2 * Math.PI * (3850 + channel * 260) * time) * chirpEnvelope * 0.075;
          sample = ambience + cricket;
        } else if (tone === "river") {
          const current = 0.12 + 0.04 * Math.sin(2 * Math.PI * time / 2.3 + channel);
          const sparkle = white * current;
          const bubbleCycle = (time + channel * 0.37) % 1.7;
          const bubbleEnvelope = bubbleCycle < 0.11 ? Math.sin(Math.PI * bubbleCycle / 0.11) : 0;
          const bubbles = Math.sin(2 * Math.PI * (620 + 900 * bubbleCycle) * time) * bubbleEnvelope * 0.1;
          sample = sparkle + smooth * 0.48 + bubbles;
        } else if (tone === "wind") {
          const gust = 0.08 + 0.26 * Math.pow((1 + Math.sin(2 * Math.PI * time / 6.8 + channel * 1.25)) / 2, 2.4);
          const whistleFrequency = 360 + 55 * Math.sin(2 * Math.PI * time / 4.7);
          const whistle = Math.sin(2 * Math.PI * whistleFrequency * time) * gust * 0.035;
          sample = smooth * 2.35 * gust + white * 0.012 + whistle;
        } else {
          const subRumble = Math.sin(2 * Math.PI * 54 * time) * 0.012 + Math.sin(2 * Math.PI * 83 * time) * 0.007;
          sample = smooth * 3.6 + subRumble;
        }
        data[i] = Math.max(-0.82, Math.min(0.82, sample));
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = tone === "rain" ? "highpass" : tone === "fire" || tone === "night" || tone === "river" || tone === "wind" ? "bandpass" : "lowpass";
    filter.frequency.value = tone === "rain" ? 520 : tone === "forest" ? 1900 : tone === "night" ? 3900 : tone === "fire" ? 1050 : tone === "river" ? 1350 : tone === "wind" ? 480 : tone === "thunder" ? 520 : tone === "brown" ? 230 : 620;
    filter.Q.value = tone === "night" ? 2.2 : tone === "wind" ? 0.85 : tone === "river" ? 0.42 : tone === "fire" ? 0.65 : 0.3;
    const gain = ctx.createGain();
    gain.gain.value = volume / 135;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 16; compressor.ratio.value = 4; compressor.attack.value = 0.006; compressor.release.value = 0.22;
    source.connect(filter).connect(gain).connect(compressor).connect(ctx.destination);
    source.start();
    audio.current.set(tone, { ctx, source, gain });
    setActive((items) => [...items, tone]);
  };
  useEffect(() => {
    audio.current.forEach((track) => { track.gain.gain.value = volume / Math.max(135, active.length * 80); });
  }, [volume, active.length]);
  useEffect(() => {
    if (!active.length) { setRemaining(0); return; }
    setRemaining(minutes * 60);
    const id = window.setInterval(() => setRemaining((seconds) => {
      if (seconds <= 1) { audio.current.forEach((track) => { try { track.source.stop(); void track.ctx.close(); } catch {} }); audio.current.clear(); setActive([]); return 0; }
      return seconds - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [active.length, minutes]);
  useEffect(() => () => { audio.current.forEach((track) => { try { track.source.stop(); void track.ctx.close(); } catch {} }); audio.current.clear(); }, []);
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Waves /> Sound sanctuary
          </span>
          <h2>A softer place to land.</h2>
          <p>Play one sound or layer several together for sleep, focus, privacy, or a calmer room.</p>
        </div>
        {active.length > 0 && <button className="primary" onClick={() => stop()}><Pause /> Stop all ({active.length})</button>}
      </div>
      <div className="soundGrid">
        {soundChoices.map((s) => (
          <button
            className={active.includes(s.tone) ? "soundCard active" : "soundCard"}
            key={s.tone}
            onClick={() => play(s.tone)}
          >
            <span className="soundIcon" style={{ background: s.color }}>
              <s.icon />
            </span>
            <span>
              <b>{s.name}</b>
              <small>{s.detail}</small>
            </span>
            <i>{active.includes(s.tone) ? <Pause /> : <Play />}</i>
          </button>
        ))}
      </div>
      <section className="card soundControls">
        <div>
          <span>Volume</span>
          <b>{volume}%</b>
        </div>
        <input
          aria-label="Sound volume"
          type="range"
          min="5"
          max="100"
          value={volume}
          onChange={(e) => setVolume(+e.target.value)}
        />
        <div className="timerRow">
          <span>
            <TimerReset /> Stop after
          </span>
          {[10, 15, 30, 60].map((m) => (
            <button
              className={minutes === m ? "selected" : ""}
              onClick={() => setMinutes(m)}
              key={m}
            >
              {m} min
            </button>
          ))}
        </div>
        <small>{active.length ? `${active.length} ${active.length === 1 ? "sound" : "sounds"} playing · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} remaining` : "Choose one sound or combine a few. Audio stops automatically when the timer ends or you leave this page."}</small>
      </section>
    </div>
  );
}
function Breathe() {
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(60);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(
      () =>
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false);
            return 60;
          }
          return s - 1;
        }),
      1000,
    );
    return () => clearInterval(id);
  }, [running]);
  const phase =
    seconds % 10 < 4
      ? "Breathe in"
      : seconds % 10 < 6
        ? "Hold gently"
        : "Breathe out";
  return (
    <div className="page innerPage breathePage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Wind /> One quiet minute
          </span>
          <h2>Make room for one breath.</h2>
          <p>A simple 4–2–4 rhythm. Stop whenever you want.</p>
        </div>
      </div>
      <section className={running ? "breathStage running" : "breathStage"}>
        <div className="breathOrb">
          <span>{running ? phase : "Ready?"}</span>
          <small>{running ? `${seconds} seconds` : "One minute"}</small>
        </div>
        <button className="primary" onClick={() => setRunning(!running)}>
          {running ? (
            <>
              <Pause /> Pause
            </>
          ) : (
            <>
              <Play /> Begin breathing
            </>
          )}
        </button>
        <button
          className="textBtn"
          onClick={() => {
            setRunning(false);
            setSeconds(60);
          }}
        >
          Reset
        </button>
      </section>
      <div className="breathNotes">
        <div>
          <b>4</b>
          <span>inhale slowly</span>
        </div>
        <div>
          <b>2</b>
          <span>hold softly</span>
        </div>
        <div>
          <b>4</b>
          <span>exhale fully</span>
        </div>
      </div>
    </div>
  );
}

type MeditationPhase = {
  label: string;
  cue: string;
  seconds: number;
  kind: "inhale" | "exhale" | "chant" | "rest";
};

const meditationPractices: Array<{
  id: string;
  title: string;
  tradition: string;
  phrase: string;
  meaning: string;
  note: string;
  focus: string;
  method: string;
  symbol: string;
  sound: "omVoice" | "soHum" | "kirtan" | "arabic" | "bells" | "bowl" | "nature";
  soundLabel: string;
  colors: [string, string];
  tone: number;
  phases: MeditationPhase[];
}> = [
  {
    id: "om",
    title: "Om meditation",
    tradition: "Dharmic traditions",
    phrase: "A - U - M",
    meaning: "Let the sound move gently from the chest to the lips, then rest in silence.",
    note: "Chant in your natural voice. It should feel comfortable, never forced.",
    focus: "Voice and vibration",
    method: "One long A-U-M followed by silence",
    symbol: "ॐ",
    sound: "omVoice",
    soundLabel: "Ommmm voice",
    colors: ["#d7e7dc", "#e9dfef"],
    tone: 110,
    phases: [
      { label: "Breathe in", cue: "Inhale slowly through your nose", seconds: 4, kind: "inhale" },
      { label: "Chant Om", cue: "Release one long, comfortable A-U-M", seconds: 7, kind: "chant" },
      { label: "Rest", cue: "Notice the quiet after the sound", seconds: 3, kind: "rest" },
    ],
  },
  {
    id: "soham",
    title: "So Hum breathing",
    tradition: "Yogic meditation",
    phrase: "So · Hum",
    meaning: "Silently think “So” while breathing in and “Hum” while breathing out.",
    note: "Pronounced approximately “so-hum”. Keep your breath easy and unstrained.",
    focus: "Breath and silent mantra",
    method: "So on the inhale, Hum on the exhale",
    symbol: "SO HUM",
    sound: "soHum",
    soundLabel: "So · Hmmmm voice",
    colors: ["#d8e9e5", "#dce5f2"],
    tone: 123,
    phases: [
      { label: "So", cue: "Breathe in and silently think “So”", seconds: 4, kind: "inhale" },
      { label: "Hum", cue: "Breathe out and silently think “Hum”", seconds: 6, kind: "exhale" },
    ],
  },
  {
    id: "waheguru",
    title: "Waheguru simran",
    tradition: "Sikh remembrance",
    phrase: "Waheguru",
    meaning: "Repeat Waheguru gently and bring your attention back whenever it wanders.",
    note: "You may repeat it aloud or silently, with respect and without rushing.",
    focus: "Remembrance and repetition",
    method: "Repeat one sacred word at your pace",
    symbol: "ਵਾਹਿਗੁਰੂ",
    sound: "kirtan",
    soundLabel: "Kirtan instruments",
    colors: ["#f0e3c9", "#dbe8e4"],
    tone: 130,
    phases: [
      { label: "Settle", cue: "Take one calm, natural breath", seconds: 4, kind: "inhale" },
      { label: "Remember", cue: "Repeat “Waheguru” at your own pace", seconds: 8, kind: "chant" },
      { label: "Pause", cue: "Rest briefly and begin again", seconds: 2, kind: "rest" },
    ],
  },
  {
    id: "dhikr",
    title: "Quiet dhikr",
    tradition: "Islamic remembrance",
    phrase: "SubhanAllah",
    meaning: "Repeat “SubhanAllah” quietly while keeping a natural, unforced breath.",
    note: "The phrase means “Glory be to God”. Follow the practice in the way your tradition teaches you.",
    focus: "Remembrance and praise",
    method: "Natural breathing with gentle repetition",
    symbol: "ذِكْر",
    sound: "arabic",
    soundLabel: "Oud and frame drum",
    colors: ["#dce9df", "#d8e5ed"],
    tone: 117,
    phases: [
      { label: "Breathe", cue: "Settle into a comfortable natural breath", seconds: 4, kind: "inhale" },
      { label: "Remember", cue: "Repeat “SubhanAllah” gently", seconds: 8, kind: "chant" },
      { label: "Pause", cue: "Return attention to the heart", seconds: 2, kind: "rest" },
    ],
  },
  {
    id: "christian",
    title: "Contemplative prayer",
    tradition: "Christian practice",
    phrase: "Be still · remain present",
    meaning: "Rest quietly in God’s presence, returning to a short prayer when distracted.",
    note: "Use a familiar prayer from your own faith community if you prefer.",
    focus: "Prayerful presence",
    method: "A short prayer followed by quiet rest",
    symbol: "✝",
    sound: "bells",
    soundLabel: "Distant bells",
    colors: ["#e4e8ef", "#eee2d5"],
    tone: 132,
    phases: [
      { label: "Receive", cue: "Breathe in slowly and become still", seconds: 4, kind: "inhale" },
      { label: "Release", cue: "Breathe out and repeat your short prayer", seconds: 6, kind: "exhale" },
      { label: "Rest", cue: "Remain quietly present", seconds: 4, kind: "rest" },
    ],
  },
  {
    id: "metta",
    title: "Loving-kindness",
    tradition: "Buddhist meditation",
    phrase: "May I be safe · May I be peaceful",
    meaning: "Offer a kind wish to yourself, then extend it to someone else when ready.",
    note: "There is no need to create a special feeling. Simply return to the intention of kindness.",
    focus: "Compassion and goodwill",
    method: "Repeat kind wishes for self and others",
    symbol: "METTA",
    sound: "bowl",
    soundLabel: "Singing bowl",
    colors: ["#eadfea", "#e8ead9"],
    tone: 126,
    phases: [
      { label: "Breathe", cue: "Take one gentle breath", seconds: 4, kind: "inhale" },
      { label: "Offer kindness", cue: "Repeat the words slowly to yourself", seconds: 8, kind: "chant" },
      { label: "Receive", cue: "Let the words settle without pressure", seconds: 3, kind: "rest" },
    ],
  },
  {
    id: "silent",
    title: "Silent stillness",
    tradition: "Non-religious",
    phrase: "Notice · allow · return",
    meaning: "Notice one breath at a time and return gently whenever the mind wanders.",
    note: "No mantra or belief is required. Keep your eyes open if that feels safer.",
    focus: "Open awareness",
    method: "Observe without chanting or prayer",
    symbol: "○",
    sound: "nature",
    soundLabel: "Natural ambience",
    colors: ["#dfe9e3", "#ece9df"],
    tone: 105,
    phases: [
      { label: "Notice", cue: "Feel the breath arrive", seconds: 4, kind: "inhale" },
      { label: "Allow", cue: "Let thoughts pass without following them", seconds: 6, kind: "rest" },
      { label: "Return", cue: "Come back gently to the next breath", seconds: 4, kind: "exhale" },
    ],
  },
];

function Meditation() {
  const [practiceId, setPracticeId] = useState("om");
  const [minutes, setMinutes] = useState(5);
  const [remaining, setRemaining] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const audio = useRef<{ context: AudioContext; master: GainNode; timers: number[] } | null>(null);
  const practice = meditationPractices.find((item) => item.id === practiceId) || meditationPractices[0];
  const totalSeconds = minutes * 60;
  const elapsed = Math.max(0, totalSeconds - remaining);
  const cycleLength = practice.phases.reduce((sum, item) => sum + item.seconds, 0);
  const cycleSecond = elapsed % cycleLength;
  let phasePosition = 0;
  const phase = practice.phases.find((item) => {
    phasePosition += item.seconds;
    return cycleSecond < phasePosition;
  }) || practice.phases[0];
  const progress = totalSeconds ? Math.min(100, (elapsed / totalSeconds) * 100) : 0;
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  const stopTone = () => {
    const current = audio.current;
    if (!current) return;
    const now = current.context.currentTime;
    current.timers.forEach((timer) => window.clearInterval(timer));
    current.master.gain.cancelScheduledValues(now);
    current.master.gain.setValueAtTime(Math.max(current.master.gain.value, 0.0001), now);
    current.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    window.setTimeout(() => void current.context.close(), 550);
    audio.current = null;
  };

  const startTone = () => {
    stopTone();
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    void context.resume();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const timers: number[] = [];
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.68, context.currentTime + 0.9);
    compressor.threshold.value = -18;
    compressor.knee.value = 16;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.35;
    master.connect(compressor);
    compressor.connect(context.destination);

    const playResonance = (
      base: number,
      ratios: number[],
      duration: number,
      volume: number,
      type: OscillatorType = "sine",
      attack = 0.2,
    ) => {
      const now = context.currentTime;
      ratios.forEach((ratio, index) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(base * ratio, now);
        oscillator.detune.value = index % 2 ? -5 : 3;
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(volume / Math.max(1, index + 1), now + Math.min(attack, duration / 4));
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.05);
      });
    };

    const createNoise = (seconds: number, brown = false) => {
      const frames = Math.floor(context.sampleRate * seconds);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const data = buffer.getChannelData(0);
      let smooth = 0;
      for (let index = 0; index < frames; index += 1) {
        const white = Math.random() * 2 - 1;
        smooth = smooth * (brown ? 0.985 : 0.9) + white * (brown ? 0.015 : 0.1);
        data[index] = brown ? smooth * 3.2 : smooth;
      }
      return buffer;
    };

    const playBreath = (duration = 3.5) => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const breathGain = context.createGain();
      const now = context.currentTime;
      source.buffer = createNoise(duration + 0.2);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(430, now);
      filter.frequency.exponentialRampToValueAtTime(820, now + duration * 0.55);
      filter.frequency.exponentialRampToValueAtTime(380, now + duration);
      filter.Q.value = 0.7;
      breathGain.gain.setValueAtTime(0.0001, now);
      breathGain.gain.exponentialRampToValueAtTime(0.026, now + duration * 0.42);
      breathGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(breathGain);
      breathGain.connect(master);
      source.start(now);
      source.stop(now + duration + 0.05);
    };

    const playVocal = (kind: "om" | "hum") => {
      const now = context.currentTime;
      const duration = kind === "om" ? 10.6 : 5.8;
      const fundamental = kind === "om" ? 108 : 116;
      const startFormants = kind === "om" ? [430, 820, 2650] : [245, 1120, 2050];
      const endFormants = kind === "om" ? [245, 1120, 2050] : [220, 930, 1840];
      const vocalBus = context.createGain();
      const warmth = context.createBiquadFilter();
      const vibrato = context.createOscillator();
      const vibratoDepth = context.createGain();
      vocalBus.gain.setValueAtTime(0.0001, now);
      vocalBus.gain.exponentialRampToValueAtTime(kind === "om" ? 0.05 : 0.045, now + 0.85);
      vocalBus.gain.setValueAtTime(kind === "om" ? 0.05 : 0.045, now + duration - 1.5);
      vocalBus.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      warmth.type = "lowpass";
      warmth.frequency.value = 3300;
      warmth.Q.value = 0.45;
      vocalBus.connect(warmth);
      warmth.connect(master);
      vibrato.frequency.value = kind === "om" ? 4.6 : 5.1;
      vibratoDepth.gain.value = 1.7;
      vibrato.connect(vibratoDepth);
      vibrato.start(now);
      vibrato.stop(now + duration + 0.05);

      [1, 2, 3].forEach((harmonic, harmonicIndex) => {
        const voice = context.createOscillator();
        voice.type = harmonicIndex === 0 ? "sawtooth" : "triangle";
        voice.frequency.value = fundamental * harmonic;
        voice.detune.value = harmonicIndex === 1 ? 4 : harmonicIndex === 2 ? -6 : 0;
        vibratoDepth.connect(voice.detune);
        startFormants.forEach((formant, formantIndex) => {
          const filter = context.createBiquadFilter();
          const level = context.createGain();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(formant, now);
          filter.frequency.exponentialRampToValueAtTime(endFormants[formantIndex], now + duration * 0.78);
          filter.Q.value = [5, 7, 9][formantIndex];
          level.gain.value = [0.9, 0.5, 0.22][formantIndex] / (harmonicIndex + 1);
          voice.connect(filter);
          filter.connect(level);
          level.connect(vocalBus);
        });
        voice.start(now);
        voice.stop(now + duration + 0.05);
      });
    };

    const startDrone = (root: number) => {
      const droneBus = context.createGain();
      const filter = context.createBiquadFilter();
      droneBus.gain.value = 0.018;
      filter.type = "lowpass";
      filter.frequency.value = 820;
      filter.Q.value = 0.8;
      droneBus.connect(filter);
      filter.connect(master);
      [1, 2, 3, 4.01].forEach((ratio, index) => {
        const oscillator = context.createOscillator();
        const level = context.createGain();
        oscillator.type = index < 2 ? "sawtooth" : "triangle";
        oscillator.frequency.value = root * ratio;
        oscillator.detune.value = index % 2 ? -5 : 4;
        level.gain.value = [0.55, 0.28, 0.12, 0.07][index];
        oscillator.connect(level);
        level.connect(droneBus);
        oscillator.start();
      });
    };

    const playPluck = (frequency: number, duration = 1.8) => {
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency * 1.012, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.08);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(620, now + duration);
      filter.Q.value = 2.4;
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.05);
    };

    const playDrum = (deep: boolean) => {
      const now = context.currentTime;
      const body = context.createOscillator();
      const bodyGain = context.createGain();
      const hit = context.createBufferSource();
      const hitFilter = context.createBiquadFilter();
      const hitGain = context.createGain();
      body.type = "sine";
      body.frequency.setValueAtTime(deep ? 150 : 245, now);
      body.frequency.exponentialRampToValueAtTime(deep ? 54 : 115, now + (deep ? 0.34 : 0.16));
      bodyGain.gain.setValueAtTime(deep ? 0.08 : 0.045, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + (deep ? 0.5 : 0.24));
      body.connect(bodyGain);
      bodyGain.connect(master);
      hit.buffer = createNoise(0.16);
      hitFilter.type = "bandpass";
      hitFilter.frequency.value = deep ? 720 : 1900;
      hitFilter.Q.value = deep ? 0.8 : 1.6;
      hitGain.gain.setValueAtTime(deep ? 0.018 : 0.026, now);
      hitGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      hit.connect(hitFilter);
      hitFilter.connect(hitGain);
      hitGain.connect(master);
      body.start(now);
      body.stop(now + 0.55);
      hit.start(now);
    };

    if (practice.sound === "omVoice") {
      const chant = () => playVocal("om");
      chant();
      timers.push(window.setInterval(chant, 13800));
    } else if (practice.sound === "soHum") {
      const cycle = () => {
        playBreath(3.6);
        timers.push(window.setTimeout(() => playVocal("hum"), 3900));
      };
      cycle();
      timers.push(window.setInterval(cycle, 10400));
    } else if (practice.sound === "kirtan") {
      startDrone(65.4);
      let beat = 0;
      const harmonium = () => playResonance(130.8, [1, 1.25, 1.5, 2], 4.7, 0.016, "sawtooth", 0.42);
      const tabla = () => {
        playDrum(beat % 4 === 0);
        beat += 1;
      };
      harmonium();
      tabla();
      timers.push(window.setInterval(harmonium, 5200));
      timers.push(window.setInterval(tabla, 720));
    } else if (practice.sound === "arabic") {
      const scale = [1, 1.059, 1.26, 1.414, 1.498, 1.682, 1.888, 1.498];
      let note = 0;
      const oud = () => {
        playPluck(146.8 * scale[note % scale.length]);
        if (note % 4 === 0) playDrum(true);
        note += 1;
      };
      oud();
      timers.push(window.setInterval(oud, 980));
    } else if (practice.sound === "bells") {
      let bell = 0;
      const ring = () => {
        const notes = [164.8, 196, 220];
        playResonance(notes[bell % notes.length], [1, 2, 2.41, 3, 4.16, 5.43], 8.2, 0.035, "sine", 0.018);
        bell += 1;
      };
      ring();
      timers.push(window.setInterval(ring, 9400));
    } else if (practice.sound === "bowl") {
      const bowl = () => {
        playResonance(174, [1, 2.01, 2.72, 3.87, 5.18], 8.6, 0.04, "sine", 0.025);
        playResonance(910, [1, 1.51], 0.32, 0.018, "triangle", 0.006);
      };
      bowl();
      timers.push(window.setInterval(bowl, 9800));
    } else {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const ambience = context.createGain();
      const movement = context.createOscillator();
      const movementDepth = context.createGain();
      source.buffer = createNoise(5, true);
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 760;
      filter.Q.value = 0.35;
      ambience.gain.value = 0.016;
      movement.frequency.value = 0.065;
      movementDepth.gain.value = 0.006;
      source.connect(filter);
      filter.connect(ambience);
      ambience.connect(master);
      movement.connect(movementDepth);
      movementDepth.connect(ambience.gain);
      source.start();
      movement.start();
    }
    audio.current = { context, master, timers };
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!running) stopTone();
  }, [running]);

  useEffect(() => () => stopTone(), []);

  const choosePractice = (id: string) => {
    stopTone();
    setRunning(false);
    setPracticeId(id);
    setRemaining(minutes * 60);
  };

  const chooseDuration = (value: number) => {
    stopTone();
    setRunning(false);
    setMinutes(value);
    setRemaining(value * 60);
  };

  const toggleSession = () => {
    if (running) {
      stopTone();
      setRunning(false);
      return;
    }
    if (remaining === 0) setRemaining(totalSeconds);
    if (soundOn) startTone();
    setRunning(true);
  };

  const toggleSound = () => {
    if (soundOn) stopTone();
    else if (running) startTone();
    setSoundOn((value) => !value);
  };

  return (
    <div className="page innerPage meditationPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow"><Moon /> Personal meditation</span>
          <h2>Find stillness in your own way.</h2>
          <p>Choose a practice that respects your beliefs, or use the silent non-religious option.</p>
        </div>
      </div>
      <div className="meditationGrid">
        <section className="card meditationChoices" aria-label="Meditation practices">
          <div className="meditationChoiceHead"><b>Choose a practice</b><span>{meditationPractices.length} options</span></div>
          {meditationPractices.map((item) => (
            <button className={practiceId === item.id ? "active" : ""} onClick={() => choosePractice(item.id)} key={item.id}>
              <span>{item.title}</span>
              <small>{item.tradition}</small>
            </button>
          ))}
        </section>
        <section
          className="card meditationSession"
          data-practice={practice.id}
          style={{ "--meditation-a": practice.colors[0], "--meditation-b": practice.colors[1], "--meditation-progress": `${progress}%` } as React.CSSProperties}
        >
          <span className="meditationSymbol" aria-hidden="true">{practice.symbol}</span>
          <div className="meditationSessionHead">
            <div><span>{practice.tradition}</span><h3>{practice.title}</h3></div>
            <button className={soundOn ? "meditationSound active" : "meditationSound"} onClick={toggleSound} aria-pressed={soundOn}><Ear /> {soundOn ? practice.soundLabel : "Sound off"}</button>
          </div>
          <div className={`meditationOrb ${running ? phase.kind : "ready"}`}>
            <div>
              <small>{remaining === 0 ? "SESSION COMPLETE" : running ? phase.label.toUpperCase() : "WHEN YOU ARE READY"}</small>
              <strong>{remaining === 0 ? "Well done" : running ? phase.label : practice.phrase}</strong>
              <span>{remaining === 0 ? "Take a moment before moving on." : running ? phase.cue : practice.meaning}</span>
              <b>{timeLabel}</b>
            </div>
          </div>
          <div className="meditationDifference">
            <div><span>Focus</span><b>{practice.focus}</b></div>
            <div><span>Method</span><b>{practice.method}</b></div>
          </div>
          <div className="meditationDurations" aria-label="Meditation duration">
            {[2, 5, 10, 15].map((value) => <button className={minutes === value ? "selected" : ""} onClick={() => chooseDuration(value)} key={value}>{value} min</button>)}
          </div>
          <div className="meditationActions">
            <button className="primary" onClick={toggleSession}>{running ? <><Pause /> Pause</> : <><Play /> {remaining === 0 ? "Begin again" : "Begin meditation"}</>}</button>
            <button className="softButton" onClick={() => { stopTone(); setRunning(false); setRemaining(totalSeconds); }}><TimerReset /> Reset</button>
          </div>
          <p className="meditationPracticeNote">{practice.note}</p>
        </section>
      </div>
      <section className="card meditationGuide">
        <div><span>1</span><p><b>Get comfortable</b><small>Sit or lie down somewhere safe. Relax your jaw and shoulders.</small></p></div>
        <div><span>2</span><p><b>Follow gently</b><small>Use the visual cue and your own voice, silently or aloud.</small></p></div>
        <div><span>3</span><p><b>Stop when needed</b><small>Return to normal breathing if you feel uncomfortable.</small></p></div>
      </section>
      <p className="meditationRespect"><ShieldCheck /> Bloom keeps traditions separate and offers them for personal reflection, not as religious instruction. Choose only what aligns with your beliefs.</p>
    </div>
  );
}

function Space() {
  const [full, setFull] = useState(false);
  const mountRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .88;
    mount.appendChild(renderer.domElement);
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, .1, 20);
    const geometry = new THREE.SphereGeometry(7, 96, 64);
    const panoramaTexture = new THREE.TextureLoader().load(cosmicEarthPanorama);
    panoramaTexture.colorSpace = THREE.SRGBColorSpace;
    panoramaTexture.wrapS = THREE.RepeatWrapping;
    panoramaTexture.minFilter = THREE.LinearMipmapLinearFilter;
    panoramaTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const material = new THREE.ShaderMaterial({side:THREE.BackSide,toneMapped:false,uniforms:{uMap:{value:panoramaTexture},uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec2 vUv;uniform sampler2D uMap;uniform float uTime;void main(){vec2 uv=vUv;float earth=1.-smoothstep(.26,.43,uv.y);float nebula=smoothstep(.34,.72,uv.y);uv.x+=earth*(uTime*.00011+sin(uv.y*85.+uTime*.045)*.00032);uv.x+=nebula*sin(uv.y*21.+uTime*.018)*.00018;uv.y+=nebula*sin(uv.x*17.-uTime*.014)*.00012;vec3 col=texture2D(uMap,uv).rgb;col*=.96;gl_FragColor=vec4(col,1.);}`});
    const sky = new THREE.Mesh(geometry, material);
    world.add(sky);
    world.add(new THREE.AmbientLight(0x556688, 1.7));
    const cosmicLight = new THREE.PointLight(0xb88cff, 32, 16); cosmicLight.position.set(2, 2, 1); world.add(cosmicLight);

    const particleCanvas=document.createElement("canvas");particleCanvas.width=128;particleCanvas.height=128;const particleContext=particleCanvas.getContext("2d")!;const particleGlow=particleContext.createRadialGradient(64,64,0,64,64,64);particleGlow.addColorStop(0,"rgba(255,255,255,1)");particleGlow.addColorStop(.12,"rgba(210,235,255,.95)");particleGlow.addColorStop(.42,"rgba(125,165,255,.28)");particleGlow.addColorStop(1,"rgba(0,0,0,0)");particleContext.fillStyle=particleGlow;particleContext.fillRect(0,0,128,128);const particleTexture=new THREE.CanvasTexture(particleCanvas);
    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 1400; const dustPositions = new Float32Array(dustCount * 3); const dustColors = new Float32Array(dustCount * 3);
    const dustPalette = [new THREE.Color("#87ffe0"),new THREE.Color("#c090ff"),new THREE.Color("#ffbd65"),new THREE.Color("#9ec8ff")];
    for(let i=0;i<dustCount;i++){const radius=1.3+Math.random()*4.9,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1),o=i*3;dustPositions[o]=radius*Math.sin(phi)*Math.cos(theta);dustPositions[o+1]=radius*Math.cos(phi);dustPositions[o+2]=radius*Math.sin(phi)*Math.sin(theta);const c=dustPalette[i%dustPalette.length];dustColors[o]=c.r;dustColors[o+1]=c.g;dustColors[o+2]=c.b;}
    dustGeometry.setAttribute("position",new THREE.BufferAttribute(dustPositions,3)); dustGeometry.setAttribute("color",new THREE.BufferAttribute(dustColors,3));
    const dustMaterial = new THREE.PointsMaterial({size:.034,map:particleTexture,alphaMap:particleTexture,vertexColors:true,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true});
    const cosmicDust = new THREE.Points(dustGeometry,dustMaterial); world.add(cosmicDust);

    const asteroidGeometry = new THREE.IcosahedronGeometry(.075,2);const asteroidPoints=asteroidGeometry.attributes.position;const asteroidVector=new THREE.Vector3();for(let i=0;i<asteroidPoints.count;i++){asteroidVector.fromBufferAttribute(asteroidPoints,i);asteroidVector.multiplyScalar(.78+Math.random()*.38);asteroidPoints.setXYZ(i,asteroidVector.x,asteroidVector.y,asteroidVector.z);}asteroidGeometry.computeVertexNormals(); const asteroidMaterial = new THREE.MeshStandardMaterial({color:0x302d34,roughness:1,metalness:.02});
    const asteroids = new THREE.InstancedMesh(asteroidGeometry,asteroidMaterial,22); const dummy=new THREE.Object3D(); const asteroidData:Array<{speed:number;radius:number;phase:number;y:number;scale:number}> = [];
    for(let i=0;i<22;i++){const data={speed:.012+Math.random()*.026,radius:2.1+Math.random()*3.8,phase:Math.random()*Math.PI*2,y:-2.5+Math.random()*5,scale:.5+Math.random()*2.8};asteroidData.push(data);dummy.position.set(Math.cos(data.phase)*data.radius,data.y,Math.sin(data.phase)*data.radius);dummy.scale.setScalar(data.scale);dummy.rotation.set(Math.random()*3,Math.random()*3,0);dummy.updateMatrix();asteroids.setMatrixAt(i,dummy.matrix);} world.add(asteroids);


    const cometCanvas=document.createElement("canvas");cometCanvas.width=512;cometCanvas.height=64;const cometContext=cometCanvas.getContext("2d")!;const tail=cometContext.createLinearGradient(25,0,512,0);tail.addColorStop(0,"rgba(235,250,255,.95)");tail.addColorStop(.12,"rgba(160,215,255,.7)");tail.addColorStop(1,"rgba(80,130,255,0)");cometContext.fillStyle=tail;cometContext.beginPath();cometContext.moveTo(26,22);cometContext.lineTo(508,31);cometContext.lineTo(26,42);cometContext.closePath();cometContext.fill();const head=cometContext.createRadialGradient(25,32,0,25,32,24);head.addColorStop(0,"#fff");head.addColorStop(.18,"rgba(200,235,255,.95)");head.addColorStop(1,"rgba(120,175,255,0)");cometContext.fillStyle=head;cometContext.fillRect(0,7,52,50);const cometTexture=new THREE.CanvasTexture(cometCanvas);const cometData=Array.from({length:7},(_,i)=>{const cometMaterial=new THREE.SpriteMaterial({map:cometTexture,transparent:true,opacity:.42+Math.random()*.4,blending:THREE.AdditiveBlending,depthWrite:false,rotation:-.05-Math.random()*.18});const sprite=new THREE.Sprite(cometMaterial);const scale=.55+Math.random()*1.15;sprite.scale.set(scale,.07+scale*.055,1);const data={sprite,x:-5+Math.random()*10,y:-2.8+Math.random()*5.6,z:-5.4+Math.random()*10.8,speed:.012+Math.random()*.034,delay:i*.7+Math.random()*4};sprite.position.set(data.x,data.y,data.z);world.add(sprite);return data;});

    const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(world,camera)); const bloom=new UnrealBloomPass(new THREE.Vector2(mount.clientWidth,mount.clientHeight),.38,.48,.68); composer.addPass(bloom);
    let yaw = 0, pitch = 0, targetYaw = 0, targetPitch = 0, fov = 72, dragging = false, lastX = 0, lastY = 0;
    const down = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId); };
    const move = (event: PointerEvent) => { if (!dragging) return; targetYaw -= (event.clientX-lastX)*.0045; targetPitch -= (event.clientY-lastY)*.0045; targetPitch=Math.max(-1.15,Math.min(1.15,targetPitch)); lastX=event.clientX; lastY=event.clientY; };
    const up = () => { dragging = false; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); fov=Math.max(42,Math.min(88,fov+event.deltaY*.025)); camera.fov=fov; camera.updateProjectionMatrix(); };
    renderer.domElement.addEventListener("pointerdown", down); renderer.domElement.addEventListener("pointermove", move); renderer.domElement.addEventListener("pointerup", up); renderer.domElement.addEventListener("pointercancel", up); renderer.domElement.addEventListener("wheel",wheel,{passive:false});
    const resize = () => { if(!mount.clientWidth||!mount.clientHeight)return; camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);composer.setSize(mount.clientWidth,mount.clientHeight); };
    const observer = new ResizeObserver(resize); observer.observe(mount);
    const clock = new THREE.Clock(); let frame = 0;
    const animate = () => { frame=requestAnimationFrame(animate); const elapsed=clock.getElapsedTime();material.uniforms.uTime.value=elapsed;sky.rotation.y=elapsed*.0013;if(!dragging) targetYaw+=.00026; yaw+=(targetYaw-yaw)*.07; pitch+=(targetPitch-pitch)*.07; camera.rotation.set(pitch,yaw,0,"YXZ"); cosmicDust.rotation.y=elapsed*.006; cosmicDust.rotation.x=Math.sin(elapsed*.05)*.04; asteroidData.forEach((a,i)=>{const angle=a.phase+elapsed*a.speed;dummy.position.set(Math.cos(angle)*a.radius,a.y+Math.sin(elapsed*.17+a.phase)*.12,Math.sin(angle)*a.radius);dummy.scale.setScalar(a.scale);dummy.rotation.set(elapsed*a.speed*3+a.phase,elapsed*a.speed*2,angle);dummy.updateMatrix();asteroids.setMatrixAt(i,dummy.matrix);});asteroids.instanceMatrix.needsUpdate=true;cometData.forEach(c=>{if(elapsed<c.delay)return;c.x-=c.speed;if(c.x < -6){c.x=6;c.y=-2.8+Math.random()*5.6;c.z=-5.4+Math.random()*10.8;c.delay=elapsed+2+Math.random()*7;}c.sprite.position.set(c.x,c.y,c.z);});composer.render(); };
    animate();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); composer.dispose(); renderer.dispose(); geometry.dispose(); panoramaTexture.dispose(); material.dispose(); particleTexture.dispose();dustGeometry.dispose();dustMaterial.dispose();asteroidGeometry.dispose();asteroidMaterial.dispose();cometData.forEach(c=>c.sprite.material.dispose());cometTexture.dispose();renderer.domElement.remove(); };
  }, []);
  return (
    <div className={full ? "spacePage fullscreen" : "page innerPage spacePage interactiveSpacePage"}>
      {!full && <div className="pageIntro"><div><span className="eyebrow"><Orbit /> Immersive visual escape</span><h2>Drift through colour.</h2><p>One endless 3D space. Drag to look around and scroll to move closer.</p></div></div>}
      <section className="spacePhoto interactiveSpace">
        <div className="spaceCanvas" ref={mountRef} />
        <div className="spaceVignette" />
        <div className="visionLoop"><span /><b>Living universe</b></div>
        <button className="fullBtn" onClick={() => setFull(!full)}>
          {full ? <X /> : <Maximize2 />}
          {full ? " Exit" : " Full screen"}
        </button>
        <div className="spaceGuide"><b>Drag to roam</b><span>Scroll to zoom · move slowly</span></div>
      </section>
    </div>
  );
}
function ZenPlace() {
  const [on, setOn] = useState(false);
  const [phase, setPhase] = useState(0);
  const ctx = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setPhase((p) => (p + 1) % 3), 4000);
    return () => clearInterval(id);
  }, [on]);
  useEffect(
    () => () => {
      ctx.current?.close();
    },
    [],
  );
  const toggle = () => {
    if (on) {
      ctx.current?.close();
      ctx.current = null;
      setOn(false);
      return;
    }
    const a = new AudioContext();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "sine";
    osc.frequency.value = 174;
    gain.gain.value = 0.025;
    osc.connect(gain).connect(a.destination);
    osc.start();
    ctx.current = a;
    setOn(true);
  };
  const labels = ["Breathe in", "Hold softly", "Breathe out"];
  return (
    <div className="page zenPage">
      <section className={on ? "zenWorld active" : "zenWorld"}>
        <div className="zenSun" />
        <div className="zenHill hillOne" />
        <div className="zenHill hillTwo" />
        <div className="zenWater" />
        <div className="zenContent">
          <span className="eyebrow">
            <Flower2 /> Your Zen Place
          </span>
          <h2>{on ? labels[phase] : "Sound. Sight. Breath."}</h2>
          <p>
            {on
              ? "Follow the expanding light at your own pace."
              : "A gentle tone, a living landscape, and a slow breathing rhythm—together."}
          </p>
          <button onClick={toggle}>
            {on ? (
              <>
                <Pause /> Leave gently
              </>
            ) : (
              <>
                <Play /> Enter Zen Place
              </>
            )}
          </button>
        </div>
      </section>
      <div className="zenDetails">
        <span>
          <Waves /> soft ambient tone
        </span>
        <span>
          <Orbit /> slow visual movement
        </span>
        <span>
          <Wind /> guided 4–4–4 breath
        </span>
      </div>
    </div>
  );
}
function PlayRoom() {
  const games = [
    ["Colour study", "Focused creative attention", Palette],
    ["Sensory release", "A simple tactile reset", CircleDot],
    ["Sand practice", "Slow, responsive drawing", Waves],
    ["Memory reset", "A quiet matching exercise", Gamepad2],
    ["Pattern study", "Build visual balance", Orbit],
  ] as const;
  const [selected, setSelected] = useState(0);
  const paintColors = ["#6fa77d", "#a9d3b0", "#bda7d8", "#efb7a0", "#f1d58a", "#83b8cf"];
  const blankPaint = "#f7f5ef";
  const [paint, setPaint] = useState(paintColors[0]);
  const [coloringPage, setColoringPage] = useState(0);
  const coloringRegions = Math.min(7 + coloringPage * 2, 18);
  const coloringTheme = coloringPage % 8;
  const coloringTitles = ["Shape balance", "Quiet horizon", "Orbit study", "Mountain layers", "Balanced stones", "Slow city", "Ocean lines", "Night sky"];
  const [gardenColors, setGardenColors] = useState<string[]>(() => Array(7).fill(blankPaint));
  const [bubbles, setBubbles] = useState(() => Array.from({ length: 24 }, () => true));
  const bubbleAudio = useRef<AudioContext | null>(null);
  const bubbleColors = ["#76b99c", "#9ebde0", "#c5a5df", "#edae9b", "#e6cb73", "#74c4c2"];
  const sandCanvas = useRef<HTMLCanvasElement | null>(null);
  const sandDrawing = useRef(false);
  const sandLastPoint = useRef<{ x: number; y: number } | null>(null);
  const sandVibrationTime = useRef(0);
  const [sandBrush, setSandBrush] = useState(10);
  const [sandStarted, setSandStarted] = useState(false);
  const [sandMuted, setSandMuted] = useState(false);
  const sandAudio = useRef<AudioContext | null>(null);
  const sandSoundTime = useRef(0);
  const [mosaicSize, setMosaicSize] = useState<25 | 50>(25);
  const [mosaic, setMosaic] = useState(() => Array.from({ length: 25 }, (_, index) => index % paintColors.length));
  const resizeMosaic = (size: 25 | 50) => {
    setMosaicSize(size);
    setMosaic(Array.from({ length: size }, (_, index) => index % paintColors.length));
  };
  const positiveEmojis = ["◐", "◇", "△", "◎", "✦", "≈", "⌁", "⊹", "○", "□", "◒", "◈", "☼", "◌", "▽", "◫", "✧", "⌇", "◍", "⬡", "◭", "⊙", "⋒", "⟡"];
  const previousEmojiKey = useRef("");
  const shuffle = <T,>(items: T[]) => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  };
  const makeCards = (count: 9 | 12) => {
    const copiesPerEmoji = count === 9 ? 3 : 2;
    const uniqueEmojiCount = count / copiesPerEmoji;
    let selectedEmojis = shuffle(positiveEmojis).slice(0, uniqueEmojiCount);
    let emojiKey = [...selectedEmojis].sort().join("");
    while (emojiKey === previousEmojiKey.current) {
      selectedEmojis = shuffle(positiveEmojis).slice(0, uniqueEmojiCount);
      emojiKey = [...selectedEmojis].sort().join("");
    }
    previousEmojiKey.current = emojiKey;
    return shuffle(selectedEmojis.flatMap((emoji) => Array(copiesPerEmoji).fill(emoji)));
  };
  const [cardCount, setCardCount] = useState<9 | 12>(9);
  const [cards, setCards] = useState<string[]>(() => makeCards(9));
  const [openCards, setOpenCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  useEffect(() => {
    const matchSize = cardCount === 9 ? 3 : 2;
    if (openCards.length !== matchSize) return;
    const id = window.setTimeout(() => {
      const firstSymbol = cards[openCards[0]];
      if (openCards.every((index) => cards[index] === firstSymbol)) {
        setMatchedCards((current) => [...current, firstSymbol]);
      }
      setOpenCards([]);
    }, 550);
    return () => window.clearTimeout(id);
  }, [openCards, cards, cardCount]);
  const resetPairs = (nextCardCount: 9 | 12 = cardCount) => {
    setCardCount(nextCardCount);
    setCards(makeCards(nextCardCount));
    setOpenCards([]);
    setMatchedCards([]);
    setMoves(0);
  };
  const paintGardenRegion = (index: number) => {
    setGardenColors((current) => Array.from({ length: coloringRegions }, (_, i) => i === index ? paint : (current[i] || blankPaint)));
  };
  const coloredRegions = gardenColors.slice(0, coloringRegions).filter((color) => color !== blankPaint).length;
  const nextColoringPage = () => {
    const nextPage = coloringPage + 1;
    setColoringPage(nextPage);
    setGardenColors(Array(Math.min(7 + nextPage * 2, 18)).fill(blankPaint));
  };
  const pageVariation = (index: number) => {
    const value = Math.sin((coloringPage + 1) * (index + 4) * 12.9898) * 43758.5453;
    return Math.abs(value - Math.floor(value));
  };
  const coloringFill = (index: number) => gardenColors[index] || blankPaint;
  const renderColoringDesign = () => {
    if (coloringTheme === 0) return Array.from({ length: coloringRegions }, (_, index) => {
      const cols = coloringPage > 2 ? 4 : 3;
      const rows = Math.ceil(coloringRegions / cols);
      const cellHeight = 242 / rows;
      const width = 310 / cols;
      const row = Math.floor(index / cols);
      const col = index % cols;
      return <rect key={index} x={25 + col * width + pageVariation(index) * 8} y={18 + row * cellHeight} width={width - 5 + pageVariation(index + 2) * 15} height={cellHeight + 8} rx={index % 3 === 0 ? Math.min(38, cellHeight / 2) : 16} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />;
    });
    if (coloringTheme === 1) return <>
      <circle cx={58 + pageVariation(1) * 75} cy={50 + pageVariation(2) * 35} r="35" fill={coloringFill(0)} onClick={() => paintGardenRegion(0)} />
      {Array.from({ length: coloringRegions - 1 }, (_, item) => { const index = item + 1; const y = 66 + item * (205 / (coloringRegions - 1)); const bend = (pageVariation(index) - .5) * 55; return <path key={index} d={`M10 ${y} Q 100 ${y + bend} 190 ${y - bend} T350 ${y + 4} L350 285 L10 285Z`} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; })}
    </>;
    if (coloringTheme === 2) return Array.from({ length: coloringRegions }, (_, index) => { const angle = index * (360 / coloringRegions) + coloringPage * 7; const radius = index % 2 ? 70 : 112; const x = 180 + Math.cos(angle * Math.PI / 180) * radius; const y = 140 + Math.sin(angle * Math.PI / 180) * radius; return index % 3 === 0 ? <circle key={index} cx={x} cy={y} r={20 + pageVariation(index) * 16} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} /> : <rect key={index} x={x - 25} y={y - 34} width="50" height="68" rx="23" transform={`rotate(${angle + 45} ${x} ${y})`} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
    if (coloringTheme === 3) return Array.from({ length: coloringRegions }, (_, index) => { const band = Math.floor(index / 3); const x = (index % 3) * 125 - 20 + pageVariation(index) * 25; const base = 270 - band * 58; const peak = base - 65 - pageVariation(index + 1) * 42; return <path key={index} d={`M${x} ${base} L${x + 67} ${peak} L${x + 140} ${base} Z`} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
    if (coloringTheme === 4) return Array.from({ length: coloringRegions }, (_, index) => { const col = index % 4; const row = Math.floor(index / 4); const x = 55 + col * 84 + (pageVariation(index) - .5) * 22; const y = 245 - row * 55; return <ellipse key={index} cx={x} cy={y} rx={30 + pageVariation(index + 2) * 16} ry={20 + pageVariation(index + 3) * 10} transform={`rotate(${(pageVariation(index + 4) - .5) * 22} ${x} ${y})`} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
    if (coloringTheme === 5) return Array.from({ length: coloringRegions }, (_, index) => { const width = 340 / coloringRegions + 8; const x = 10 + index * (340 / coloringRegions); const height = 65 + pageVariation(index) * 165; return <rect key={index} x={x} y={270 - height} width={width} height={height} rx={index % 3 === 0 ? 20 : 4} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
    if (coloringTheme === 6) return Array.from({ length: coloringRegions }, (_, index) => { const y = 18 + index * (255 / coloringRegions); const bend = 18 + pageVariation(index) * 30; return <path key={index} d={`M5 ${y} C85 ${y - bend}, 125 ${y + bend}, 185 ${y} S285 ${y - bend},355 ${y + 2} L355 ${y + 35} C270 ${y + 12},220 ${y + 55},145 ${y + 30} S55 ${y + 48},5 ${y + 30}Z`} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
    return Array.from({ length: coloringRegions }, (_, index) => { const cols = 5; const x = 42 + (index % cols) * 70 + (pageVariation(index) - .5) * 24; const y = 42 + Math.floor(index / cols) * 68 + (pageVariation(index + 1) - .5) * 20; const radius = 10 + pageVariation(index + 2) * 24; return <circle key={index} cx={x} cy={y} r={radius} fill={coloringFill(index)} onClick={() => paintGardenRegion(index)} />; });
  };
  const playBubblePop = (index: number) => {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!bubbleAudio.current) bubbleAudio.current = new AudioCtx();
    const ctx = bubbleAudio.current;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 5;
    compressor.attack.value = .001;
    compressor.release.value = .04;
    compressor.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .055), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      const progress = i / data.length;
      const snap = Math.exp(-progress * 42);
      const shell = Math.exp(-progress * 9) * .32;
      data[i] = (Math.random() * 2 - 1) * (snap + shell);
    }
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    noise.buffer = buffer;
    noise.playbackRate.value = .94 + (index % 5) * .025;
    filter.type = "bandpass";
    filter.frequency.value = 1250 + (index % 4) * 110;
    filter.Q.value = .75;
    noiseGain.gain.setValueAtTime(.34, now);
    noiseGain.gain.exponentialRampToValueAtTime(.001, now + .052);
    noise.connect(filter).connect(noiseGain).connect(compressor);
    noise.start(now);
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = "sine";
    body.frequency.setValueAtTime(105 + (index % 3) * 8, now);
    body.frequency.exponentialRampToValueAtTime(58, now + .045);
    bodyGain.gain.setValueAtTime(.075, now);
    bodyGain.gain.exponentialRampToValueAtTime(.001, now + .052);
    body.connect(bodyGain).connect(compressor);
    body.start(now);
    body.stop(now + .055);
  };
  const sandPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) * (canvas.width / box.width), y: (event.clientY - box.top) * (canvas.height / box.height) };
  };
  const prepareSandSound = async (force = false) => {
    if (sandMuted && !force) return false;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return false;
    if (!sandAudio.current) sandAudio.current = new AudioCtx();
    const ctx = sandAudio.current;
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  };
  const playSandGrain = (distance: number, force = false) => {
    if ((sandMuted && !force) || !sandAudio.current || performance.now() - sandSoundTime.current < 58) return;
    const ctx = sandAudio.current;
    if (ctx.state !== "running") return;
    sandSoundTime.current = performance.now();
    const duration = .06;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < samples.length; i += 1) {
      const grain = Math.random() * 2 - 1;
      previous = previous * .78 + grain * .22;
      const progress = i / samples.length;
      const envelope = Math.sin(Math.PI * progress) ** 1.6;
      samples[i] = previous * envelope;
    }
    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    highpass.type = "highpass";
    highpass.frequency.value = 180;
    filter.type = "lowpass";
    filter.frequency.value = Math.min(1800, 760 + distance * 18);
    filter.Q.value = .35;
    gain.gain.value = Math.min(.09, .035 + distance * .0015);
    source.connect(highpass).connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  };
  const beginSandDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    sandDrawing.current = true;
    sandLastPoint.current = sandPoint(event);
    setSandStarted(true);
    void prepareSandSound().then((ready) => { if (ready) playSandGrain(12); });
    if ("vibrate" in navigator) navigator.vibrate(8);
  };
  const drawInSand = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sandDrawing.current || !sandLastPoint.current) return;
    const canvas = sandCanvas.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = sandPoint(event);
    const distance = Math.hypot(point.x - sandLastPoint.current.x, point.y - sandLastPoint.current.y);
    ctx.beginPath();
    ctx.moveTo(sandLastPoint.current.x, sandLastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.lineWidth = sandBrush;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(105, 76, 48, .52)";
    ctx.shadowColor = "rgba(255, 246, 212, .8)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    playSandGrain(distance);
    sandLastPoint.current = point;
    if ("vibrate" in navigator && Date.now() - sandVibrationTime.current > 110) {
      navigator.vibrate(3);
      sandVibrationTime.current = Date.now();
    }
  };
  const stopSandDrawing = () => {
    sandDrawing.current = false;
    sandLastPoint.current = null;
  };
  const clearSand = () => {
    sandCanvas.current?.getContext("2d")?.clearRect(0, 0, sandCanvas.current.width, sandCanvas.current.height);
    setSandStarted(false);
  };
  return (
    <div className="page innerPage mindfulBreaksPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <CircleDot /> Mindful breaks
          </span>
          <h2>Pause with intention.</h2>
          <p>
            Five short practices for attention, grounding, sensory regulation,
            and creative rest. No scores or performance goals.
          </p>
        </div>
      </div>
      <div className="gameTabs">
        {games.map(([n, d, I], i) => (
          <button
            className={selected === i ? "active" : ""}
            onClick={() => setSelected(i)}
            key={n}
          >
            <I />
            <b>{n}</b>
            <small>{d}</small>
          </button>
        ))}
      </div>
      <section className="card gameStage">
        {selected === 0 ? (
          <>
            <div className="coloringGame">
              <div className="coloringProgress"><span>Page {coloringPage + 1}</span><span>{coloredRegions} of {coloringRegions} colored</span></div>
              <svg viewBox="0 0 360 280" aria-label={`Minimal coloring artwork page ${coloringPage + 1}`}>
                {renderColoringDesign()}
              </svg>
            </div>
            <h3>{coloredRegions === coloringRegions ? "Your artwork is complete." : coloringTitles[coloringTheme]}</h3>
            <p>Pick a color and tap each section. Every page changes its subject and layout, then gradually adds detail.</p>
            <div className="paintPalette">
              {paintColors.map((color) => <button className={paint === color ? "active" : ""} style={{ background: color }} aria-label={`Choose ${color}`} onClick={() => setPaint(color)} key={color} />)}
              <button className="clearColoring" onClick={() => setGardenColors(Array(coloringRegions).fill(blankPaint))}>Clear</button>
            </div>
            <button className="primary coloringNext" disabled={coloredRegions !== coloringRegions} onClick={nextColoringPage}>Next drawing <ChevronRight /></button>
          </>
        ) : selected === 1 ? (
          <>
            <div className="bubbleGarden">
              {bubbles.map((visible, index) => {
                const color = bubbleColors[index % bubbleColors.length];
                return <button key={index} className={visible ? "" : "popped"} style={{ background: `radial-gradient(circle at 31% 27%, #fff 0 7%, ${color}aa 28%, ${color} 100%)` }} aria-label={visible ? `Pop ${color} bubble` : "Popped bubble"} onClick={() => {
                  if (!visible) return;
                  playBubblePop(index);
                  setBubbles((items) => items.map((item, i) => i === index ? false : item));
                }} />;
              })}
            </div>
            <h3>{bubbles.some(Boolean) ? "Release tension one point at a time." : "Complete. Pause for one measured breath."}</h3>
            <p>{bubbles.filter(Boolean).length} points remaining · untimed</p>
            <button className="softButton" onClick={() => setBubbles(Array.from({ length: 24 }, () => true))}>Reset field</button>
          </>
        ) : selected === 2 ? (
          <>
            <div className="zenSand">
              <canvas ref={sandCanvas} width="720" height="400" aria-label="Zen sand drawing area" onPointerDown={beginSandDrawing} onPointerMove={drawInSand} onPointerUp={stopSandDrawing} onPointerCancel={stopSandDrawing} />
              {!sandStarted && <span>Drag your finger or mouse through the sand</span>}
            </div>
            <h3>Draw without needing to make anything perfect.</h3>
            <p>Use slow lines, circles, words, or patterns. Mobile devices add subtle touch feedback when supported.</p>
            <div className="sandControls">
              <span>Brush size</span>
              {[6, 12, 22].map((size, index) => <button className={sandBrush === size ? "active" : ""} aria-label={`${["Small", "Medium", "Large"][index]} brush`} onClick={() => setSandBrush(size)} key={size}><i style={{ width: 6 + index * 6, height: 6 + index * 6 }} /></button>)}
              <button className={`sandSoundToggle ${!sandMuted ? "active" : ""}`} aria-label={sandMuted ? "Turn sand sound on" : "Turn sand sound off"} onClick={() => {
                if (sandMuted) {
                  setSandMuted(false);
                  void prepareSandSound(true).then((ready) => { if (ready) playSandGrain(14, true); });
                } else {
                  setSandMuted(true);
                }
              }}>{sandMuted ? "Sound off" : "Sound on"}</button>
              <button className="softButton" onClick={clearSand}>Smooth the sand</button>
            </div>
          </>
        ) : selected === 3 ? (
          <>
            <div className="memoryOptions" aria-label="Choose number of cards">
              {([9, 12] as const).map((count) => <button className={cardCount === count ? "active" : ""} onClick={() => resetPairs(count)} key={count}>{count} cards</button>)}
            </div>
            <div className={`memoryTiles cards-${cardCount}`}>
              {cards.map((symbol, index) => {
                const visible = openCards.includes(index) || matchedCards.includes(symbol);
                return <button className={visible ? "visible" : ""} disabled={matchedCards.includes(symbol)} key={`${symbol}-${index}`} onClick={() => {
                  if (openCards.length === (cardCount === 9 ? 3 : 2) || openCards.includes(index)) return;
                  setOpenCards((current) => [...current, index]);
                  setMoves((current) => current + 1);
                }}>{visible ? symbol : "✦"}</button>;
              })}
            </div>
            <h3>{matchedCards.length === (cardCount === 9 ? 3 : 6) ? "Pattern complete." : cardCount === 9 ? "Find each group of three matching symbols." : "Find the six matching pairs."}</h3>
            <p>{moves} selections · untimed</p>
            <button className="softButton" onClick={() => resetPairs()}>{matchedCards.length === (cardCount === 9 ? 3 : 6) ? "Begin again" : "New pattern"}</button>
          </>
        ) : (
          <>
            <div className="mosaicOptions" aria-label="Choose number of mosaic squares">
              {([25, 50] as const).map((size) => <button className={mosaicSize === size ? "active" : ""} onClick={() => resizeMosaic(size)} key={size}>{size} squares</button>)}
            </div>
            <div className={`calmMosaic tiles-${mosaicSize}`}>
              {mosaic.map((colorIndex, index) => <button aria-label="Change tile color" key={index} style={{ background: paintColors[colorIndex] }} onClick={() => setMosaic((tiles) => tiles.map((value, i) => i === index ? (value + 1) % paintColors.length : value))} />)}
            </div>
            <h3>Build a balanced visual rhythm.</h3>
            <p>Select each tile to move through the colour sequence.</p>
            <button className="softButton" onClick={() => setMosaic(Array.from({ length: mosaicSize }, () => Math.floor(Math.random() * paintColors.length)))}>Generate pattern</button>
          </>
        )}
      </section>
    </div>
  );
}
function Grounding() {
  const steps = [
    ["5", "things you can see", Eye],
    ["4", "things you can feel", Hand],
    ["3", "things you can hear", Ear],
    ["2", "things you can smell", Flower2],
    ["1", "thing you can taste", Coffee],
  ] as const;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(""));
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Hand /> 5–4–3–2–1 grounding
          </span>
          <h2>Come back to where you are.</h2>
          <p>
            Use your senses to gently shift attention from racing thoughts to
            the present moment.
          </p>
        </div>
      </div>
      <section className="card groundingCard">
        <div className="groundProgress">
          {steps.map((_, i) => (
            <i className={i <= step ? "done" : ""} key={i} />
          ))}
        </div>
        {React.createElement(steps[step][2], {})}
        <b className="groundNumber">{steps[step][0]}</b>
        <h3>Notice {steps[step][1]}</h3>
        <textarea
          value={answers[step]}
          onChange={(e) =>
            setAnswers(answers.map((a, i) => (i === step ? e.target.value : a)))
          }
          placeholder="You can type them here, say them aloud, or simply notice them..."
        />
        <footer>
          <button
            className="textBtn"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
          <button
            className="primary"
            onClick={() => setStep(step === 4 ? 0 : step + 1)}
          >
            {step === 4 ? (
              <>
                <Check /> Finish gently
              </>
            ) : (
              <>
                Next sense <ChevronRight />
              </>
            )}
          </button>
        </footer>
      </section>
      <p className="groundNote">
        This is a grounding exercise, not medical treatment. Stop if it does not
        feel helpful.
      </p>
    </div>
  );
}
function Gratitude() {
  const [notes, setNotes] = useState<GratitudeItem[]>([]);
  const [input, setInput] = useState("");
  useEffect(() => {
    api<GratitudeItem[]>("/gratitude")
      .then(setNotes)
      .catch(() => {});
  }, []);
  const add = async () => {
    if (!input.trim()) return;
    try {
      const note = await api<GratitudeItem>("/gratitude", {
        method: "POST",
        body: JSON.stringify({ text: input.trim() }),
      });
      setNotes([note, ...notes]);
      setInput("");
    } catch {}
  };
  const remove = async (id: number) => {
    try {
      await api<void>(`/gratitude/${id}`, { method: "DELETE" });
      setNotes(notes.filter((n) => n.id !== id));
    } catch {}
  };
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Flower2 /> Notice the good
          </span>
          <h2>Keep one small thing.</h2>
          <p>
            Gratitude does not have to erase a hard day. It can simply sit
            beside it.
          </p>
        </div>
      </div>
      <section className="card gratitudeEditor">
        <h3>What felt quietly good today?</h3>
        <div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="A warm drink, a kind message, five calm minutes..."
          />
          <button className="primary" onClick={add}>
            <Plus /> Keep this
          </button>
        </div>
      </section>
      <h3 className="sectionTitle">Things worth keeping</h3>
      <div className="gratitudeList">
        {notes.length === 0 ? (
          <div className="emptyGratitude">
            <Heart />
            <p>Your private notes will gather here.</p>
          </div>
        ) : (
          notes.map((n) => (
            <article className="card" key={n.id}>
              <Heart />
              <p>{n.text}</p>
              <button aria-label="Remove note" onClick={() => remove(n.id)}>
                <X />
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  type AppPalette = "sage" | "lavender" | "ocean" | "rose" | "sunset";
  const palettes: { id: AppPalette; name: string; detail: string; colors: string[] }[] = [
    { id: "sage", name: "Calm sage", detail: "Natural and grounded", colors: ["#476a5a", "#dce9df", "#f1ddcd"] },
    { id: "lavender", name: "Soft lavender", detail: "Dreamy and gentle", colors: ["#755c91", "#e8def2", "#f1dfea"] },
    { id: "ocean", name: "Quiet ocean", detail: "Cool and refreshing", colors: ["#356d7a", "#d8eaf0", "#dce3f3"] },
    { id: "rose", name: "Warm rose", detail: "Soft and comforting", colors: ["#8a5865", "#f1dfe4", "#f3e5dc"] },
    { id: "sunset", name: "Golden sunset", detail: "Warm and uplifting", colors: ["#8a6535", "#f3e7cc", "#efd9c9"] },
  ];
  const [dark, setDark] = useState(() => localStorage.getItem(userStorageKey("bloom-dark-mode")) === "true");
  const [palette, setPalette] = useState<AppPalette>(() => (localStorage.getItem(userStorageKey("bloom-app-palette")) as AppPalette) || "sage");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [privacyBusy, setPrivacyBusy] = useState<"download" | "restore" | "delete" | null>(null);
  const recoveryInput = useRef<HTMLInputElement>(null);
  const choosePalette = (next: AppPalette) => {
    setPalette(next);
    localStorage.setItem(userStorageKey("bloom-app-palette"), next);
    document.body.dataset.palette = next;
  };
  const downloadMyData = async () => {
    setPrivacyBusy("download");
    setPrivacyStatus("Preparing your private export…");
    try {
      const [profile, journal, memories, goals, gratitude] = await Promise.all([
        api<BloomProfile>("/profile"), api<unknown[]>("/journal"), api<unknown[]>("/memories"),
        api<unknown[]>("/goals"), api<unknown[]>("/gratitude"),
      ]);
      const data = { exportedAt: new Date().toISOString(), account: { id: user?.id, email: user?.primaryEmailAddress?.emailAddress }, profile, journal, memories, goals, groundingNotes: gratitude, preferences: { darkMode: dark, palette } };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `bloom-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
      setPrivacyStatus("Your Bloom data was downloaded.");
    } catch { setPrivacyStatus("Bloom could not prepare your download. Please try again."); }
    finally { setPrivacyBusy(null); }
  };
  const deleteMyAccount = async () => {
    if (!window.confirm("Permanently delete your Bloom account, journal, memories, goals, and preferences? This cannot be undone.")) return;
    if (window.prompt("Type DELETE to confirm permanent account deletion.") !== "DELETE") { setPrivacyStatus("Account deletion was cancelled."); return; }
    setPrivacyBusy("delete"); setPrivacyStatus("Deleting your Bloom data…");
    try {
      await api<void>("/account", { method: "DELETE" });
      Object.keys(localStorage).filter((key) => key.endsWith(`:${activeBloomUserId}`)).forEach((key) => localStorage.removeItem(key));
      await user?.delete();
      await signOut({ redirectUrl: "/" });
    } catch { setPrivacyStatus("The account could not be deleted. Please try again or manage it from Active sessions."); setPrivacyBusy(null); }
  };
  const restoreMyData = async (file?: File) => {
    if (!file) return;
    setPrivacyBusy("restore"); setPrivacyStatus("Restoring your saved Bloom data…");
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as { format?: string };
      if (payload.format !== "bloom-recovery-v1") throw new Error("invalid recovery file");
      const restored = await api<{ journal: number; memories: number; goals: number; notes: number }>("/account/restore", { method: "POST", body: text });
      setPrivacyStatus(`Restored ${restored.journal} journal entries, ${restored.memories} memories, ${restored.goals} goal, and ${restored.notes} notes. Refreshing Bloom…`);
      window.setTimeout(() => window.location.reload(), 1400);
    } catch { setPrivacyStatus("Bloom could not read that recovery file. Please choose the Bloom recovery JSON file."); }
    finally { setPrivacyBusy(null); if (recoveryInput.current) recoveryInput.current.value = ""; }
  };
  return (
    <div className="page innerPage">
      <div className="pageIntro">
        <div>
          <span className="eyebrow">
            <Settings /> Control & privacy
          </span>
          <h2>Settings</h2>
          <p>
            Bloom works for you. Your memory, notifications, and data remain
            under your control.
          </p>
        </div>
      </div>
      <div className="settingsGrid">
        <section className="card">
          <h3>Appearance</h3>
          <div className="settingRow">
            <div>
              <b>Dark mode</b>
              <span>Use a quieter display in low light.</span>
            </div>
            <button
              className={dark ? "toggle on" : "toggle"}
              onClick={() => {
                const next = !dark;
                setDark(next);
                localStorage.setItem(userStorageKey("bloom-dark-mode"), String(next));
                document.body.classList.toggle("dark", next);
              }}
            >
              <i />
            </button>
          </div>
          <div className="appColourSetting">
            <div><b>App colours</b><span>Choose the colours that feel most like you.</span></div>
            <div className="paletteChoices">{palettes.map((option) => <button key={option.id} className={palette === option.id ? "selected" : ""} onClick={() => choosePalette(option.id)} aria-label={`Use ${option.name} colours`}><span>{option.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><b>{option.name}</b><small>{option.detail}</small>{palette === option.id && <Check />}</button>)}</div>
          </div>
        </section>
        <section className="card">
          <h3>Memory & AI</h3>
          <div className="settingRow">
            <div>
              <b>Suggest new memories</b>
              <span>Bloom asks before saving meaningful details.</span>
            </div>
            <button className="toggle on">
              <i />
            </button>
          </div>
          <div className="settingRow">
            <div>
              <b>Use journal context</b>
              <span>Personalize guidance using your entries.</span>
            </div>
            <button className="toggle on">
              <i />
            </button>
          </div>
        </section>
        <section className="card privacySettings">
          <h3>Privacy</h3>
          <button className="settingsLink" onClick={downloadMyData} disabled={privacyBusy !== null}>
            {privacyBusy === "download" ? "Preparing download…" : "Download my data"} <ChevronRight />
          </button>
          <button className="settingsLink" onClick={() => recoveryInput.current?.click()} disabled={privacyBusy !== null}>
            {privacyBusy === "restore" ? "Restoring my data…" : "Restore saved data"} <ChevronRight />
          </button>
          <input ref={recoveryInput} type="file" accept="application/json,.json" hidden onChange={(event) => restoreMyData(event.target.files?.[0])} />
          <button className="settingsLink" onClick={() => openUserProfile()}>
            Manage active sessions <ChevronRight />
          </button>
          <button className="settingsLink danger" onClick={deleteMyAccount} disabled={privacyBusy !== null}>
            {privacyBusy === "delete" ? "Deleting account…" : "Delete my account"} <ChevronRight />
          </button>
          {privacyStatus && <p className="privacyStatus" role="status">{privacyStatus}</p>}
        </section>
      </div>
    </div>
  );
}
function Welcome({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const options = [
    "Rain",
    "Ocean",
    "Northern lights",
    "Space",
    "Warm colors",
    "Soft reminders",
    "Jokes",
    "Quiet encouragement",
  ];
  const toggle = (x: string) =>
    setSelected(
      selected.includes(x) ? selected.filter((v) => v !== x) : [...selected, x],
    );
  const continueLogin = () => {
    if (!email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    if (mode === "create") setStage(1);
    else {
      localStorage.setItem(
        "bloom-user",
        JSON.stringify({ name: name || "Bloom user", preferences: [] }),
      );
      onDone();
    }
  };
  return (
    <div className="welcome">
      <div className="welcomeArt">
        <Logo />
        <div className="welcomeQuote">
          <span>Your private space to</span>
          <h1>
            feel, reflect,
            <br />
            and breathe easier.
          </h1>
          <p>Calming tools shaped around what actually helps you.</p>
          <div className="trustRow">
            <span>
              <ShieldCheck /> Private by design
            </span>
            <span>
              <Heart /> Made without judgement
            </span>
          </div>
        </div>
        <small>
          Bloom supports reflection and everyday wellbeing. It is not a medical
          or emergency service.
        </small>
      </div>
      <section className="loginWrap">
        <div className="loginCard">
          {stage === 0 ? (
            <>
              <div className="mobileLogo">
                <Logo />
              </div>
              <span className="eyebrow">
                <Sparkles /> Welcome back
              </span>
              <h2>
                {mode === "signin"
                  ? "Come back to yourself."
                  : "Create your calm space."}
              </h2>
              <p>
                {mode === "signin"
                  ? "Sign in to continue your private Bloom journey."
                  : "A few details, then we’ll shape Bloom around you."}
              </p>
              <div className="authTabs">
                <button
                  className={mode === "signin" ? "active" : ""}
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                >
                  Sign in
                </button>
                <button
                  className={mode === "create" ? "active" : ""}
                  onClick={() => {
                    setMode("create");
                    setError("");
                  }}
                >
                  Create account
                </button>
              </div>
              {mode === "create" && (
                <label>
                  Your name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="What should Bloom call you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <div className="passwordField">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Eye />
                  </button>
                </div>
              </label>
              {error && <div className="formError">{error}</div>}
              <div className="loginOptions">
                <label>
                  <input type="checkbox" defaultChecked /> Remember me
                </label>
                <button>Forgot password?</button>
              </div>
              <button
                className="primary wide loginSubmit"
                onClick={continueLogin}
              >
                <LogIn /> {mode === "signin" ? "Sign in to Bloom" : "Continue"}
              </button>
              <div className="secureNote">
                <ShieldCheck />
                <span>
                  <b>Your space stays yours.</b>Your journal and personal
                  reflections are private.
                </span>
              </div>
            </>
          ) : (
            <>
              <button className="backLink" onClick={() => setStage(0)}>
                ← Back
              </button>
              <span className="eyebrow">
                <Heart /> Make Bloom yours
              </span>
              <h2>What helps you feel calmer?</h2>
              <p>Choose anything you enjoy. You can change this later.</p>
              <div className="preferenceChips">
                {options.map((x) => (
                  <button
                    className={selected.includes(x) ? "selected" : ""}
                    onClick={() => toggle(x)}
                    key={x}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <label>
                Anything you want to avoid?
                <textarea placeholder="For example: loud sounds or bright colors..." />
              </label>
              <button
                className="primary wide loginSubmit"
                onClick={() => {
                  localStorage.setItem(
                    "bloom-user",
                    JSON.stringify({
                      name: name || "Bloom user",
                      preferences: selected,
                    }),
                  );
                  onDone();
                }}
              >
                Enter my space <ArrowUpRight />
              </button>
            </>
          )}
        </div>
        <p className="loginLegal">
          By continuing, you agree to Bloom’s Terms and acknowledge its Privacy
          Policy.
        </p>
      </section>
    </div>
  );
}
function ProfileOnboarding({ initialName, onDone }: { initialName: string; onDone: (profile: BloomProfile) => void }) {
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<string[]>([]);
  const [avoid, setAvoid] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const options = ["Gentle rain", "Ocean sounds", "Nature", "Space visuals", "Warm colors", "Cool colors", "Music", "Coloring", "Games", "Breathing", "Encouragement", "Jokes"];
  const save = async () => {
    if (!name.trim()) { setError("Please tell Bloom what to call you."); return; }
    if (!selected.length) { setError("Choose at least one thing you enjoy."); return; }
    setSaving(true); setError("");
    try {
      const profile = await api<BloomProfile>("/profile", { method: "POST", body: JSON.stringify({ name: name.trim(), preferences: selected.join("|"), avoid: avoid.trim() }) });
      onDone(profile);
    } catch { setError("Bloom could not save your profile. Make sure the Java backend is running."); }
    finally { setSaving(false); }
  };
  return <div className="profileOnboarding">
    <section className="profileOnboardingCard">
      <Logo />
      <span className="eyebrow"><Sparkles /> Make Bloom yours</span>
      <h1>Let’s shape your space.</h1>
      <p>This is asked only once. Bloom uses it to choose calmer sounds, visuals, activities, and suggestions for you.</p>
      <label>What should Bloom call you?<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label>
      <div className="onboardingQuestion"><b>What do you naturally enjoy?</b><span>Pick as many as you like.</span></div>
      <div className="preferenceChips">{options.map((option) => <button className={selected.includes(option) ? "selected" : ""} onClick={() => setSelected((items) => items.includes(option) ? items.filter((item) => item !== option) : [...items, option])} key={option}>{option}</button>)}</div>
      <label>Anything Bloom should avoid?<textarea value={avoid} onChange={(event) => setAvoid(event.target.value)} placeholder="For example: loud sounds, bright colors, reminders..." /></label>
      {error && <div className="formError">{error}</div>}
      <button className="primary wide" disabled={saving} onClick={save}>{saving ? "Saving your space…" : "Create my Bloom space"} <ArrowUpRight /></button>
      <small>Your profile and wellbeing data stay separated from every other Bloom account.</small>
    </section>
  </div>;
}
function App() {
  const { user } = useUser();
  activeBloomUserId = user?.id || "";
  const [view, setView] = useState<View>("Today");
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState<BloomProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  useEffect(() => {
    document.body.classList.toggle("nav-open", menu);
    return () => document.body.classList.remove("nav-open");
  }, [menu]);
  useEffect(() => {
    if (!user?.id) return;
    activeBloomUserId = user.id;
    activeBloomProfile = null;
    setProfile(null);
    setProfileLoading(true);
    api<BloomProfile>("/profile").then((saved) => { activeBloomProfile = saved; setProfile(saved); }).catch(() => setProfile(null)).finally(() => setProfileLoading(false));
  }, [user?.id]);
  useEffect(() => {
    document.body.classList.toggle("dark", localStorage.getItem(userStorageKey("bloom-dark-mode")) === "true");
    document.body.dataset.palette = localStorage.getItem(userStorageKey("bloom-app-palette")) || "sage";
  }, []);
  if (profileLoading || (profile?.userId && profile.userId !== user?.id)) return <div className="profileLoading"><Logo /><span>Preparing your private space…</span></div>;
  if (!profile) return <ProfileOnboarding initialName={user?.firstName || user?.fullName || ""} onDone={(saved) => { activeBloomProfile = saved; setProfile(saved); }} />;
  activeBloomProfile = profile;
  let content =
    view === "Today" ? (
      <Today setView={setView} />
    ) : view === "Buddy" || view === "Bloom" ? (
      <BloomChat setView={setView} />
    ) : view === "Journal" ? (
      <Journal />
    ) : view === "Memories" ? (
      <Memories />
    ) : view === "Mood Music" ? (
      <MoodMusic setView={setView} />
    ) : view === "Music Studio" ? (
      <MusicStudioPage setView={setView} />
    ) : view === "Goals" ? (
      <Goals />
    ) : view === "Timeline" ? (
      <Timeline />
    ) : view === "Sounds" ? (
      null
    ) : view === "Meditation" ? (
      <Meditation />
    ) : view === "Mindful Breaks" || view === "Breathe" ? (
      <PlayRoom />
    ) : view === "Space" ? (
      <Space />
    ) : view === "Zen Place" ? (
      <ZenPlace />
    ) : view === "Grounding" || view === "Gratitude" ? (
      <Grounding />
    ) : (
      <SettingsPage />
    );
  return (
    <div className="app">
      <button
        className={menu ? "navBackdrop open" : "navBackdrop"}
        aria-label="Close navigation"
        onClick={() => setMenu(false)}
      />
      <Sidebar view={view} setView={setView} open={menu} setOpen={setMenu} profileName={profile.name} />
      <main>
        <Header
          view={view === "Bloom" ? "Buddy" : view}
          onMenu={() => setMenu(true)}
          setView={setView}
          name={profile.name}
        />
        <div hidden={view !== "Sounds"}><Sounds /></div>
        {content}
      </main>
    </div>
  );
}
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey =
  typeof clerkKey === "string" &&
  /^pk_(test|live)_/.test(clerkKey) &&
  clerkKey !== "pk_test_replace_with_your_publishable_key" &&
  clerkKey !== "pk_test_your_key_here";
function ClerkLogin() {
  const signingUp = location.pathname.startsWith("/sign-up");
  const appearance = {
    variables: {
      colorPrimary: "#476a5a",
      colorBackground: "#ffffff",
      borderRadius: "0.85rem",
      fontFamily: "DM Sans, sans-serif",
    },
    elements: {
      rootBox: "clerkRoot",
      cardBox: "clerkCardBox",
      card: "clerkCard",
      header: "hidden",
      footerItem: "hidden",
      formButtonPrimary: "clerkButton",
      footerActionLink: "clerkLink",
    },
  } as const;
  return (
    <div className="clerkLogin">
      <div className="clerkBrand">
        <Logo />
        <div>
          <span>Your private space to</span>
          <h1>
            feel, reflect,
            <br />
            and breathe easier.
          </h1>
          <p>
            Secure authentication, calming tools, and a wellbeing space shaped
            around you.
          </p>
          <div className="trustRow">
            <span>
              <ShieldCheck /> Protected account
            </span>
            <span>
              <Heart /> Private by design
            </span>
          </div>
        </div>
        <small>
          Bloom supports reflection and everyday wellbeing. It is not a medical
          or emergency service.
        </small>
      </div>
      <main className="clerkPanel">
        <div className="mobileLogo">
          <Logo />
        </div>
        <div className="bloomAuthIntro">
          <span className="eyebrow">
            <Sparkles /> {signingUp ? "Join Bloom" : "Welcome to Bloom"}
          </span>
          <h2>
            {signingUp ? "Create your calm space." : "Come back to yourself."}
          </h2>
          <p>
            {signingUp
              ? "Begin with a secure account that keeps your space private."
              : "Sign in securely to continue your private space."}
          </p>
        </div>
        {signingUp ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/"
            fallbackRedirectUrl="/"
            appearance={appearance}
          />
        ) : (
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
            appearance={appearance}
          />
        )}
        <p className="clerkLegal">
          <ShieldCheck /> Your account is protected with secure authentication.
        </p>
      </main>
    </div>
  );
}
function ClerkSetup() {
  return (
    <div className="clerkSetup">
      <Logo />
      <ShieldCheck />
      <h1>Connect Clerk to Bloom</h1>
      <p>
        Create a Clerk application, copy its publishable key, and add it to a
        local <code>.env</code> file:
      </p>
      <pre>VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here</pre>
      <small>
        Restart <b>npm run dev</b> after saving the file.
      </small>
    </div>
  );
}
function AuthenticatedRoot() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded)
    return (
      <div className="clerkLoading">
        <Logo />
        <span />
        <p>Opening your private space…</p>
      </div>
    );
  return isSignedIn ? <App /> : <ClerkLogin />;
}
function Root() {
  if (!hasValidClerkKey) return <ClerkSetup />;
  return (
    <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
      <AuthenticatedRoot />
    </ClerkProvider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/service-worker.js"),
  );
}
