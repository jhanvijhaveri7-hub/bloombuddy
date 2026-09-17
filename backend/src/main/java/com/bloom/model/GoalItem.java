package com.bloom.model;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.*;
@Entity public class GoalItem {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(length=100) private String userId;
 @NotBlank @Column(nullable=false,length=180) private String title;
 @Column(length=1200) private String description; @Column(length=50) private String category; private LocalDate deadline;
 @Column(length=300) private String dailyStep; private int completedSteps=0; private int totalSteps=4; private int points=10; private boolean completed=false; private LocalDate dailyDoneDate;
 @Column(nullable=false,updatable=false) private Instant createdAt=Instant.now();
 public Long getId(){return id;} public String getUserId(){return userId;} public void setUserId(String v){userId=v;} public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public String getCategory(){return category;} public void setCategory(String v){category=v;} public LocalDate getDeadline(){return deadline;} public void setDeadline(LocalDate v){deadline=v;} public String getDailyStep(){return dailyStep;} public void setDailyStep(String v){dailyStep=v;} public int getCompletedSteps(){return completedSteps;} public void setCompletedSteps(int v){completedSteps=v;} public int getTotalSteps(){return totalSteps;} public void setTotalSteps(int v){totalSteps=v;} public int getPoints(){return points;} public void setPoints(int v){points=v;} public boolean isCompleted(){return completed;} public void setCompleted(boolean v){completed=v;} public LocalDate getDailyDoneDate(){return dailyDoneDate;} public void setDailyDoneDate(LocalDate v){dailyDoneDate=v;} public Instant getCreatedAt(){return createdAt;}
}
