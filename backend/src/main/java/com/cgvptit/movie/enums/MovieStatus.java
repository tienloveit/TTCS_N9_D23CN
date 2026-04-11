package com.cgvptit.movie.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MovieStatus {
    COMING_SOON("Coming Soon"),
    NOW_SHOWING("Now Showing"),
    ENDED("Ended");

    private final String label;

    MovieStatus(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    @JsonCreator
    public static MovieStatus fromValue(String value) {
        if (value == null) {
            return null;
        }

        for (MovieStatus status : values()) {
            if (status.name().equalsIgnoreCase(value) || status.label.equalsIgnoreCase(value)) {
                return status;
            }
        }

        throw new IllegalArgumentException("Invalid movie status: " + value);
    }
}
