package com.bloom.repository;
import com.bloom.model.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
public interface JournalRepository extends JpaRepository<JournalEntry,Long>{}
