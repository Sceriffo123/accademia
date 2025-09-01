import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSections, getUserPermissions } from '../lib/neonDatabase';
import { 
  Home, 
  FileText, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Crown,
  FileIcon
} from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    if (profile?.role) {
      loadVisibleSections();
      loadUserPermissions();
    }
  }, [profile?.role]);

  async function loadVisibleSections() {
    try {
      console.log('🎓 NAVIGATION: Caricamento sezioni per ruolo:', profile?.role);
      const sections = await getUserSections(profile?.role || '');
      console.log('🎓 NAVIGATION: Sezioni caricate dal database:', sections);
      console.log('🎓 NAVIGATION: Numero sezioni:', sections.length);
      setVisibleSections(sections);
      console.log('🎓 NAVIGATION: Sezioni salvate nello stato');
    } catch (error) {
      console.error('Errore caricamento sezioni visibili:', error);
      // Fallback ai default se il database non è disponibile
      setVisibleSections(['dashboard', 'normatives', 'education']);
    }
  }

  async function loadUserPermissions() {
    try {
      const permissions = await getUserPermissions(profile?.role || '');
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Errore caricamento permessi utente:', error);
      setUserPermissions(['normatives.view', 'education.view']);
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard', section: 'dashboard' },
    { to: '/normative', icon: FileText, label: 'Normative', section: 'normatives' },
    { to: '/education', icon: GraduationCap, label: 'Formazione', section: 'education' },
  ].filter(item => visibleSections.includes(item.section));

  // Aggiungi Documenti solo se la sezione è visibile
  if (visibleSections.includes('docx')) {
    navItems.push({ to: '/docx', icon: FileIcon, label: 'Documenti', section: 'docx' });
  }

  // Aggiungi sezioni amministrative se visibili
  if (visibleSections.includes('admin') && (profile?.role === 'admin' || profile?.role === 'superadmin')) {
    navItems.push({ to: '/admin', icon: Settings, label: 'Admin', section: 'admin' });
  }
  
  if (visibleSections.includes('superadmin') && profile?.role === 'superadmin') {
    navItems.push({ to: '/superadmin', icon: Crown, label: 'SuperAdmin', section: 'superadmin' });
  }

  if (!user) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-800" />
              <span className="text-xl font-bold text-gray-900">Accademia TPL</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-blue-800 transition-colors"
              >
                Accedi
              </Link>
              <Link
                to="/register"
                className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
              >
                Registrati
              </Link>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <GraduationCap className="h-8 w-8 text-blue-800" />
            <span className="text-xl font-bold text-gray-900">Accademia TPL</span>
          </Link>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-blue-800 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-600">{profile?.full_name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Esci</span>
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:text-blue-800 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-600">{profile?.full_name}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 px-3 py-3 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Esci</span>
                </button>
              </div>
            </div>
          </div>
  );
}