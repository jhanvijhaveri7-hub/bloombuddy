package com.bloom.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class HomeController {
  @GetMapping("/")
  public Map<String, Object> home() {
    return Map.of(
        "service", "Bloom API",
        "status", "running",
        "message", "The Bloom website runs at http://localhost:5173",
        "apiBase", "/api/v1",
        "availableEndpoints", List.of(
            "/api/v1/health",
            "/api/v1/profile",
            "/api/v1/journal",
            "/api/v1/gratitude",
            "/api/v1/memories"
        )
    );
  }
}
