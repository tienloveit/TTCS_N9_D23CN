package com.ltweb.backend.controller;

import com.ltweb.backend.dto.response.ApiResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/movie/media")
public class MovieMediaController {
    private final Path directory;

    public MovieMediaController(@Value("${app.movie-media-directory:uploads/movies}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh phải nhỏ hơn hoặc bằng 5 MB");
        }
        byte[] bytes = file.getBytes();
        String extension = extension(bytes);
        Files.createDirectories(directory);
        String filename = UUID.randomUUID() + "." + extension;
        Files.write(directory.resolve(filename), bytes);
        ApiResponse<String> response = new ApiResponse<>();
        response.setResult("/movie/media/" + filename);
        return response;
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> image(@PathVariable String filename) {
        if (!filename.matches("[a-f0-9-]{36}\\.(jpg|png|webp)")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Path path = directory.resolve(filename);
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        String type = filename.endsWith(".jpg") ? "image/jpeg" : filename.endsWith(".png") ? "image/png" : "image/webp";
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(type))
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofDays(30)))
                .body(new FileSystemResource(path));
    }

    private String extension(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255) return "jpg";
        if (bytes.length >= 8 && (bytes[0] & 255) == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71
                && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10) return "png";
        if (bytes.length >= 12 && "RIFF".equals(new String(bytes, 0, 4, StandardCharsets.US_ASCII))
                && "WEBP".equals(new String(bytes, 8, 4, StandardCharsets.US_ASCII))) return "webp";
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
    }
}
