import { sql } from './neonDatabase';

// Dati quiz hardcoded da migrare
const hardcodedQuizData = {
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

export async function migrateHardcodedQuizzes(): Promise<{ success: boolean; message: string; quizId?: string }> {
  try {
    console.log('🚀 Inizio migrazione quiz hardcoded...');
    
    // 1. Trova il corso "Evoluzione Normativa 2024"
    const courseResult = await sql`
      SELECT id FROM courses 
      WHERE title ILIKE '%Evoluzione Normativa 2024%'
      LIMIT 1
    `;
    
    if (courseResult.length === 0) {
      return {
        success: false,
        message: 'Corso "Evoluzione Normativa 2024" non trovato nel database'
      };
    }
    
    const courseId = courseResult[0].id;
    console.log(`✅ Corso trovato: ${courseId}`);
    
    // 2. Trova o crea un modulo per il quiz
    const moduleResult = await sql`
      SELECT id FROM course_modules 
      WHERE course_id = ${courseId} AND title ILIKE '%quiz%'
      LIMIT 1
    `;
    
    let moduleId;
    if (moduleResult.length === 0) {
      // Crea un modulo per il quiz con tutti i campi obbligatori
      const newModuleResult = await sql`
        INSERT INTO course_modules (course_id, title, description, type, level, order_num)
        VALUES (${courseId}, 'Quiz Finale', 'Modulo di valutazione finale', 'quiz', 'intermediate', 999)
        RETURNING id
      `;
      moduleId = newModuleResult[0].id;
      console.log(`✅ Modulo quiz creato: ${moduleId}`);
    } else {
      moduleId = moduleResult[0].id;
      console.log(`✅ Modulo quiz trovato: ${moduleId}`);
    }
    
    // 3. Verifica se il quiz esiste già
    const existingQuiz = await sql`
      SELECT id FROM quizzes 
      WHERE module_id = ${moduleId} AND title = ${hardcodedQuizData.title}
    `;
    
    if (existingQuiz.length > 0) {
      return {
        success: false,
        message: 'Quiz già esistente nel database',
        quizId: existingQuiz[0].id
      };
    }
    
    // 4. Crea il quiz
    const quizResult = await sql`
      INSERT INTO quizzes (module_id, title, description, time_limit, passing_score, max_attempts)
      VALUES (${moduleId}, ${hardcodedQuizData.title}, ${hardcodedQuizData.description}, 
              ${hardcodedQuizData.time_limit}, ${hardcodedQuizData.passing_score}, ${hardcodedQuizData.max_attempts})
      RETURNING id
    `;
    
    const quizId = quizResult[0].id;
    console.log(`✅ Quiz creato: ${quizId}`);
    
    // 4. Crea le domande
    for (const question of hardcodedQuizData.questions) {
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
    
    return {
      success: true,
      message: `Quiz migrato con successo! Quiz ID: ${quizId}, Domande: ${hardcodedQuizData.questions.length}`,
      quizId: quizId
    };
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    return {
      success: false,
      message: `Errore migrazione: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
    };
  }
}

export async function checkMigrationStatus(): Promise<{ hasHardcodedQuiz: boolean; hasDatabaseQuiz: boolean; courseId?: string }> {
  try {
    // Verifica se esiste il corso
    const courseResult = await sql`
      SELECT id FROM courses 
      WHERE title ILIKE '%Evoluzione Normativa 2024%'
      LIMIT 1
    `;
    
    if (courseResult.length === 0) {
      return { hasHardcodedQuiz: true, hasDatabaseQuiz: false };
    }
    
    const courseId = courseResult[0].id;
    
    // Verifica se esiste già il quiz nel database
    const quizResult = await sql`
      SELECT id FROM quizzes 
      WHERE course_id = ${courseId} AND title = ${hardcodedQuizData.title}
    `;
    
    return {
      hasHardcodedQuiz: true,
      hasDatabaseQuiz: quizResult.length > 0,
      courseId: courseId
    };
    
  } catch (error) {
    console.error('Errore verifica migrazione:', error);
    return { hasHardcodedQuiz: true, hasDatabaseQuiz: false };
  }
}
