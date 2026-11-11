// Per-subject question-TYPE suggestions for question-factory's "Question
// style / coverage" field (index.html auto-fills it when a Subject is
// picked; the user can still edit or clear it).
//
// KEYS ARE PRODUCTION WORDPRESS `subject` TERM NAMES, lower-cased — the same
// names topic-bank-sources.js's quizSubjectMap resolves to and the live
// taxonomy (window.questionSubjectTerms) carries. Never add a subject here
// that does not exist on examnotespdf.in; question-factory stays in sync
// with production taxonomy, not the other way round. A subject with no
// entry simply gets no auto-fill (GENERIC is only used when a prod subject
// has no researched list yet).
//
// Pedagogy / Mathematics / EVS lists are evidence-backed: derived by
// regex-classifying real previous-year question_en text in
// pyq-factory/.../PDF Generator/Input/*MASTER DATASET*.csv (239-339 rows per
// subject) and cross-checked against the trend-analysis docs' explicit
// format-shift callouts. CTET ENGLISH / Hindi are CSV-data-only. The rest
// are judgment calls, kept short on purpose.
(function(global){
  const BY_SUBJECT = {
    'pedagogy': [
      'Direct concept',
      'Assertion-Reason',
      'Fill in the blank',
      'Multi-statement (true/false)',
      'Classroom scenario',
      'Theorist matching',
    ],
    'mathematics': [
      'Direct calculation',
      'Multi-statement (i)-(iv)',
      'Error analysis',
      'Child method/strategy',
      'Number formation',
      'Word problem',
    ],
    'mathematics pedagogy': [
      'Classroom scenario',
      'Assertion-Reason',
      'Misconception diagnosis',
      'NCF/NCERT position',
      'Assessment tools',
    ],
    'evs': [
      'Direct fact/concept',
      'Assertion-Reason',
      'Multi-statement (true/false)',
      'Classroom scenario',
      'Fill in the blank',
      'Match the following',
    ],
    'evs-pedagogy': [
      'Classroom scenario',
      'Assertion-Reason',
      'Assessment tools',
      'NCF 2005/2023 position',
    ],
    'ctet english': [
      'Grammar/usage',
      'Language-teaching scenario',
      'Fill in the blank',
      'Multi-statement (true/false)',
      'Passage comprehension',
      'Vocabulary',
    ],
    'english': [
      'Grammar/usage',
      'Fill in the blank / cloze',
      'Passage comprehension',
      'Vocabulary',
      'Error spotting',
    ],
    'hindi': [
      'प्रत्यक्ष व्याकरण (संधि, समास, कारक)',
      'रिक्त स्थान भरो',
      'मुहावरे/लोकोक्तियाँ अर्थ-आधारित',
      'पर्यायवाची/विलोम शब्द',
      'अपठित गद्यांश बोध',
      'भाषा शिक्षाशास्त्र संकल्पनात्मक',
    ],
    'history': [
      'Direct fact',
      'Chronology',
      'Cause-effect',
      'Match the following',
    ],
    'general awareness': [
      'Direct fact',
      'Current affairs',
      'Match the following',
      'Multi-statement (true/false)',
    ],
    'general awareness for delhi': [
      'Direct fact (Delhi)',
      'Multi-statement (true/false)',
      'Match the following',
    ],
    'computer science': [
      'Direct concept',
      'Code/output tracing',
      'Number systems/logic',
      'Multi-statement (true/false)',
    ],
    'dsssb -special education': [
      'Case (child profile/IEP)',
      'Legal provision/category',
      'Tool/strategy matching',
      'Assertion-Reason',
    ],
    'employability skills': [
      'Direct concept',
      'Workplace scenario',
      'Fill in the blank',
    ],
  };
  const GENERIC = [
    'Direct concept',
    'Assertion-Reason',
    'Scenario-based',
    'Multi-statement (true/false)',
  ];
  function normalize(s){ return String(s || '').trim().toLowerCase(); }
  function typesForSubject(subjectLabel){
    return BY_SUBJECT[normalize(subjectLabel)] || GENERIC;
  }
  // One line ready to drop into the "Question style / coverage" field.
  function coverageTextForSubject(subjectLabel){
    return typesForSubject(subjectLabel).join(', ');
  }
  global.QuestionTypes = { BY_SUBJECT, GENERIC, typesForSubject, coverageTextForSubject };
})(typeof window !== 'undefined' ? window : this);
