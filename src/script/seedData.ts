import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import Competency from '../models/Competency';
import Question from '../models/Question';
import dotenv from 'dotenv';

dotenv.config();

const competencyData = [
  'Grammar and Syntax', 'Vocabulary Building', 'Reading Comprehension', 
  'Listening Skills', 'Speaking Fluency', 'Writing Skills', 
  'Pronunciation', 'Business Communication', 'Academic Writing', 
  'Conversation Skills', 'Technical Vocabulary', 'Cultural Understanding',
  'Presentation Skills', 'Email Communication', 'Formal Writing',
  'Informal Communication', 'Literature Analysis', 'Critical Thinking',
  'Translation Skills', 'Language History', 'Phonetics', 'Linguistics'
];

const levelQuestions = {
  A1: [
    "What is your name?",
    "Where are you from?",
    "How old are you?",
    "What is this?",
    "Can you help me?",
    "Where is the bathroom?",
    "How much does it cost?",
    "What time is it?",
    "Do you speak English?",
    "I am hungry.",
    "Thank you very much.",
    "Nice to meet you.",
    "How are you?",
    "What's your job?",
    "Where do you live?",
    "What's your favorite food?",
    "Can I have water?",
    "Where is the station?",
    "What's the weather like?",
    "Do you like music?",
    "What's your phone number?",
    "See you later."
  ],
  A2: [
    "I went to the store yesterday.",
    "If it rains, I will stay home.",
    "I have been living here for two years.",
    "Can you tell me the way to the hospital?",
    "I would like to make a reservation.",
    "What's the difference between these two?",
    "I'm looking for a job.",
    "Could you repeat that, please?",
    "I'm interested in learning Spanish.",
    "What do you do in your free time?",
    "I need to see a doctor.",
    "How long have you been studying English?",
    "What's your opinion about this?",
    "I'm planning to travel next month.",
    "Could you help me with this problem?",
    "What's the best restaurant around here?",
    "I'm sorry, I don't understand.",
    "Can you recommend a good hotel?",
    "What's included in the price?",
    "I'd like to change my appointment.",
    "How do I get to the airport?",
    "What's your favorite season?"
  ]
};

const generateOptions = (correctAnswer: string, level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') => {
  const options = [
    { label: 'A' as const, text: correctAnswer },
    { label: 'B' as const, text: faker.lorem.sentence() },
    { label: 'C' as const, text: faker.lorem.sentence() },
    { label: 'D' as const, text: faker.lorem.sentence() }
  ];
  
  // Shuffle options
  return options.sort(() => Math.random() - 0.5).map((option, index) => ({
    label: ['A', 'B', 'C', 'D'][index] as 'A' | 'B' | 'C' | 'D',
    text: option.text
  }));
};

const getCorrectAnswerLabel = (options: any[], correctText: string): 'A' | 'B' | 'C' | 'D' => {
  const index = options.findIndex(opt => opt.text === correctText);
  return ['A', 'B', 'C', 'D'][index] as 'A' | 'B' | 'C' | 'D';
};

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_system');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Competency.deleteMany({});
    await Question.deleteMany({});
    console.log('Cleared existing data');

    // Seed Competencies
    const competencies = await Competency.insertMany(
      competencyData.map((name, index) => ({
        competency_id: index + 1,
        competency_name: name,
        description: `Assessment of ${name.toLowerCase()} skills and knowledge`
      }))
    );
    console.log(`Seeded ${competencies.length} competencies`);

    // Seed Questions
    const questions = [];
    let questionId = 1;
    
    const levels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    
    for (const level of levels) {
      for (let competencyId = 1; competencyId <= 22; competencyId++) {
        let questionText: string;
        let correctAnswer: string;
        
        if (level === 'A1') {
          questionText = levelQuestions.A1[competencyId - 1] || faker.lorem.sentence();
          correctAnswer = "Correct basic response";
        } else if (level === 'A2') {
          questionText = levelQuestions.A2[competencyId - 1] || faker.lorem.sentence();
          correctAnswer = "Appropriate elementary response";
        } else if (level === 'B1') {
          questionText = `Intermediate level: ${faker.lorem.sentence()}`;
          correctAnswer = "Suitable intermediate response";
        } else if (level === 'B2') {
          questionText = `Upper-intermediate: ${faker.lorem.sentence()}`;
          correctAnswer = "Advanced intermediate response";
        } else if (level === 'C1') {
          questionText = `Advanced level: ${faker.lorem.sentence()}`;
          correctAnswer = "Sophisticated advanced response";
        } else {
          questionText = `Proficiency level: ${faker.lorem.sentence()}`;
          correctAnswer = "Expert proficiency response";
        }
        
        const options = generateOptions(correctAnswer, level);
        const correctLabel = getCorrectAnswerLabel(options, correctAnswer);
        
        questions.push({
          question_id: questionId++,
          competency_id: competencyId,
          level: level,
          question_text: questionText,
          options: options,
          correct_answer: correctLabel,
          difficulty_points: level.startsWith('A') ? 1 : level.startsWith('B') ? 2 : 3
        });
      }
    }
    
    await Question.insertMany(questions);
    console.log(`Seeded ${questions.length} questions`);
    console.log('Database seeding completed successfully!');
    
    // Display summary
    const summary = await Question.aggregate([
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('Questions by level:', summary);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the seeder
seedDatabase();