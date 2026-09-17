package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
@Entity public class UserProfile {
 @Id @Column(length=100) private String userId;
 @NotBlank @Column(nullable=false,length=100) private String name;
 @Column(nullable=false,length=2000) private String preferences=""; @Column(length=500) private String avoid="";
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public String getUserId(){return userId;} public void setUserId(String v){userId=v;} public String getName(){return name;} public void setName(String v){name=v;} public String getPreferences(){return preferences;} public void setPreferences(String v){preferences=v==null?"":v;} public String getAvoid(){return avoid;} public void setAvoid(String v){avoid=v==null?"":v;} public Instant getCreatedAt(){return createdAt;}
}
