package com.cgvptit.movie.Entity;

import jakarta.persistence.*;

@Entity
@Table(name = "booking")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "price", length = 45)
    private String price;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booked_by_user")
    private User bookedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_for_user")
    private User bookForUser;

    public Booking() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getPrice() { return price; }
    public void setPrice(String price) { this.price = price; }

    public User getBookedByUser() { return bookedByUser; }
    public void setBookedByUser(User bookedByUser) { this.bookedByUser = bookedByUser; }

    public User getBookForUser() { return bookForUser; }
    public void setBookForUser(User bookForUser) { this.bookForUser = bookForUser; }
}
