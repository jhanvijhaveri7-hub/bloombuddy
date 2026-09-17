package com.bloom.repository;
import com.bloom.model.GoalItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface GoalRepository extends JpaRepository<GoalItem,Long>{List<GoalItem> findByUserIdOrderByCreatedAtDesc(String userId);}
