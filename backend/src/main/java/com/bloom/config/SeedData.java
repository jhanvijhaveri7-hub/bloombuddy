package com.bloom.config;

import com.bloom.model.MemoryItem;
import com.bloom.repository.MemoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration public class SeedData {
 @Bean CommandLineRunner seed(MemoryRepository repo){return args->{if(repo.count()==0){
  add(repo,"Rainy evenings make you feel calm and focused.","Preference");
  add(repo,"Your grandmother is one of the people who grounds you.","Relationship");
  add(repo,"You want to learn enough guitar to play for friends.","Dream");
  add(repo,"Reading fiction helps you slow down after difficult days.","What helps");
 }};}
 private void add(MemoryRepository repo,String text,String tag){MemoryItem m=new MemoryItem();m.setText(text);m.setTag(tag);repo.save(m);}
}
