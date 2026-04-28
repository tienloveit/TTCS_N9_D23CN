import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar/Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
