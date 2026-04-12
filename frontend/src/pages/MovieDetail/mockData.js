// Reusing existing images for placeholder
import posterImage from '../../images/showing3.png';

export const movieInfo = {
    id: 1,
    title: "Sirat: Chuyến Đi Bão Cát",
    ageRating: "T18",
    duration: 114,
    releaseDate: "10/04/2026",
    rating: 8.6,
    voteCount: 13,
    country: "Tây Ban Nha, Pháp",
    producer: "Đang cập nhật",
    genres: ["Phiêu Lưu", "Tâm Lý"],
    director: "Oliver Laxe",
    cast: ["Stefania Gadda", "Bruno Núñez Arjona", "Sergi López"],
    poster: posterImage,
    synopsis: [
        "Luis cùng cậu con trai Esteban đang thực hiện chuyến hành trình băng qua miền Nam Morocco. Họ mải miết đi tìm con gái của Luis, người đã mất tích năm tháng sau lần cuối cùng được nhìn thấy tại một lễ hội trên sa mạc. Khi hai cha con rong ruổi từ bữa tiệc này sang bữa tiệc khác, họ nghe phong thanh về một buổi đại nhạc hội rave mang màu sắc huyền thoại gần biên giới Mauritania. Dấn thân vào vùng đất khô cằn trong bối cảnh một cuộc xung đột toàn cầu đang cận kề, Luis và Esteban sớm bị cuốn vào một khung cảnh thiên nhiên nguyên thủy, nơi họ buộc phải bước đi trên sợi dây mong manh giữa thiên đàng và địa ngục.",
        "\"Sirat\" là con đường tâm linh thúc đẩy ta \"chết trước khi thực sự lìa đời\" - giống như những gì xảy đến với nhân vật chính trong bộ phim này. Đó cũng là tên của cây cầu được tương truyền là kết nối giữa địa ngục và thiên đường."
    ],
    note: "Phim mới Sirat: Chuyến Đi Bão Cát là tác phẩm đã nhận đề cử Cành Cọ Vàng và đề cử Oscar Phim Quốc Tế Xuất Sắc Nhất, dự kiến khởi chiếu 10.04.2026 tại các rạp chiếu phim toàn quốc."
};

export const regionsData = {
    "Toàn quốc": [], // Sẽ lấy tất cả rạp
    "Hà Nội": [
        "Cinema Long Biên",
        "Cinema Hai Bà Trưng",
        "Cinema Thanh Xuân",
        "Cinema Hồ Gươm Plaza-Hà Đông"
    ],
    "Hồ Chí Minh": [
        "Cinema Tân Bình",
        "Cinema Quận 1",
        "Cinema Kinh Dương Vương",
        "Cinema Quận 5",
        "Cinema Thủ Đức"
    ]
};

export const showtimesData = [
    { cinema: "Cinema Long Biên", region: "Hà Nội", formats: [{ type: "2D Phụ Đề", times: ["10:00", "13:30", "15:45"] }] },
    { cinema: "Cinema Hai Bà Trưng", region: "Hà Nội", formats: [{ type: "2D Phụ Đề", times: ["11:15", "14:20", "18:00"] }, { type: "3D Phụ Đề", times: ["19:30", "22:00"] }] },
    { cinema: "Cinema Thanh Xuân", region: "Hà Nội", formats: [{ type: "2D Phụ Đề", times: ["09:00", "12:30", "16:15", "20:45"] }] },
    { cinema: "Cinema Hồ Gươm Plaza-Hà Đông", region: "Hà Nội", formats: [{ type: "2D Phụ Đề", times: ["13:45", "16:00", "19:30"] }] },
    { cinema: "Cinema Tân Bình", region: "Hồ Chí Minh", formats: [{ type: "2D Lồng Tiếng", times: ["08:30", "10:45"] }, { type: "2D Phụ Đề", times: ["13:15", "17:30", "21:00"] }] },
    { cinema: "Cinema Quận 1", region: "Hồ Chí Minh", formats: [{ type: "IMAX 3D", times: ["12:00", "15:30", "19:00", "22:15"] }] },
    { cinema: "Cinema Kinh Dương Vương", region: "Hồ Chí Minh", formats: [{ type: "2D Phụ Đề", times: ["14:15", "18:20", "20:45", "22:10"] }] },
    { cinema: "Cinema Quận 5", region: "Hồ Chí Minh", formats: [{ type: "2D Phụ Đề", times: ["09:30", "11:45", "14:00", "16:30"] }] },
    { cinema: "Cinema Thủ Đức", region: "Hồ Chí Minh", formats: [{ type: "2D Phụ Đề", times: ["10:15", "13:45", "17:00", "20:30"] }] }
];
