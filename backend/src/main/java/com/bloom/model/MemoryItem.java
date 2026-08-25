package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
@Entity public class MemoryItem {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @NotBlank @Column(nullable=false,length=2000) private String text;
 @NotBlank @Column(nullable=false) private String tag;
 @Column(length=160) private String title;
 @Column(length=30) private String mood;
 @Lob @Column(columnDefinition="CLOB") private String mediaUrl;
 @Column(length=30) private String mediaType;
 private Boolean favorite=false;
 private Instant occurredAt;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getText(){return text;} public void setText(String text){this.text=text;} public String getTag(){return tag;} public void setTag(String tag){this.tag=tag;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getMood(){return mood;} public void setMood(String mood){this.mood=mood;} public String getMediaUrl(){return mediaUrl;} public void setMediaUrl(String mediaUrl){this.mediaUrl=mediaUrl;} public String getMediaType(){return mediaType;} public void setMediaType(String mediaType){this.mediaType=mediaType;} public boolean isFavorite(){return Boolean.TRUE.equals(favorite);} public void setFavorite(boolean favorite){this.favorite=favorite;} public Instant getOccurredAt(){return occurredAt;} public void setOccurredAt(Instant occurredAt){this.occurredAt=occurredAt;} public Instant getCreatedAt(){return createdAt;}
}
