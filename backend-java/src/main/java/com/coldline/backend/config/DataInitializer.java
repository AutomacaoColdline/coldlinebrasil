package com.coldline.backend.config;

import com.coldline.backend.entity.Role;
import com.coldline.backend.entity.User;
import com.coldline.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        createAdminIfNotExists();
    }

    private void createAdminIfNotExists() {
        String adminEmail = "admin@coldline.com";

        if (userRepository.existsByEmail(adminEmail)) {
            log.info("Usuário admin já existe: {}", adminEmail);
            return;
        }

        User admin = User.builder()
                .name("Administrador ColdLine")
                .email(adminEmail)
                .password(passwordEncoder.encode("Admin@2024"))
                .role(Role.ADMIN)
                .build();

        userRepository.save(admin);

        log.info("=================================================");
        log.info("Usuário admin criado com sucesso!");
        log.info("Email: {}", adminEmail);
        log.info("Senha: Admin@2024");
        log.info("IMPORTANTE: Altere a senha em produção!");
        log.info("=================================================");
    }
}
