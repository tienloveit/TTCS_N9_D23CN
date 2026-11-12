package com.ltweb.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.ltweb.backend.controller.UserController;
import com.ltweb.backend.entity.User;
import com.ltweb.backend.enums.*;
import com.ltweb.backend.mapper.UserMapper;
import com.ltweb.backend.repository.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.mapstruct.factory.Mappers;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class UserProfileSecurityTest {
    private final UserRepository users = mock(UserRepository.class);
    private final User user = User.builder().id(7L).username("customer").password("hash")
            .role(UserRole.STAFF).branchId(3L).status(UserStatus.ACTIVE)
            .email("before@example.test").phoneNumber("0901234567").gender(Gender.OTHER)
            .dob(LocalDate.of(1999, 1, 1)).membershipTier(MembershipTier.GOLD)
            .totalSpending(new BigDecimal("2000000")).build();
    private MockMvc mvc;

    @BeforeEach void setup() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("customer", null));
        when(users.findByUsername("customer")).thenReturn(Optional.of(user));
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
        var service = new UserService(users, mock(BranchRepository.class),
                Mappers.getMapper(UserMapper.class), mock(PasswordEncoder.class));
        var json = org.springframework.http.converter.json.Jackson2ObjectMapperBuilder.json()
                .featuresToDisable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS).build();
        mvc = MockMvcBuilders.standaloneSetup(new UserController(service))
                .setMessageConverters(new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(json)).build();
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void profileUpdatePersistsDobAndPreservesOmittedFieldsAndAuthority() throws Exception {
        mvc.perform(put("/my-info").contentType(MediaType.APPLICATION_JSON)
                .content("{\"fullName\":\"Updated\",\"dob\":\"2000-01-15\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.dob").value("2000-01-15"))
                .andExpect(jsonPath("$.result.role").value("STAFF"));
        assertThat(user.getFullName()).isEqualTo("Updated");
        assertThat(user.getDob()).isEqualTo(LocalDate.of(2000, 1, 15));
        assertThat(user.getEmail()).isEqualTo("before@example.test");
        assertAuthorityUnchanged();
    }

    @Test void craftedProfileRequestCannotOverwriteAdministrativeOrMembershipFields() throws Exception {
        mvc.perform(put("/my-info").contentType(MediaType.APPLICATION_JSON).content("""
                {"fullName":"Allowed", "role":"ADMIN", "branchId":99, "status":"BLOCKED",
                 "username":"admin", "password":"attacker", "id":99,
                 "membershipTier":"PLATINUM", "totalSpending":999999999}
                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result.fullName").value("Allowed"));
        assertAuthorityUnchanged();
        assertThat(user.getId()).isEqualTo(7L);
        assertThat(user.getUsername()).isEqualTo("customer");
        assertThat(user.getPassword()).isEqualTo("hash");
        assertThat(user.getMembershipTier()).isEqualTo(MembershipTier.GOLD);
        assertThat(user.getTotalSpending()).isEqualByComparingTo("2000000");
    }

    @Test void invalidProfileInputIsRejectedBeforePersistence() throws Exception {
        mvc.perform(put("/my-info").contentType(MediaType.APPLICATION_JSON)
                .content("{\"dob\":\"2999-01-01\",\"email\":\"invalid\",\"gender\":\"INVALID\"}"))
                .andExpect(status().isBadRequest());
        verify(users, never()).save(any());
    }

    private void assertAuthorityUnchanged() {
        assertThat(user.getRole()).isEqualTo(UserRole.STAFF);
        assertThat(user.getBranchId()).isEqualTo(3L);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getGender()).isEqualTo(Gender.OTHER);
        assertThat(user.getPhoneNumber()).isEqualTo("0901234567");
    }
}
