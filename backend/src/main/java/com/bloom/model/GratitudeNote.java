package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
@Entity public class GratitudeNote {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(length=100) private String userId;
 @NotBlank @Column(nullable=false,length=1000) private String text;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getUserId(){return userId;} public void setUserId(String v){userId=v;} public String getText(){return text;} public void setText(String v){text=v;} public Instant getCreatedAt(){return createdAt;}
}
