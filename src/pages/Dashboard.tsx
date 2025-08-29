import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getNormativesCount, getRecentNormativesCount, getNormatives } from '../lib/api';
import { FileText, GraduationCap, TrendingUp, Clock, BookOpen, BadgeAlert as Alert, ChevronRight } from 'lucide-react';

interface DashboardStats {
  totalNormatives: number;
  recentNormatives: number;
  completedCourses: number;
  totalCourses: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalNormatives: 0,
    recentNormatives: 0,
    completedCourses: 0,
    totalCourses: 0
  });
  const [recentNormatives, setRecentNormatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch normatives data
      const totalNormatives = await getNormativesCount();
      const recentNormatives = await getRecentNormativesCount(30);
      const latestNormatives = await getNormatives();

      setStats({
        totalNormatives,
        recentNormatives,
        completedCourses: 0, // Mock data
        totalCourses: 8     // Mock data
      });

      setRecentNormatives(latestNormatives.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      title: 'Normative Totali',
      value: stats.totalNormatives,
      icon: FileText,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Aggiornamenti Recenti',
      value: stats.recentNormatives,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: '+3 questo mese'
    },
    {
      title: 'Corsi Completati',
      value: `${stats.completedCourses}/${stats.totalCourses}`,
      icon: GraduationCap,
      color: 'bg-purple-500',
      change: '2 in corso'
    },
    {
      title: 'Ultimo Accesso',
      value: 'Oggi',
      icon: Clock,
      color: 'bg-orange-500',
      change: '14:30'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Benvenuto, {profile?.full_name}
          </h1>
          <p className="text-gray-600">
            Panoramica delle tue attività e aggiornamenti recenti
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm text-green-600 font-medium">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Azioni Rapide
            </h2>
            <div className="space-y-3">
              <Link
                to="/normative"
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">Consulta Banca Dati</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </Link>
              
              <Link
                to="/education"
                className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-gray-900">Inizia Formazione</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Aggiornamenti Recenti
            </h2>
            {recentNormatives.length > 0 ? (
              <div className="space-y-4">
                {recentNormatives.map((normative) => (
                  <Link
                    key={normative.id}
                    to={`/normative/${normative.id}`}
                    className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {normative.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        normative.type === 'law' ? 'bg-blue-100 text-blue-800' :
                        normative.type === 'regulation' ? 'bg-green-100 text-green-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {normative.type === 'law' ? 'Legge' :
                         normative.type === 'regulation' ? 'Regolamento' : 'Sentenza'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(normative.publication_date).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Alert className="h-8 w-8 mx-auto mb-3" />
                <p>Nessun aggiornamento recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Il tuo Progresso
          </h2>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Normative Studiate
                </span>
                <span className="text-sm text-gray-500">
                  15/50
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full w-[30%] transition-all duration-300"></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Formazione Completata
                </span>
                <span className="text-sm text-gray-500">
                  0/8
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full w-[0%] transition-all duration-300"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}