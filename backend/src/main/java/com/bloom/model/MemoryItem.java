package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
@Entity public class MemoryItem {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(length=100) private String userId;
 @NotBlank @Column(nullable=false,length=2000) private String text;
 @NotBlank @Column(nullable=false) private String tag;
 @Column(length=160) private String title; @Column(length=30) private String mood;
 @Lob @Column(columnDefinition="CLOB") private String mediaUrl; @Column(length=30) private String mediaType;
 private Boolean favorite=false; private Instant occurredAt;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getUserId(){return userId;} public void setUserId(String v){userId=v;} public String getText(){return text;} public void setText(String v){text=v;} public String getTag(){return tag;} public void setTag(String v){tag=v;} public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getMood(){return mood;} public void setMood(String v){mood=v;} public String getMediaUrl(){return mediaUrl;} public void setMediaUrl(String v){mediaUrl=v;} public String getMediaType(){return mediaType;} public void setMediaType(String v){mediaType=v;} public boolean isFavorite(){return Boolean.TRUE.equals(favorite);} public void setFavorite(boolean v){favorite=v;} public Instant getOccurredAt(){return occurredAt;} public void setOccurredAt(Instant v){occurredAt=v;} public Instant getCreatedAt(){return createdAt;}
}
