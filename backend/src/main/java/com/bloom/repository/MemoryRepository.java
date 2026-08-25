package com.bloom.repository;
import com.bloom.model.MemoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface MemoryRepository extends JpaRepository<MemoryItem,Long>{}
