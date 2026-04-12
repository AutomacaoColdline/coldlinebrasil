package com.coldline.backend.controller;

import com.coldline.backend.dto.DashboardResponse;
import com.coldline.backend.dto.UserDTO;
import com.coldline.backend.entity.User;
import com.coldline.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(Authentication authentication) {
        String email = authentication.getName();
        log.debug("Acesso ao dashboard: {}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        Map<String, Object> stats = Map.of(
                "totalUsers", userRepository.count(),
                "totalServices", 12,
                "totalContacts", 47,
                "uptime", "99.9%"
        );

        DashboardResponse response = DashboardResponse.builder()
                .message("Bem-vindo ao Dashboard ColdLine Brasil!")
                .user(UserDTO.from(user))
                .stats(stats)
                .build();

        return ResponseEntity.ok(response);
    }
}
