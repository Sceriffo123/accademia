import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  RotateCcw,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { 
  getModuleQuiz, 
  getQuizQuestionsWithParsedOptions,
  createQuizAttempt,
  getQuizAttemptCount,
  getBestQuizAttempt,
  type Quiz,
  type QuizQuestion 
} from '../lib/neonDatabase';

interface QuizInterfaceProps {
  moduleId: string;
  userId: string;
  onComplete: (passed: boolean, score: number) => void;
  onCancel: () => void;
}

export default function QuizInterface({ moduleId, userId, onComplete, onCancel }: QuizInterfaceProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [moduleId]);

  useEffect(() => {
    if (quiz && quiz.time_limit && timeLeft > 0 && !isSubmitted) {
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
  }, [quiz, timeLeft, isSubmitted]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsSubmitted(false);
      setAnswers({});
      setCurrentQuestion(0);
      
      const quizData = await getModuleQuiz(moduleId);
      if (!quizData) {
        setError('Quiz non trovato per questo modulo');
        return;
      }

      // Usa la nuova funzione con parsing automatico delle options
      const questionsData = await getQuizQuestionsWithParsedOptions(quizData.id);
      if (questionsData.length === 0) {
        setError('Nessuna domanda trovata per questo quiz');
        return;
      }

      // Verifica tentativi esistenti
      const currentAttempts = await getQuizAttemptCount(userId, quizData.id);
      const bestAttempt = await getBestQuizAttempt(userId, quizData.id);
      
      setAttemptCount(currentAttempts);
      setBestScore(bestAttempt?.score || null);

      // Controlla se ha raggiunto il limite di tentativi
      if (currentAttempts >= quizData.max_attempts) {
        setError(`Hai raggiunto il limite massimo di ${quizData.max_attempts} tentativi per questo quiz.`);
        return;
      }

      setQuiz(quizData);
      setQuestions(questionsData);
      setTimeLeft(quizData.time_limit * 60); // Converti minuti in secondi
      setStartTime(new Date());
      
      console.log('🎯 QuizInterface: Quiz caricato:', {
        quiz: quizData.title,
        questions: questionsData.length,
        timeLimit: quizData.time_limit,
        attempts: `${currentAttempts}/${quizData.max_attempts}`,
        bestScore: bestAttempt?.score
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
    if (isSubmitted || !quiz || !startTime) return;
    
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
      const passed = score >= quiz.passing_score;
      const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      // Salva tentativo nel database con la struttura corretta
      const attemptResult = await createQuizAttempt({
        user_id: userId,
        quiz_id: quiz.id,
        attempt_number: attemptCount + 1,
        answers: answers,
        score: score,
        time_spent: timeSpent,
        completed_at: new Date().toISOString()
      });

      if (!attemptResult) {
        throw new Error('Errore nel salvataggio del tentativo');
      }
      
      console.log('🎯 QuizInterface: Quiz completato:', {
        score,
        passed,
        correctAnswers,
        totalQuestions: questions.length,
        timeSpent: `${Math.floor(timeSpent / 60)}:${(timeSpent % 60).toString().padStart(2, '0')}`,
        attemptNumber: attemptCount + 1
      });
      
      onComplete(passed, score);
    } catch (error) {
      console.error('🎯 QuizInterface: Errore salvataggio quiz:', error);
      setError('Errore nel salvataggio del quiz');
      setIsSubmitted(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
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
        <div className="space-y-2">
          {bestScore !== null && (
            <p className="text-sm text-gray-500">
              Miglior punteggio: <span className="font-semibold">{bestScore}%</span>
            </p>
          )}
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Torna al Modulo
          </button>
        </div>
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
  const answeredCount = getAnsweredCount();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{quiz.title}</h2>
            <p className="text-gray-600 mt-1">{quiz.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Tentativo {attemptCount + 1} di {quiz.max_attempts}</span>
              <span>Punteggio minimo: {quiz.passing_score}%</span>
              {bestScore !== null && (
                <span className="text-green-600 font-medium">
                  Miglior punteggio: {bestScore}%
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Chiudi quiz"
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
                Risposte: {answeredCount}/{questions.length} ({Math.round(progress)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: progress + '%' }}
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
          {Array.isArray(currentQuestionData.options) && currentQuestionData.options.map((option: string, index: number) => (
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
            disabled={isSubmitted}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Ricomincia</span>
          </button>
          
          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitted || answeredCount < questions.length}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors ${
                isSubmitted || answeredCount < questions.length
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>{isSubmitted ? 'Invio...' : 'Termina Quiz'}</span>
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
