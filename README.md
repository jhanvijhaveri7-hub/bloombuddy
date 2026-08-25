# Bloom — Personal Life Companion

Bloom is a responsive product prototype built around one principle: every interaction should help a person return to life, not remain inside an app.

## Included experience

- Personalized home dashboard with evidence-based suggestions
- Bloom companion conversation with bounded, choice-oriented prompts
- Smart journal for text, voice, and photo entry concepts
- Editable and deletable Memory Vault / Life Model
- Pattern insights that clearly avoid diagnosis
- Meaningful goals and growth without streaks or scores
- Personal life timeline
- Privacy, AI-memory, and appearance controls
- Responsive desktop/mobile layout and dark mode

## Run locally

```bash
npm install
npm run dev
```

Open the local address shown by Vite. To create a production build:

```bash
npm run build
```

## Run frontend and backend

### Configure Clerk authentication

Create an application in the [Clerk Dashboard](https://dashboard.clerk.com), copy the publishable key, and create `.env` from `.env.example`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Never add the Clerk secret key to the React frontend. Restart Vite after changing `.env`.

Start the Java API in one terminal:

```bash
npm run backend
```

Then start React in a second terminal:

```bash
npm run dev
```

The API runs at `http://localhost:8080/api/v1` and uses an embedded H2 database. Journal entries, gratitude notes, and memories are persisted locally in `backend/data`.

## Cross-platform app

Bloom now uses one React + TypeScript codebase for:

- Web browsers on computers and phones
- An installable PWA on iPhone, iPad, and Android
- Native Android through Capacitor
- Native iPhone/iPad through Capacitor and Xcode

To install the PWA after it is deployed over HTTPS, open Bloom in Safari on iPhone, tap **Share**, then **Add to Home Screen**. This option does not require Xcode.

Synchronize the latest web build into every native platform:

```bash
npm run mobile:sync
```

## Android app

Bloom includes a Capacitor Android project in `android/` with application ID `com.jhanvi.bloom`.

Synchronize the latest React build into Android:

```bash
npm run mobile:sync
```

Open the native project after installing Android Studio:

```bash
npm run mobile:open
```

Build a debug APK when the Android SDK is configured:

```bash
npm run android:apk
```

The APK will be written to `android/app/build/outputs/apk/debug/app-debug.apk`.

The Android emulator uses `http://10.0.2.2:8080/api/v1` from `.env.android` to reach the Java backend on the development computer. For a physical phone or release build, replace `VITE_API_URL` with a reachable HTTPS backend URL and add the mobile origin/redirect URL in the Clerk Dashboard.

## iPhone and iPad app

The native project is stored in `ios/`. On a Mac with Xcode installed, run:

```bash
npm install
npm run ios:sync
npm run ios:open
```

Select your Apple developer team and connected iPhone in Xcode, then press **Run**. A Mac is required only for compiling and signing the native iOS app; the shared Bloom code can still be edited and built on Windows.

For a real iPhone, configure `VITE_API_URL` with a publicly reachable HTTPS backend. `localhost:8080` refers to the phone itself and cannot reach the Java server on the Windows computer. Add the deployed site and iOS callback/redirect addresses to Clerk's allowed URLs as well.

## Product architecture for the full platform

The prototype is the validated React + TypeScript experience layer. The production system should use a modular Spring Boot backend with these bounded contexts:

1. Identity: users, profiles, sessions, JWT rotation, password reset.
2. Life Model: explicit memories, preferences, relationships, provenance, consent, deletion.
3. Conversations: threads, messages, safety classification, summarized context.
4. Journal: entries, media metadata, extracted candidates, reflections.
5. Growth: goals, milestones, activities, timeline events.
6. Intelligence: embeddings, retrieval, pattern evidence, recommendations, provider abstraction.
7. Integrations: calendar and future hardware clients through scoped device tokens and versioned APIs.

Use MySQL as the system of record and a vector-capable store behind a `VectorMemoryPort`. AI providers should implement an `AiProvider` interface so OpenAI and Groq can be switched without touching product services. Never write an extracted memory directly: store it first as a candidate, retain its source, confidence and consent status, and allow the user to approve, edit, reject or delete it.

Recommended API namespace: `/api/v1`. Future hardware should authenticate separately from user sessions through `/api/v1/devices`, publish events through an idempotent ingestion endpoint, and consume only a least-privilege context projection—never the entire Life Model.

## Safety rules

- Bloom must not diagnose, claim consciousness, or present itself as a therapist.
- Recommendations must cite the user's own evidence internally and expose a “Why this?” explanation.
- Crisis-language handling should interrupt normal generation and show local emergency/support options.
- Sensitive memories require explicit approval and must support immediate deletion.
- Optimize success around actions completed away from the screen, not time in app or message count.
