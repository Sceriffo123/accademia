import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getModuleQuiz, 
  getQuizQuestions, 
  createQuizAttempt,
  type Quiz,
  type QuizQuestion 
} from '../lib/neonDatabase';

interface QuizInterfaceProps {
  moduleId: string;
  onComplete: (passed: boolean, score: number) => void;
  onCancel: () => void;
}

export default function QuizInterface({ moduleId, onComplete, onCancel }: QuizInterfaceProps) {
  const { profile } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [moduleId]);

  useEffect(() => {
    if (quiz && quiz.time_limit && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [quiz, timeLeft]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const quizData = await getModuleQuiz(moduleId);
      if (!quizData) {
        setError('Quiz non trovato per questo modulo');
        return;
      }

      const questionsData = await getQuizQuestions(quizData.id);
      if (questionsData.length === 0) {
        setError('Nessuna domanda trovata per questo quiz');
        return;
      }

      setQuiz(quizData);
      setQuestions(questionsData);
      setTimeLeft(quizData.time_limit * 60); // Converti minuti in secondi
      
      console.log('🎯 QuizInterface: Quiz caricato:', {
        quiz: quizData.title,
        questions: questionsData.length,
        timeLimit: quizData.time_limit
      });
    } catch (error) {
      console.error('🎯 QuizInterface: Errore caricamento quiz:', error);
      setError('Errore nel caricamento del quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    
    try {
      setIsSubmitted(true);
      
      // Calcola punteggio
      let correctAnswers = 0;
      questions.forEach(question => {
        if (answers[question.id] === question.correct_answer) {
          correctAnswers++;
        }
      });
      
      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= (quiz?.passing_score || 60);
      
      // Salva tentativo nel database
      if (quiz && profile?.id) {
        await createQuizAttempt({
          user_id: profile.id,
          quiz_id: quiz.id,
          score: score,
          passed: passed,
          answers: answers,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        });
      }
      
      console.log('🎯 QuizInterface: Quiz completato:', {
        score,
        passed,
        correctAnswers,
        totalQuestions: questions.length
      });
      
      onComplete(passed, score);
    } catch (error) {
      console.error('🎯 QuizInterface: Errore salvataggio quiz:', error);
      setError('Errore nel salvataggio del quiz');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Caricamento quiz...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Errore</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Torna al Modulo
        </button>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz Non Disponibile</h3>
        <p className="text-gray-600 mb-4">Questo modulo non ha un quiz associato.</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Torna al Modulo
        </button>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
            <p className="text-gray-600 mt-1">{quiz.description}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* Progress e Timer */}
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Domanda {currentQuestion + 1} di {questions.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          
          {quiz.time_limit && (
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              timeLeft < 300 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Domanda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {currentQuestionData.question}
        </h3>
        
        <div className="space-y-3">
          {currentQuestionData.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                answers[currentQuestionData.id] === index
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={`question_${currentQuestionData.id}`}
                checked={answers[currentQuestionData.id] === index}
                onChange={() => handleAnswer(currentQuestionData.id, index)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 mr-4"
              />
              <span className={`text-sm font-medium mr-3 px-2 py-1 rounded-full ${
                answers[currentQuestionData.id] === index
                  ? 'bg-blue-200 text-blue-800'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-gray-900">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigazione */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            currentQuestion === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Precedente</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadQuiz}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Ricomincia</span>
          </button>
          
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Termina Quiz</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span>Successiva</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
