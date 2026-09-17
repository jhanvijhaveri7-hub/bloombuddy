package com.bloom.api;

import com.bloom.model.*;
import com.bloom.repository.*;
import com.bloom.service.BuddyAiService;
import com.bloom.service.SpaceVideoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController @RequestMapping("/api/v1")
public class BloomController {
 private final GratitudeRepository gratitude; private final JournalRepository journal; private final MemoryRepository memories; private final GoalRepository goals; private final UserProfileRepository profiles; private final BuddyAiService buddyAi; private final SpaceVideoService spaceVideo;
 public BloomController(GratitudeRepository gratitude,JournalRepository journal,MemoryRepository memories,GoalRepository goals,UserProfileRepository profiles,BuddyAiService buddyAi,SpaceVideoService spaceVideo){this.gratitude=gratitude;this.journal=journal;this.memories=memories;this.goals=goals;this.profiles=profiles;this.buddyAi=buddyAi;this.spaceVideo=spaceVideo;}
 @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok","service","Bloom API");}
 private String owner(String userId){if(userId==null||userId.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"A signed-in user is required");return userId;}
 @GetMapping("/profile") public UserProfile profile(@RequestHeader("X-Bloom-User-Id") String userId){return profiles.findById(owner(userId)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Profile not created"));}
 @PostMapping("/profile") public UserProfile saveProfile(@RequestHeader("X-Bloom-User-Id") String userId,@Valid @RequestBody UserProfile input){String id=owner(userId);boolean firstProfile=profiles.count()==0;UserProfile profile=profiles.findById(id).orElseGet(UserProfile::new);profile.setUserId(id);profile.setName(input.getName().trim());profile.setPreferences(input.getPreferences());profile.setAvoid(input.getAvoid());UserProfile saved=profiles.save(profile);if(firstProfile){journal.findAll().stream().filter(x->x.getUserId()==null).forEach(x->{x.setUserId(id);journal.save(x);});memories.findAll().stream().filter(x->x.getUserId()==null).forEach(x->{x.setUserId(id);memories.save(x);});goals.findAll().stream().filter(x->x.getUserId()==null).forEach(x->{x.setUserId(id);goals.save(x);});gratitude.findAll().stream().filter(x->x.getUserId()==null).forEach(x->{x.setUserId(id);gratitude.save(x);});}return saved;}
 @GetMapping("/buddy/status") public Map<String,Object> buddyStatus(){return Map.of("aiConnected",buddyAi.configured(),"mode",buddyAi.configured()?"conversational-ai":"limited-fallback");}
 @PostMapping("/buddy/reply") public Map<String,String> buddyReply(@RequestBody Map<String,Object> body){
  String message=Objects.toString(body.get("message"),"").trim();
  String lower=message.toLowerCase(Locale.ROOT);
  if(message.isBlank()) return Map.of("reply","I’m here. You can start with just one word if that feels easier.","kind","support");
  if(lower.matches(".*(kill myself|suicide|end my life|want to die|hurt myself|self harm).*")) return Map.of(
   "reply","I’m really glad you told me. I can stay with you, but I’m not an emergency service. Please move away from anything you could use to hurt yourself, contact someone you trust right now, and call your local emergency number or a crisis helpline. Are you in immediate danger?",
   "kind","crisis");
  String image=Objects.toString(body.get("image"),"");
  String preferences=Objects.toString(body.get("preferences"),"").trim();
  String avoid=Objects.toString(body.get("avoid"),"").trim();
  String personalizedMessage=message+(preferences.isBlank()?"":"\nUser preferences: "+preferences)+(avoid.isBlank()?"":"\nPlease avoid: "+avoid);
  Optional<String> aiReply=buddyAi.reply(personalizedMessage,image);
  if(aiReply.isPresent()) return Map.of("reply",aiReply.get(),"kind","ai");
  if(lower.matches(".*(joke|cheer me|funny|laugh).*")) return Map.of("reply",pick(List.of(
   "Tiny joke break: why did the calendar look calm? It had all its days numbered. That was terrible—but did it earn even half a smile?",
   "Here’s a very gentle one: what do clouds wear under their clothes? Thunderwear. I’ll see myself out. Want another?",
   "A leaf walked into a café and said, ‘I’ll just have the usual—something brew-tiful.’ Okay, that one needs work. How are you feeling now?")),"kind","light");
  if(lower.matches(".*(anxious|anxiety|panic|nervous|overthink|worried|stress).*")) return Map.of("reply",pick(List.of(
   "That sounds exhausting—like your mind is trying to solve everything at once. Let’s make it smaller: what is the one thought that keeps returning?",
   "I’m with you. Before we solve anything, put both feet down and take one slow breath out. What feels most uncertain right now?",
   "You don’t have to force the anxiety away. We can sit beside it for a moment. Is this mostly about something that might happen, or something already happening?")),"kind","support");
  if(lower.matches(".*(sad|depressed|depression|lonely|cry|crying|empty|hopeless|feel low|feeling low|low today|feel down|feeling down|not okay|not fine|wanna be fine|want to be fine|upset|heavy).*")) return Map.of("reply",pick(List.of(
   "I’m sorry today feels this heavy. You don’t need to make it sound better for me. What happened just before the feeling became strongest?",
   "I hear you—you feel low and you just want to feel okay again. I won’t rush you or throw advice at you. Do you want to tell me what has been weighing on you?",
   "You don’t have to pretend you’re fine with me. We can take this one sentence at a time—has the low feeling been building, or did something happen today?",
   "I’m here with you in the low moment. We don’t have to fix everything right now. Have you eaten, rested, or spoken to anyone you trust today?")),"kind","support");
  if(lower.matches("^(na+h+|no+|nope|not really|idk|i don't know|i dont know)[.! ]*$")) return Map.of("reply",pick(List.of(
   "Okay. You don’t have to choose or explain anything yet. I can just stay here with you—what’s running through your mind?",
   "That’s okay. No pressure from me. Say it however it comes out, even if it’s messy.",
   "Fair enough. Let’s drop the question. Tell me what today has actually felt like for you.")),"kind","support");
  if(lower.matches(".*(angry|mad|frustrated|annoyed|hate).*")) return Map.of("reply",pick(List.of(
   "I can hear how frustrated you are. You don’t have to soften it here. What part felt most unfair?",
   "That would get under my skin too. Do you want to vent without fixing it, or work out what to do next?",
   "Okay, let it out. If your frustration could say one completely honest sentence, what would it say?")),"kind","support");
  if(lower.matches(".*(exam|presentation|interview|meeting|study|deadline|work).*")) return Map.of("reply",pick(List.of(
   "That’s a lot of pressure to carry. Let’s not tackle the whole thing—what is the smallest useful step you could finish in ten minutes?",
   "I get why that’s sitting heavily with you. Is the difficult part preparing, starting, or imagining how people might react?",
   "We can make this less intimidating together. Tell me what ‘good enough’ would look like, not perfect.")),"kind","coach");
  if(lower.matches(".*(good|great|happy|excited|proud|better|won).*")) return Map.of("reply",pick(List.of(
   "I love hearing that. What part of it are you most proud of?",
   "That sounds genuinely good—let’s not rush past it. What made the moment special for you?",
   "Look at you. I’m glad you told me. Do you want to save this as a memory so future-you can find it again?")),"kind","celebrate");
  return Map.of("reply",pick(List.of(
   "I’m listening. There’s more behind that, isn’t there? Tell me the part you haven’t said out loud yet.",
   "That makes sense to bring here. What would feel most helpful from me—listening, encouragement, or thinking it through together?",
   "Thank you for telling me. How did that leave you feeling afterward?",
   "I’m right here with you. Which part of this matters most to you right now?")),"kind","support");
 }
 @PostMapping(value="/buddy/transcribe",consumes="multipart/form-data") public Map<String,String> transcribe(@RequestParam("audio") MultipartFile audio){try{return buddyAi.transcribe(audio.getBytes(),Optional.ofNullable(audio.getOriginalFilename()).orElse("voice.webm"),Optional.ofNullable(audio.getContentType()).orElse("audio/webm")).map(text->Map.of("text",text)).orElseGet(()->Map.of("error","Voice transcription failed."));}catch(Exception e){return Map.of("error","Voice transcription failed.");}}
 @GetMapping("/space/video/status") public Map<String,Object> videoStatus(){return Map.of("configured",spaceVideo.configured(),"provider","Google Veo");}
 @PostMapping("/space/video") @ResponseStatus(HttpStatus.ACCEPTED) public SpaceVideoService.VideoJob createVideo(@RequestBody Map<String,String> body){String prompt=Objects.toString(body.get("prompt"),"").trim();if(prompt.length()<8) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Describe the place in a little more detail.");if(prompt.length()>2000) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Description is too long.");try{return spaceVideo.start(prompt);}catch(IllegalStateException error){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,error.getMessage());}}
 @GetMapping("/space/video/{id}") public SpaceVideoService.VideoJob videoJob(@PathVariable String id){SpaceVideoService.VideoJob job=spaceVideo.get(id);if(job==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Video job not found");return job;}
 @GetMapping(value="/space/video/{id}/content",produces="video/mp4") public byte[] videoContent(@PathVariable String id){try{byte[] content=spaceVideo.content(id);if(content==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Video is not ready");return content;}catch(ResponseStatusException error){throw error;}catch(Exception error){throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Could not load generated video");}}
 private int replyCursor=0;
 private synchronized String pick(List<String> replies){String reply=replies.get(replyCursor%replies.size());replyCursor++;return reply;}
 @GetMapping("/gratitude") public List<GratitudeNote> gratitude(@RequestHeader("X-Bloom-User-Id") String userId){return gratitude.findByUserIdOrderByCreatedAtDesc(owner(userId));}
 @PostMapping("/gratitude") @ResponseStatus(HttpStatus.CREATED) public GratitudeNote addGratitude(@RequestHeader("X-Bloom-User-Id") String userId,@Valid @RequestBody GratitudeNote note){note.setUserId(owner(userId));return gratitude.save(note);}
 @DeleteMapping("/gratitude/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteGratitude(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id){GratitudeNote item=gratitude.findById(id).filter(x->owner(userId).equals(x.getUserId())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));gratitude.delete(item);}
 @GetMapping("/journal") public List<JournalEntry> journal(@RequestHeader("X-Bloom-User-Id") String userId){return journal.findByUserIdOrderByCreatedAtDesc(owner(userId));}
 @PostMapping("/journal") @ResponseStatus(HttpStatus.CREATED) public JournalEntry addJournal(@RequestHeader("X-Bloom-User-Id") String userId,@Valid @RequestBody JournalEntry entry){entry.setUserId(owner(userId));return journal.save(entry);}
 @DeleteMapping("/journal/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteJournal(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id){JournalEntry item=journal.findById(id).filter(x->owner(userId).equals(x.getUserId())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));journal.delete(item);}
 @GetMapping("/memories") public List<MemoryItem> memories(@RequestHeader("X-Bloom-User-Id") String userId){return memories.findByUserIdOrderByCreatedAtDesc(owner(userId));}
 @PostMapping("/memories") @ResponseStatus(HttpStatus.CREATED) public MemoryItem addMemory(@RequestHeader("X-Bloom-User-Id") String userId,@Valid @RequestBody MemoryItem memory){memory.setUserId(owner(userId));return memories.save(memory);}
 @PutMapping("/memories/{id}") public MemoryItem updateMemory(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id,@Valid @RequestBody MemoryItem update){return memories.findById(id).filter(x->owner(userId).equals(x.getUserId())).map(memory->{memory.setTitle(update.getTitle());memory.setText(update.getText());memory.setTag(update.getTag());memory.setMood(update.getMood());memory.setMediaUrl(update.getMediaUrl());memory.setMediaType(update.getMediaType());memory.setFavorite(update.isFavorite());memory.setOccurredAt(update.getOccurredAt());return memories.save(memory);}).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Memory not found"));}
 @DeleteMapping("/memories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteMemory(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id){MemoryItem item=memories.findById(id).filter(x->owner(userId).equals(x.getUserId())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));memories.delete(item);}
 @GetMapping("/goals") public List<GoalItem> goals(@RequestHeader("X-Bloom-User-Id") String userId){return goals.findByUserIdOrderByCreatedAtDesc(owner(userId));}
 @PostMapping("/goals") @ResponseStatus(HttpStatus.CREATED) public GoalItem addGoal(@RequestHeader("X-Bloom-User-Id") String userId,@Valid @RequestBody GoalItem goal){goal.setUserId(owner(userId));goal.setCompletedSteps(Math.max(0,goal.getCompletedSteps()));goal.setTotalSteps(Math.max(1,goal.getTotalSteps()));return goals.save(goal);}
 @PutMapping("/goals/{id}") public GoalItem updateGoal(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id,@Valid @RequestBody GoalItem update){return goals.findById(id).filter(x->owner(userId).equals(x.getUserId())).map(goal->{goal.setTitle(update.getTitle());goal.setDescription(update.getDescription());goal.setCategory(update.getCategory());goal.setDeadline(update.getDeadline());goal.setDailyStep(update.getDailyStep());goal.setCompletedSteps(Math.max(0,Math.min(update.getCompletedSteps(),Math.max(1,update.getTotalSteps()))));goal.setTotalSteps(Math.max(1,update.getTotalSteps()));goal.setPoints(Math.max(0,update.getPoints()));goal.setCompleted(update.isCompleted());goal.setDailyDoneDate(update.getDailyDoneDate());return goals.save(goal);}).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Goal not found"));}
 @DeleteMapping("/goals/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteGoal(@RequestHeader("X-Bloom-User-Id") String userId,@PathVariable Long id){GoalItem item=goals.findById(id).filter(x->owner(userId).equals(x.getUserId())).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));goals.delete(item);}
 @DeleteMapping("/account") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteAccount(@RequestHeader("X-Bloom-User-Id") String userId){String id=owner(userId);journal.findAll().stream().filter(x->id.equals(x.getUserId())).forEach(journal::delete);memories.findAll().stream().filter(x->id.equals(x.getUserId())).forEach(memories::delete);goals.findAll().stream().filter(x->id.equals(x.getUserId())).forEach(goals::delete);gratitude.findAll().stream().filter(x->id.equals(x.getUserId())).forEach(gratitude::delete);profiles.deleteById(id);}
}
