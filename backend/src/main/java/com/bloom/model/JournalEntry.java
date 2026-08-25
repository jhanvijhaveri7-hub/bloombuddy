package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
@Entity public class JournalEntry {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,length=10000) private String content="";
 @Lob @Column(columnDefinition="CLOB") private String attachmentsJson="[]";
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getContent(){return content;} public void setContent(String content){this.content=content==null?"":content;} public String getAttachmentsJson(){return attachmentsJson;} public void setAttachmentsJson(String attachmentsJson){this.attachmentsJson=attachmentsJson==null?"[]":attachmentsJson;} public Instant getCreatedAt(){return createdAt;}
}
