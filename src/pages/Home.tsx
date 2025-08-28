import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  FileText, 
  Users, 
  Shield, 
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: FileText,
      title: 'Consultazione Normative',
      description: 'Accesso completo a leggi, regolamenti e sentenze del settore'
    },
    {
      icon: GraduationCap,
      title: 'Formazione Continua',
      description: 'Percorsi didattici strutturati per operatori del trasporto'
    },
    {
      icon: Shield,
      title: 'Aggiornamenti Normativi',
      description: 'Notifiche automatiche sui cambiamenti legislativi'
    },
    {
      icon: Users,
      title: 'Community Professionale',
      description: 'Condivisione esperienze e best practices'
    }
  ];

  const benefits = [
    'Accesso 24/7 da qualsiasi dispositivo',
    'Database normativo sempre aggiornato',
    'Ricerca avanzata e filtri intelligenti',
    'Percorsi formativi personalizzati',
    'Certificazioni riconosciute'
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Accademia del Trasporto
              <br />
              <span className="text-blue-200">Pubblico Locale</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              Piattaforma professionale per la formazione e consultazione normativa
              nel settore del trasporto pubblico locale
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-800 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
                >
                  Vai alla Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-800 font-semibold rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Inizia Subito
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-blue-800 transition-all"
                  >
                    Accedi
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Tutto ciò che serve per la tua professione
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Una piattaforma completa che riunisce normative, formazione e strumenti 
                professionali in un'unica soluzione integrata
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100"
                  >
                    <div className="flex items-center mb-4">
                      <div className="p-3 bg-blue-100 rounded-xl mr-4">
                        <Icon className="h-6 w-6 text-blue-800" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Perché scegliere Accademia?
                </h2>
                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <span className="text-lg text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Inizia oggi stesso
                </h3>
                <p className="text-gray-600 mb-6">
                  Unisciti a centinaia di professionisti che già utilizzano 
                  Accademia per rimanere aggiornati e competenti nel settore.
                </p>
                {!user && (
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-800 text-white font-semibold rounded-xl hover:bg-blue-900 transition-colors"
                  >
                    Registrati Gratuitamente
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <GraduationCap className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold">Accademia</span>
              </div>
              
              <p className="text-gray-400 text-center md:text-right">
                © 2024 Accademia del Trasporto Pubblico Locale. Tutti i diritti riservati.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}