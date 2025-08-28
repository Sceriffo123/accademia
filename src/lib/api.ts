// API facade that re-exports database functions
import { 
  getUsers as getAllUsers,
  getUserById,
  getUsersCount,
  getNormatives as getAllNormatives,
  getNormativeById,
  getNormativesCount,
  updateNormative,
  deleteNormative,
  createNormative,
  createUser,
  type User,
  type Normative
} from './neonDatabase';

// Re-export all functions and types
export {
  getAllUsers as getUsers,
  getUserById,
  getUsersCount,
  getAllNormatives as getNormatives,
  getNormativeById,
  getNormativesCount,
  updateNormative,
  deleteNormative,
  createNormative,
  createUser,
  type User,
  type Normative
};