package com.ltweb.backend.mapper;

import com.ltweb.backend.dto.response.DirectorResponse;
import com.ltweb.backend.entity.Director;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-04-28T17:37:20+0700",
    comments = "version: 1.5.5.Final, compiler: Eclipse JDT (IDE) 3.46.0.v20260407-0427, environment: Java 21.0.10 (Eclipse Adoptium)"
)
@Component
public class DirectorMapperImpl implements DirectorMapper {

    @Override
    public DirectorResponse toDirectorResponse(Director director) {
        if ( director == null ) {
            return null;
        }

        DirectorResponse.DirectorResponseBuilder directorResponse = DirectorResponse.builder();

        directorResponse.bio( director.getBio() );
        directorResponse.id( director.getId() );
        directorResponse.name( director.getName() );

        return directorResponse.build();
    }
}
