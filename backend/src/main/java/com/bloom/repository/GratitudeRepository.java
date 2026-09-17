package com.bloom.repository;
import com.bloom.model.GratitudeNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface GratitudeRepository extends JpaRepository<GratitudeNote,Long>{List<GratitudeNote> findByUserIdOrderByCreatedAtDesc(String userId);}
