package com.coldline.backend.service;

import com.coldline.backend.dto.LoginRequest;
import com.coldline.backend.dto.LoginResponse;
import com.coldline.backend.dto.UserDTO;
import com.coldline.backend.entity.User;
import com.coldline.backend.repository.UserRepository;
import com.coldline.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    log.warn("Tentativa de login com email inexistente: {}", request.getEmail());
                    return new BadCredentialsException("Credenciais inválidas");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Tentativa de login com senha incorreta: {}", request.getEmail());
            throw new BadCredentialsException("Credenciais inválidas");
        }

        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .build();

        String token = jwtTokenProvider.generateToken(userDetails);
        log.info("Login bem-sucedido: {}", user.getEmail());

        return LoginResponse.builder()
                .token(token)
                .user(UserDTO.from(user))
                .build();
    }
}
