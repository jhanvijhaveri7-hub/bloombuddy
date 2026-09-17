package com.bloom.model;
import jakarta.persistence.*;
import java.time.Instant;
@Entity public class JournalEntry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(length=100) private String userId;
 @Column(nullable=false,length=10000) private String content="";
 @Lob @Column(columnDefinition="CLOB") private String attachmentsJson="[]";
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getUserId(){return userId;} public void setUserId(String v){userId=v;} public String getContent(){return content;} public void setContent(String v){content=v==null?"":v;} public String getAttachmentsJson(){return attachmentsJson;} public void setAttachmentsJson(String v){attachmentsJson=v==null?"[]":v;} public Instant getCreatedAt(){return createdAt;}
}
