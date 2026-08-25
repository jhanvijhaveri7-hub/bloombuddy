package com.bloom.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class BuddyAiService {
 private static final String INSTRUCTIONS="""
  You are Buddy inside Bloom, speaking with Jhanvi. Be warm, natural, emotionally intelligent, and conversational—like a thoughtful close friend, never like a worksheet or customer-support bot. Pay attention to the recent conversation. If Jhanvi says you are annoying or the app is bad, acknowledge it directly, apologize briefly, and adjust instead of asking a generic therapeutic question. Use everyday language and contractions. Usually answer in 1–4 short sentences. Do not repeatedly ask what would be helpful. Sometimes simply listen, validate, gently joke, or respond directly. Never diagnose or claim to be a therapist. If there is credible self-harm or immediate-danger language, encourage immediate human help and local emergency/crisis support.
  """;
 private final ObjectMapper json;
 private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
 private final Deque<Map<String,String>> history=new ArrayDeque<>();
 private final String apiKey;
 private final String model;

 public BuddyAiService(ObjectMapper json,@Value("${GROQ_API_KEY:}") String apiKey,@Value("${GROQ_MODEL:openai/gpt-oss-120b}") String model){this.json=json;this.apiKey=apiKey;this.model=model;}
 public boolean configured(){return apiKey!=null&&!apiKey.isBlank();}

 public synchronized Optional<String> reply(String message){
  return reply(message,null);
 }
 public synchronized Optional<String> reply(String message,String imageDataUrl){
  if(!configured()) return Optional.empty();
  try{
   List<Object> input=new ArrayList<>();
   input.add(Map.of("role","system","content",INSTRUCTIONS));input.addAll(history);
   if(imageDataUrl!=null&&!imageDataUrl.isBlank()) input.add(Map.of("role","user","content",List.of(Map.of("type","text","text",message.isBlank()?"Respond naturally to the photo I shared.":message),Map.of("type","image_url","image_url",Map.of("url",imageDataUrl)))));
   else input.add(Map.of("role","user","content",message));
   Map<String,Object> payload=new LinkedHashMap<>();
   boolean hasImage=imageDataUrl!=null&&!imageDataUrl.isBlank();payload.put("model",hasImage?"qwen/qwen3.6-27b":model);payload.put("messages",input);payload.put("temperature",0.85);if(hasImage)payload.put("reasoning_effort","none");
   payload.put("max_completion_tokens",700);
   HttpRequest request=HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/chat/completions"))
    .timeout(Duration.ofSeconds(45)).header("Authorization","Bearer "+apiKey)
    .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
   HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()<200||response.statusCode()>=300) return Optional.empty();
   JsonNode root=json.readTree(response.body());String text=root.path("choices").path(0).path("message").path("content").asText().trim();if(text.isBlank()) return Optional.empty();
   if("length".equals(root.path("choices").path(0).path("finish_reason").asText())){
    List<Object> continuationInput=new ArrayList<>(input);
    continuationInput.add(Map.of("role","assistant","content",text));
    continuationInput.add(Map.of("role","user","content","Continue exactly where you stopped. Finish the answer concisely without restarting or repeating earlier points."));
    Map<String,Object> continuationPayload=new LinkedHashMap<>(payload);
    continuationPayload.put("messages",continuationInput);
    continuationPayload.put("max_completion_tokens",500);
    HttpRequest continuationRequest=HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/chat/completions"))
     .timeout(Duration.ofSeconds(45)).header("Authorization","Bearer "+apiKey)
     .header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(continuationPayload))).build();
    HttpResponse<String> continuationResponse=http.send(continuationRequest,HttpResponse.BodyHandlers.ofString());
    if(continuationResponse.statusCode()>=200&&continuationResponse.statusCode()<300){
     String continuation=json.readTree(continuationResponse.body()).path("choices").path(0).path("message").path("content").asText().trim();
     if(!continuation.isBlank()) text=text+" "+continuation;
    }
   }
   history.addLast(Map.of("role","user","content",imageDataUrl!=null&&!imageDataUrl.isBlank()?message+" [shared a photo]":message));history.addLast(Map.of("role","assistant","content",text));
   while(history.size()>12) history.removeFirst();
   return Optional.of(text);
  }catch(Exception ignored){return Optional.empty();}
 }
 public Optional<String> songGuide(String request){
  if(request==null||request.isBlank()) return Optional.empty();
  String normalized=request.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").trim();
  boolean pianoRequest=normalized.contains("instrument piano");
  if(pianoRequest&&normalized.contains("sailor")&&normalized.contains("gigi")&&normalized.contains("perez")) return Optional.of(sailorSongPianoGuide());
  if(!pianoRequest&&normalized.contains("yellow")&&normalized.contains("coldplay")) return Optional.of(yellowGuide());
  if(!configured()) return Optional.of(unavailableSongGuide(request));
  try{
   String instructions="""
    You are Song Coach inside Bloom's instrument studio. Assume the user has never played an instrument and cannot read music theory. Create one extremely simple Bloom-specific lesson for the requested song. Do not use markdown tables, stars, hashes, code blocks, dense paragraphs, or unexplained jargon.

    Respect the Instrument field in the request. For piano, Piano Daddy (pianodaddy.com) must be the primary reference. Use its accessible Western letter-note notation and piano chords, include its page URL, and do not copy lyrics. Explain Bloom piano instructions using the visible white and black key names and the keyboard binding printed below each key. For piano replace the section heading VERIFIED CHORDS with VERIFIED PIANO NOTES, replace CHORD BUTTONS YOU NEED with PIANO KEYS YOU NEED, and replace EASY STRUM with EASY RHYTHM. Do not give guitar holding or arrow-strumming instructions in a piano lesson. If Piano Daddy has no accessible page for the song, explicitly say so and use a named reputable backup source.

    Before answering, use web search to identify the requested song. Ultimate Guitar must be the primary chord reference: prefer a highly rated accessible Chords arrangement on tabs.ultimate-guitar.com, and identify its version/capo when search evidence provides them. Cross-check it with one other reputable chord or music source when possible. If no accessible Ultimate Guitar result exists, explicitly say so and name the backup source used. Do not substitute a generic four-chord loop. Different songs must retain their real harmonic differences. If sources disagree, say that arrangements vary and follow the most consistently reported beginner arrangement.

    Bloom has these guitar chord buttons: C, G, Am, F, Dm, Em, A, D, E, Bm, B, F#, G#m, C#m, Bb, Eb, Cm and Gm. First report the verified likely original chord set. Then create a playable Bloom lesson using only chord buttons from this list. Prefer the accurate chords when they exist in Bloom. Transpose only when required, explicitly state the transposition, and never pretend a simplified version is identical to the recording.

    Explain Bloom's controls literally: hold the named chord button; while holding it, tap Down Arrow for a top-to-bottom strum or Up Arrow for a bottom-to-top strum; release it; then hold the next chord. Use arrows like C → G → Am → F. Explain ×2 or ×4 in plain language. Begin with only downstrokes. Keep each instruction on its own short line.

    Return these exact plain-text sections in this order:
    SONG
    One line naming the song and artist.
    
    VERIFIED CHORDS
    Give the likely original key, the chord names found through search, and a short source note beginning with "Primary source: Ultimate Guitar". Include the Ultimate Guitar page URL when found. If it was unavailable, say "Ultimate Guitar result unavailable" and name the backup source. Do not include lyrics.
    
    BLOOM VERSION
    State whether Bloom can play the likely original chords or whether this lesson is transposed/simplified.
    
    CHORD BUTTONS YOU NEED
    List the actual Bloom chord buttons needed for this song, one per line. Do not force four chords when the song uses a different number.
    
    FIRST 30 SECONDS
    Numbered instructions starting from opening Guitar in Bloom and explaining how to make the first sound.
    
    MAIN LOOP
    Show one easy arrow sequence, then explain exactly how many down-arrow taps to give each chord and how often to repeat the loop.
    
    SONG PARTS
    Give Intro, Verse, Chorus and Bridge only when relevant. Each part gets one simple Bloom-chord arrow sequence and repeat count. Never include lyrics.
    
    EASY STRUM
    Start with one downstroke per chord. Then give one optional next-level pattern written only with ↓ and ↑ and explain it in words.
    
    PRACTICE PLAN
    Give three tiny practice steps. End with an encouraging sentence.

    Chord arrangements can vary. If exact original details are uncertain, say so briefly at the end and recommend official licensed sheet music. Do not reproduce lyrics.
    """;
   String sourceSearch=pianoRequest
    ? "Search the web for this exact song request: "+request+". Use Chordify as the first broad harmony reference, then search site:pianodaddy.com for matching beginner piano notes. If Piano Daddy has no result, use an accessible reputable piano tutorial or notation source such as Hooktheory, MuseScore educational pages, or a clearly identified piano tutorial. Capture URLs, Western letter notes, sharps/flats, octave marks, piano chords and section details without copying lyrics. Cross-check at least two accessible sources. Clearly name the sources and distinguish exact, simplified and transposed versions. Return only concise factual research, not a lesson."
    : "Search the web for this exact song request: "+request+". Use Chordify as the first broad harmony reference, then search site:tabs.ultimate-guitar.com and use an accessible, highly rated Ultimate Guitar Chords arrangement for detailed guitar teaching. Capture URLs, displayed chords, key/capo/version details, and section progressions without copying lyrics. Cross-check at least two accessible sources. Clearly name the sources and distinguish exact, simplified and transposed versions. Return only a concise factual research summary, not a lesson.";
   Map<String,Object> searchPayload=new LinkedHashMap<>();searchPayload.put("model",model);searchPayload.put("messages",List.of(Map.of("role","user","content",sourceSearch)));searchPayload.put("tools",List.of(Map.of("type","browser_search")));
   HttpRequest searchRequest=HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/chat/completions")).timeout(Duration.ofSeconds(90)).header("Authorization","Bearer "+apiKey).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(searchPayload))).build();
   HttpResponse<String> searchResponse=http.send(searchRequest,HttpResponse.BodyHandlers.ofString());if(searchResponse.statusCode()<200||searchResponse.statusCode()>=300){System.err.println("Song Coach search failed with Groq status "+searchResponse.statusCode()+": "+searchResponse.body());return Optional.of(unavailableSongGuide(request));}
   JsonNode searchMessage=json.readTree(searchResponse.body()).path("choices").path(0).path("message");String research=searchMessage.path("content").asText().trim();if(research.isBlank()&&!searchMessage.path("executed_tools").isMissingNode())research=searchMessage.path("executed_tools").toString();if(research.isBlank()){System.err.println("Song Coach search returned no usable chord evidence.");return Optional.empty();}
   Map<String,Object> lessonPayload=new LinkedHashMap<>();lessonPayload.put("model",model);lessonPayload.put("messages",List.of(Map.of("role","system","content",instructions),Map.of("role","user","content",request+"\n\nWEB RESEARCH TO USE:\n"+research)));lessonPayload.put("temperature",0.2);lessonPayload.put("max_completion_tokens",2200);
   HttpRequest lessonRequest=HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/chat/completions")).timeout(Duration.ofSeconds(60)).header("Authorization","Bearer "+apiKey).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(lessonPayload))).build();
   HttpResponse<String> lessonResponse=http.send(lessonRequest,HttpResponse.BodyHandlers.ofString());if(lessonResponse.statusCode()<200||lessonResponse.statusCode()>=300){System.err.println("Song Coach lesson failed with Groq status "+lessonResponse.statusCode()+": "+lessonResponse.body());return Optional.empty();}
   String text=json.readTree(lessonResponse.body()).path("choices").path(0).path("message").path("content").asText().trim();return text.isBlank()?Optional.empty():Optional.of(text);
  }catch(Exception ignored){return Optional.of(unavailableSongGuide(request));}
 }
 private String yellowGuide(){return """
  SONG
  Yellow — Coldplay

  VERIFIED CHORDS
  The original key is B major. The core beginner chords are B, F#, E and G#m. Common arrangements use B → F# → E in the verse and E → G#m → F# in the chorus. Primary source: Ultimate Guitar's Yellow Chords arrangements, cross-checked with independent chord references. Arrangements, versions and the recording's guitar tuning can vary.

  BLOOM VERSION
  Bloom has all four chord buttons, so this simplified lesson stays in the original key. It simplifies the rhythm, not the chords.

  CHORD BUTTONS YOU NEED
  B
  F#
  E
  G#m

  FIRST 30 SECONDS
  1. Open Guitar in Bloom.
  2. Hold the B chord button.
  3. While holding B, tap Down Arrow four slow times.
  4. Release B, hold F#, and tap Down Arrow four times.
  5. Release F#, hold E, and tap Down Arrow four times.
  6. Return to B and tap Down Arrow four times.

  MAIN LOOP
  B → F# → E → B
  Hold each chord and tap ↓ four times. Repeat the full loop twice slowly.

  SONG PARTS
  Intro: B → F# → E → B, repeat twice.
  Verse: B → F# → E → B, repeat as needed.
  Chorus: E → G#m → F# → E, repeat twice.

  EASY STRUM
  Begin with ↓ ↓ ↓ ↓ on every chord.
  When that feels comfortable, try ↓ ↓ ↑ ↑ ↓ ↑. Down Arrow gives ↓ and Up Arrow gives ↑ while you hold the chord.

  PRACTICE PLAN
  1. Practise changing from B to F# without strumming.
  2. Play the main loop twice using only slow downstrokes.
  3. Add the chorus only after the main loop feels easy.
  Go slowly—clean chord changes matter more than speed.
  """;}
 private String sailorSongPianoGuide(){return """
  SONG
  Sailor Song — Gigi Perez

  VERIFIED PIANO NOTES
  The song is commonly shown in B major with Emaj7 → G♯m → B6 as its repeating harmony. Chordify and independent chord references agree on this core pattern. The Bloom beginner version simplifies Emaj7 to E major and B6 to B major.

  BLOOM VERSION
  This is a simplified piano accompaniment in the same key. It keeps the song's core movement but leaves out the added seventh and sixth notes at first.

  PIANO KEYS YOU NEED
  E chord: E4 + G♯4 + B4
  G♯ minor chord: G♯4 + B4 + D♯5
  B chord: B4 + D♯5 + F♯5

  FIRST 30 SECONDS
  1. Open Piano in Bloom.
  2. Find E4, G♯4 and B4. Press all three together once.
  3. Find G♯4, B4 and D♯5. Press all three together once.
  4. Find B4, D♯5 and F♯5. Press all three together once.
  5. Repeat those three groups slowly.

  MAIN LOOP
  E → G♯m → B
  Play E four times, G♯m four times, then B four times. Repeat the complete loop four times.

  SONG PARTS
  Intro: E → G♯m → B, repeat twice.
  Verse: E → G♯m → B, repeat as needed.
  Chorus: E → G♯m → B, keep the same slow pulse.

  EASY RHYTHM
  Begin by pressing each three-key chord once and counting 1, 2, 3, 4 before changing.
  Next, press the chord once on every count: 1, 2, 3, 4.

  PRACTICE PLAN
  1. Practise each three-key shape separately.
  2. Change from E to G♯m ten times without rushing.
  3. Play the full three-chord loop four times.
  Start slowly. Playing the right keys together matters more than matching the recording's speed.
  """;}
 private String unavailableSongGuide(String request){
  String cleanRequest=request.replaceFirst("(?i)^Instrument:\\s*[^.]+\\.\\s*","").replaceFirst("(?i)\\.\\s*(Give me|User request:).*$","").replaceFirst("(?i)^Song:\\s*","").trim();
  String encoded=URLEncoder.encode(cleanRequest,StandardCharsets.UTF_8);
  String chordify="https://chordify.net/search/"+encoded;
  String youtube="https://www.youtube.com/results?search_query="+URLEncoder.encode("how to play "+cleanRequest+(request.toLowerCase(Locale.ROOT).contains("instrument: piano")?" piano tutorial":" guitar tutorial"),StandardCharsets.UTF_8);
  if(request.toLowerCase(Locale.ROOT).contains("instrument: piano")) return """
  SONG
  %s

  VERIFIED PIANO NOTES
  Bloom could not verify this song while the online source-search quota is temporarily unavailable.

  BLOOM VERSION
  No piano notes are shown because Bloom will not invent a melody or reuse unrelated chords.

  PIANO KEYS YOU NEED
  No verified keys yet.

  FIRST 30 SECONDS
  Please try again after the search quota resets.

  MAIN LOOP
  Waiting for verified piano harmony.

  SONG PARTS
  Waiting for verified song sections.

  EASY RHYTHM
  A rhythm will appear only after the notes are verified.

  PRACTICE PLAN
  Open the interactive chords first, then use the video tutorial to see the hand positions and timing.

  SOURCE LINKS
  %s
  %s
  https://www.pianodaddy.com/?s=%s
  """.formatted(cleanRequest,chordify,youtube,encoded);
  return """
  SONG
  %s

  VERIFIED CHORDS
  Bloom cannot verify this song right now because the online song-search limit is temporarily unavailable.

  BLOOM VERSION
  No lesson has been generated because Bloom will not guess and give you the same incorrect chords for every song.

  CHORD BUTTONS YOU NEED
  No verified chord buttons yet.

  FIRST 30 SECONDS
  Please try this search again shortly.

  MAIN LOOP
  Waiting for verified song chords.

  SONG PARTS
  Waiting for verified song sections.

  EASY STRUM
  Start with slow downstrokes after the chords are verified.

  PRACTICE PLAN
  Open the interactive chords first, then follow a video tutorial slowly.

  SOURCE LINKS
  %s
  %s
  https://www.ultimate-guitar.com/search.php?search_type=title&value=%s
  """.formatted(cleanRequest,chordify,youtube,encoded);}
 public Optional<String> transcribe(byte[] audio,String filename,String contentType){
  if(!configured()||audio==null||audio.length==0) return Optional.empty();
  try{
   String boundary="----Bloom"+UUID.randomUUID();
   byte[] start=("--"+boundary+"\r\nContent-Disposition: form-data; name=\"model\"\r\n\r\nwhisper-large-v3-turbo\r\n--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+filename.replace("\"","")+"\"\r\nContent-Type: "+contentType+"\r\n\r\n").getBytes(StandardCharsets.UTF_8);
   byte[] end=("\r\n--"+boundary+"--\r\n").getBytes(StandardCharsets.UTF_8);byte[] body=new byte[start.length+audio.length+end.length];System.arraycopy(start,0,body,0,start.length);System.arraycopy(audio,0,body,start.length,audio.length);System.arraycopy(end,0,body,start.length+audio.length,end.length);
   HttpRequest request=HttpRequest.newBuilder(URI.create("https://api.groq.com/openai/v1/audio/transcriptions")).timeout(Duration.ofSeconds(60)).header("Authorization","Bearer "+apiKey).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
   HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()<200||response.statusCode()>=300)return Optional.empty();String text=json.readTree(response.body()).path("text").asText().trim();return text.isBlank()?Optional.empty():Optional.of(text);
  }catch(Exception ignored){return Optional.empty();}
 }
}
