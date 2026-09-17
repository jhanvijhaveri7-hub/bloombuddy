package com.bloom.repository;
import com.bloom.model.MemoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface MemoryRepository extends JpaRepository<MemoryItem,Long>{List<MemoryItem> findByUserIdOrderByCreatedAtDesc(String userId);}
