// Script per migrare i quiz hardcoded dal CourseViewer al database
import { sql } from './src/lib/neonDatabase.js';

const quizData = {
  title: 'Quiz Finale - Evoluzione Normativa 2024',
  description: 'Verifica delle competenze acquisite durante il corso',
  time_limit: 30,
  passing_score: 85,
  max_attempts: 3,
  questions: [
    {
      question: 'Qual è la principale novità normativa introdotta nel 2024 per il trasporto pubblico locale?',
      options: [
        'Nuove regole per la sicurezza dei passeggeri',
        'Modifiche ai contratti di servizio',
        'Aggiornamenti sui controlli qualità',
        'Tutte le precedenti'
      ],
      correct_answer: 3,
      explanation: 'Il 2024 ha introdotto aggiornamenti significativi in tutti questi ambiti per migliorare il servizio di trasporto pubblico.',
      points: 1,
      order_num: 1
    },
    {
      question: 'Secondo le nuove normative, ogni quanto devono essere effettuati i controlli di qualità?',
      options: [
        'Ogni 6 mesi',
        'Ogni 3 mesi', 
        'Ogni anno',
        'Ogni 2 anni'
      ],
      correct_answer: 1,
      explanation: 'Le nuove disposizioni richiedono controlli trimestrali per garantire standard di qualità elevati.',
      points: 1,
      order_num: 2
    },
    {
      question: 'Quale documentazione è obbligatoria per gli operatori del trasporto pubblico locale?',
      options: [
        'Solo la licenza di guida',
        'Certificato di formazione professionale e attestato medico',
        'Solo l\'attestato medico',
        'Nessuna documentazione specifica'
      ],
      correct_answer: 1,
      explanation: 'Gli operatori devono possedere sia il certificato di formazione che l\'attestato medico valido.',
      points: 1,
      order_num: 3
    }
  ]
};

async function migrateQuizData() {
  try {
    console.log('🚀 Inizio migrazione quiz...');
    
    // 1. Trova il corso "Evoluzione Normativa 2024"
    const courseResult = await sql`
      SELECT id FROM courses 
      WHERE title ILIKE '%Evoluzione Normativa 2024%'
      LIMIT 1
    `;
    
    if (courseResult.length === 0) {
      console.error('❌ Corso "Evoluzione Normativa 2024" non trovato nel database');
      return;
    }
    
    const courseId = courseResult[0].id;
    console.log(`✅ Corso trovato: ${courseId}`);
    
    // 2. Verifica se il quiz esiste già
    const existingQuiz = await sql`
      SELECT id FROM quizzes 
      WHERE course_id = ${courseId} AND title = ${quizData.title}
    `;
    
    if (existingQuiz.length > 0) {
      console.log('⚠️ Quiz già esistente, salto la migrazione');
      return;
    }
    
    // 3. Crea il quiz
    const quizResult = await sql`
      INSERT INTO quizzes (course_id, title, description, time_limit, passing_score, max_attempts)
      VALUES (${courseId}, ${quizData.title}, ${quizData.description}, ${quizData.time_limit}, ${quizData.passing_score}, ${quizData.max_attempts})
      RETURNING id
    `;
    
    const quizId = quizResult[0].id;
    console.log(`✅ Quiz creato: ${quizId}`);
    
    // 4. Crea le domande
    for (const question of quizData.questions) {
      await sql`
        INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation, points, order_num)
        VALUES (
          ${quizId}, 
          ${question.question}, 
          ${JSON.stringify(question.options)}, 
          ${question.correct_answer}, 
          ${question.explanation}, 
          ${question.points}, 
          ${question.order_num}
        )
      `;
      console.log(`✅ Domanda ${question.order_num} creata`);
    }
    
    console.log('🎉 Migrazione completata con successo!');
    console.log(`📊 Quiz ID: ${quizId}`);
    console.log(`📝 Domande create: ${quizData.questions.length}`);
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
  }
}

// Esegui la migrazione
migrateQuizData();
