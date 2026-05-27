
const Footer = () => {
  return (
    <footer className="bg-white border-t border-brand-border py-3 px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-brand-textMuted mt-auto">
      <div>
        &copy; 2026 BallotDA Enterprise. All rights reserved.
      </div>
      <div className="mt-2 sm:mt-0 space-x-3">
        <a href="#" className="hover:text-brand-textPrimary transition-colors">Privacy Policy</a>
        <span>|</span>
        <a href="#" className="hover:text-brand-textPrimary transition-colors">Terms of Service</a>
      </div>
    </footer>
  );
};

export default Footer;
