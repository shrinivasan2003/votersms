import { Link } from 'react-router-dom';
import bdaLogo from '../../assets/bda-logo.webp';

const PublicFooter = () => (
  <footer className="bg-[#000d1a] py-5 px-6 lg:px-14 flex flex-col sm:flex-row items-center justify-between gap-3">
    <img src={bdaLogo} alt="BallotDA" className="h-7 w-auto object-contain opacity-50" />
    <p className="text-gray-600 text-xs font-medium">© 2026 BallotDA Enterprise · All rights reserved</p>
    <Link to="/admin" className="text-xs text-gray-700 hover:text-gray-400 transition-colors font-medium">
      Admin Portal
    </Link>
  </footer>
);

export default PublicFooter;
