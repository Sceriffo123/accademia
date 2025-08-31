import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Award,
  RotateCcw,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  points: number;
}

export interface QuizData {
  id: string;
  course_id: string;
  title: string;
  description: string;
  time_limit: number; // minuti
  passing_score: number; // percentuale
  max_attempts: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: { [questionId: string]: number };
  score: number;
  passed: boolean;
  started_at: string;
  completed_at?: string;
  time_taken: number; // secondi
}

interface QuizComponentProps {
  quiz: QuizData;
  onComplete: (attempt: Omit<QuizAttempt, 'id'>) => void;
  onCancel: () => void;
  userAttempts?: QuizAttempt[];
}

export default function QuizComponent({ quiz, onComplete, onCancel, userAttempts = [] }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(quiz.time_limit * 60); // secondi
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const canRetake = userAttempts.length < quiz.max_attempts;
  const bestAttempt = userAttempts.reduce((best, attempt) => 
    !best || attempt.score > best.score ? attempt : best, null as QuizAttempt | null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (quizStarted && !quizCompleted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizStarted, quizCompleted, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setStartTime(new Date());
    setAnswers({});
    setCurrentQuestion(0);
    setQuizCompleted(false);
    setShowResults(false);
  };

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmitQuiz = () => {
    if (!startTime) return;

    const endTime = new Date();
    const timeTaken = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    // Calcola punteggio
    let totalPoints = 0;
    let earnedPoints = 0;
    
    quiz.questions.forEach(question => {
      totalPoints += question.points;
      if (answers[question.id] === question.correct_answer) {
        earnedPoints += question.points;
      }
    });
    
    const score = Math.round((earnedPoints / totalPoints) * 100);
    const passed = score >= quiz.passing_score;
    
    setFinalScore(score);
    setQuizCompleted(true);
    setShowResults(true);
    
    // Crea attempt object
    const attempt: Omit<QuizAttempt, 'id'> = {
      user_id: '', // Sarà impostato dal componente padre
      quiz_id: quiz.id,
      answers,
      score,
      passed,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      time_taken: timeTaken
    };
    
    onComplete(attempt);
  };

  const getQuestionResult = (question: QuizQuestion) => {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correct_answer;
    return { userAnswer, isCorrect, correctAnswer: question.correct_answer };
  };

  // Schermata iniziale
  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h2>
            <p className="text-gray-600">{quiz.description}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Informazioni Quiz</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Domande:</span>
                <span className="ml-2 font-medium">{quiz.questions.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Tempo limite:</span>
                <span className="ml-2 font-medium">{quiz.time_limit} minuti</span>
              </div>
              <div>
                <span className="text-gray-500">Punteggio minimo:</span>
                <span className="ml-2 font-medium">{quiz.passing_score}%</span>
              </div>
              <div>
                <span className="text-gray-500">Tentativi disponibili:</span>
                <span className="ml-2 font-medium">{quiz.max_attempts - userAttempts.length}</span>
              </div>
            </div>
          </div>

          {bestAttempt && (
            <div className={`rounded-lg p-4 mb-6 ${bestAttempt.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h4 className="font-semibold mb-2">Miglior Tentativo</h4>
              <div className="flex items-center justify-between">
                <span>Punteggio: {bestAttempt.score}%</span>
                <span className={`flex items-center ${bestAttempt.passed ? 'text-green-600' : 'text-red-600'}`}>
                  {bestAttempt.passed ? <CheckCircle className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                  {bestAttempt.passed ? 'Superato' : 'Non Superato'}
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Torna al Corso
            </button>
            <button
              onClick={handleStartQuiz}
              disabled={!canRetake}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {userAttempts.length === 0 ? 'Inizia Quiz' : 'Riprova Quiz'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Schermata risultati
  if (showResults) {
    const passed = finalScore >= quiz.passing_score;
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {passed ? (
                <CheckCircle className="h-10 w-10 text-green-600" />
              ) : (
                <XCircle className="h-10 w-10 text-red-600" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {passed ? 'Quiz Superato!' : 'Quiz Non Superato'}
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Punteggio: <span className="font-bold">{finalScore}%</span>
            </p>
            <p className="text-gray-500">
              {passed 
                ? 'Congratulazioni! Hai superato il quiz con successo.' 
                : `Punteggio minimo richiesto: ${quiz.passing_score}%`
              }
            </p>
          </div>

          {/* Revisione Risposte */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revisione Risposte</h3>
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const result = getQuestionResult(question);
                return (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        {index + 1}. {question.question}
                      </h4>
                      <div className={`flex items-center ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {result.isCorrect ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div 
                          key={optionIndex}
                          className={`p-3 rounded-lg border ${
                            optionIndex === question.correct_answer
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : optionIndex === result.userAnswer && !result.isCorrect
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-medium mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span>{option}</span>
                            {optionIndex === question.correct_answer && (
                              <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                            )}
                            {optionIndex === result.userAnswer && !result.isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Spiegazione:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Torna al Corso
            </button>
            {!passed && canRetake && (
              <button
                onClick={() => {
                  setQuizStarted(false);
                  setQuizCompleted(false);
                  setShowResults(false);
                  setTimeLeft(quiz.time_limit * 60);
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Riprova Quiz
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz in corso
  const currentQuestionData = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const allQuestionsAnswered = quiz.questions.every(q => answers[q.id] !== undefined);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header Quiz */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{quiz.title}</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span className={timeLeft < 300 ? 'text-red-600 font-medium' : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              {timeLeft < 300 && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Tempo quasi scaduto!</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Barra Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Domanda {currentQuestion + 1} di {quiz.questions.length}
          </p>
        </div>

        {/* Domanda Corrente */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion + 1}. {currentQuestionData.question}
            </h3>
            
            <div className="space-y-3">
              {currentQuestionData.options.map((option, index) => (
                <label 
                  key={index}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestionData.id] === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionData.id}`}
                    value={index}
                    checked={answers[currentQuestionData.id] === index}
                    onChange={() => handleAnswerSelect(currentQuestionData.id, index)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentQuestionData.id] === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {answers[currentQuestionData.id] === index && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <span className="text-gray-900">{String.fromCharCode(65 + index)}. {option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigazione */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Precedente</span>
            </button>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {Object.keys(answers).length} di {quiz.questions.length} risposte
              </span>
            </div>

            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={!allQuestionsAnswered}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Completa Quiz
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Successiva</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
