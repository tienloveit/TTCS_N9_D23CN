import Home from "../pages/Home";
import MovieDetail from "../pages/MovieDetail";

export const routes = [
    {
        path: "/",
        element: <Home />
    },
    {
        path: "/movie/:id",
        element: <MovieDetail />
    }
];