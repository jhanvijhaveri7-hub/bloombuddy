package com.bloom.repository;
import com.bloom.model.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface JournalRepository extends JpaRepository<JournalEntry,Long>{List<JournalEntry> findByUserIdOrderByCreatedAtDesc(String userId);}
