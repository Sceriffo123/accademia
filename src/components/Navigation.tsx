import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserSections } from '../lib/neonDatabase';
import { 
  Home, 
  FileText, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  Crown
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export default function Navigation() {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNormativeSubmenu, setShowNormativeSubmenu] = useState(false);
  const [visibleSections, setVisibleSections] = useState<string[]>([]);

  React.useEffect(() => {
    if (profile?.role) {
      loadVisibleSections();
    }
  }, [profile?.role]);

  async function loadVisibleSections() {
    try {
      const sections = await getUserSections(profile?.role || '');
      setVisibleSections(sections);
    } catch (error) {
      console.error('Errore caricamento sezioni visibili:', error);
      // Fallback ai default se il database non è disponibile
      setVisibleSections(['dashboard', 'normatives', 'education']);
    }
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setIsMenuOpen(false);
  };

  const normativeSubsections = [
    { 
      to: '/normative/nazionale', 
      label: 'Nazionale', 
      description: 'Leggi, DL, D.Lgs., DPCM, DM' 
    },
    { 
      to: '/normative/regionale', 
      label: 'Regionale', 
      description: 'Normative regionali' 
    },
    { 
      to: '/normative/locale', 
      label: 'Locale', 
      description: 'Regolamenti comunali' 
    }
  ];
  const navItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard', section: 'dashboard' },
    { to: '/education', icon: GraduationCap, label: 'Formazione', section: 'education' },
  ].filter(item => visibleSections.includes(item.section));

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
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-800" />
              <span className="text-xl font-bold text-gray-900">Accademia TPL</span>
            </Link>
            
            <div className="flex items-center space-x-6">
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
              
              {/* Normative Menu with Dropdown */}
              {visibleSections.includes('normatives') && (
                <div className="relative">
                  <button
                    onClick={() => setShowNormativeSubmenu(!showNormativeSubmenu)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      location.pathname.startsWith('/normative')
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-600 hover:text-blue-800 hover:bg-gray-100'
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">Normative</span>
                    {showNormativeSubmenu ? 
                      <ChevronDown className="h-4 w-4" /> : 
                      <ChevronRight className="h-4 w-4" />
                    }
                  </button>
                  
                  {showNormativeSubmenu && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <Link
                        to="/normative"
                        className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                        onClick={() => setShowNormativeSubmenu(false)}
                      >
                        <div className="font-medium">Tutte le Normative</div>
                        <div className="text-xs text-gray-500">Vista completa</div>
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      {normativeSubsections.map((subsection) => (
                        <Link
                          key={subsection.to}
                          to={subsection.to}
                          className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                          onClick={() => setShowNormativeSubmenu(false)}
                        >
                          <div className="font-medium">{subsection.label}</div>
                          <div className="text-xs text-gray-500">{subsection.description}</div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
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
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white shadow-sm border-b">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <GraduationCap className="h-7 w-7 text-blue-800" />
              <span className="text-lg font-bold text-gray-900">Accademia TPL</span>
            </Link>
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          
          {isMenuOpen && (
            <div className="border-t border-gray-100 py-4">
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
                
                {/* Normative Menu for Mobile */}
                {visibleSections.includes('normatives') && (
                  <div>
                    <button
                      onClick={() => setShowNormativeSubmenu(!showNormativeSubmenu)}
                      className={`flex items-center justify-between w-full px-3 py-3 rounded-lg transition-colors ${
                        location.pathname.startsWith('/normative')
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:text-blue-800 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5" />
                        <span className="font-medium">Normative</span>
                      </div>
                      {showNormativeSubmenu ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </button>
                    
                    {showNormativeSubmenu && (
                      <div className="ml-8 mt-2 space-y-1">
                        <Link
                          to="/normative"
                          onClick={() => setIsMenuOpen(false)}
                          className="block px-3 py-2 text-gray-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <div className="font-medium text-sm">Tutte le Normative</div>
                          <div className="text-xs text-gray-500">Vista completa</div>
                        </Link>
                        {normativeSubsections.map((subsection) => (
                          <Link
                            key={subsection.to}
                            to={subsection.to}
                            onClick={() => setIsMenuOpen(false)}
                            className="block px-3 py-2 text-gray-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <div className="font-medium text-sm">{subsection.label}</div>
                            <div className="text-xs text-gray-500">{subsection.description}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
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
          )}
        </div>
      </nav>
    </>
  );
}