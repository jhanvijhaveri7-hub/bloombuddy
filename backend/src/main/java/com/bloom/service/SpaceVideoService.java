package com.bloom.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SpaceVideoService {
 public record VideoJob(String id,String status,String prompt,String videoUrl,String error,Instant createdAt){}
 private final ObjectMapper json;
 private final String apiKey;
 private final String model;
 private final HttpClient http=HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL).connectTimeout(Duration.ofSeconds(15)).build();
 private final Map<String,VideoJob> jobs=new ConcurrentHashMap<>();

 public SpaceVideoService(ObjectMapper json,@Value("${GEMINI_API_KEY:}") String apiKey,@Value("${VEO_MODEL:veo-3.1-fast-generate-preview}") String model){this.json=json;this.apiKey=apiKey;this.model=model;}
 public boolean configured(){return apiKey!=null&&!apiKey.isBlank();}
 public VideoJob start(String prompt){
  if(!configured()) throw new IllegalStateException("GEMINI_API_KEY is not configured");
  String id=UUID.randomUUID().toString();
  VideoJob queued=new VideoJob(id,"queued",prompt,"","",Instant.now());jobs.put(id,queued);
  Thread.startVirtualThread(()->generate(id,prompt));
  return queued;
 }
 public VideoJob get(String id){return jobs.get(id);}
 public byte[] content(String id)throws Exception{
  VideoJob job=jobs.get(id);if(job==null||!"ready".equals(job.status())||job.videoUrl().isBlank()) return null;
  HttpRequest request=HttpRequest.newBuilder(URI.create(job.videoUrl())).timeout(Duration.ofMinutes(3)).header("x-goog-api-key",apiKey).GET().build();
  HttpResponse<byte[]> response=http.send(request,HttpResponse.BodyHandlers.ofByteArray());
  if(response.statusCode()<200||response.statusCode()>=300) throw new IllegalStateException("Could not download generated video");
  return response.body();
 }
 private void generate(String id,String prompt){
  try{
   jobs.computeIfPresent(id,(key,job)->new VideoJob(id,"generating",prompt,"","",job.createdAt()));
   String enhanced=prompt+". A peaceful cinematic environmental shot, subtle continuous natural movement, slow stable camera, calming atmosphere, no text, no logos, no abrupt cuts, designed to loop smoothly.";
   Map<String,Object> payload=Map.of("instances",new Object[]{Map.of("prompt",enhanced)},"parameters",Map.of("aspectRatio","16:9","resolution","720p","numberOfVideos",1,"negativePrompt","text, subtitles, logos, watermark, jump cuts, flashing lights, distorted objects"));
   String endpoint="https://generativelanguage.googleapis.com/v1beta/models/"+model+":predictLongRunning";
   HttpRequest request=HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofMinutes(2)).header("x-goog-api-key",apiKey).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(payload))).build();
   HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()<200||response.statusCode()>=300) throw new IllegalStateException(apiError(response.body(),"Video generation request failed ("+response.statusCode()+")"));
   String operation=json.readTree(response.body()).path("name").asText();if(operation.isBlank()) throw new IllegalStateException("Veo did not return an operation id");
   poll(id,prompt,operation);
  }catch(Exception error){jobs.computeIfPresent(id,(key,job)->new VideoJob(id,"failed",prompt,"",safeMessage(error),job.createdAt()));}
 }
 private void poll(String id,String prompt,String operation)throws Exception{
  for(int attempt=0;attempt<90;attempt++){
   Thread.sleep(10_000);
   HttpRequest request=HttpRequest.newBuilder(URI.create("https://generativelanguage.googleapis.com/v1beta/"+operation)).timeout(Duration.ofSeconds(45)).header("x-goog-api-key",apiKey).GET().build();
   HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
   if(response.statusCode()<200||response.statusCode()>=300) throw new IllegalStateException(apiError(response.body(),"Could not check video status"));
   JsonNode root=json.readTree(response.body());if(!root.path("done").asBoolean(false)) continue;
   if(root.has("error")) throw new IllegalStateException(root.path("error").path("message").asText("Video generation failed"));
   String uri=root.path("response").path("generateVideoResponse").path("generatedSamples").path(0).path("video").path("uri").asText();
   if(uri.isBlank()) uri=root.path("response").path("generatedVideos").path(0).path("video").path("uri").asText();
   if(uri.isBlank()) throw new IllegalStateException("Veo completed without a downloadable video");
   String finalUri=uri;jobs.computeIfPresent(id,(key,job)->new VideoJob(id,"ready",prompt,finalUri,"",job.createdAt()));return;
  }
  throw new IllegalStateException("Video generation timed out. Please try again.");
 }
 private String apiError(String body,String fallback){try{String message=json.readTree(body).path("error").path("message").asText();return message.isBlank()?fallback:message;}catch(Exception ignored){return fallback;}}
 private String safeMessage(Exception error){String message=error.getMessage();return message==null||message.isBlank()?"Video generation failed. Please try again.":message;}
}
