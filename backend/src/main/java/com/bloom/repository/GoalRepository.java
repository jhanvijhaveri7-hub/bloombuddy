package com.bloom.repository;
import com.bloom.model.GoalItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface GoalRepository extends JpaRepository<GoalItem,Long>{}
